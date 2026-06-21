import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DEFAULT_CODEX_HOME = join(process.env.USERPROFILE ?? process.env.HOME ?? '', '.codex');
const SHANGHAI_TIMEZONE = 'Asia/Shanghai';

export type CodexUsageResult<T> =
  | { ok: true; data: T; warnings: string[] }
  | { ok: false; error: CodexUsageError; warnings: string[] };

export type CodexUsageError = {
  code: 'codex_home_missing' | 'database_missing' | 'schema_missing' | 'query_failed';
  message: string;
  detail?: string;
};

export type CodexUsageThread = {
  id: string;
  title: string;
  cwd: string;
  createdAt: number;
  createdAtIso: string;
  updatedAt: number;
  updatedAtIso: string;
  tokensUsed: number;
  archived: boolean;
  rolloutPath: string;
};

export type CodexUsageSummary = {
  totalTokens: number;
  threadCount: number;
  activeThreadCount: number;
  archivedThreadCount: number;
  todayUpdatedThreadCount: number;
  latestUpdatedAt?: number;
  latestUpdatedAtIso?: string;
};

export type CodexUsageRecentEvent = {
  id: number;
  ts: number;
  tsIso: string;
  threadId?: string;
  model?: string;
  inputTokens: number;
  cachedTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
};

type ThreadRow = {
  id: string;
  title: string;
  cwd: string;
  created_at: number;
  updated_at: number;
  tokens_used: number;
  archived: number;
  rollout_path: string;
};

type LogRow = {
  id: number;
  ts: number;
  thread_id: string | null;
  feedback_log_body: string | null;
};

export function getCodexUsageSummary(codexHome = process.env.CODEX_HOME ?? DEFAULT_CODEX_HOME): CodexUsageResult<CodexUsageSummary> {
  const threads = getCodexUsageThreads(codexHome);
  if (!threads.ok) {
    return threads;
  }

  const todayKey = dateKey(Date.now());
  const totalTokens = threads.data.reduce((sum, thread) => sum + thread.tokensUsed, 0);
  const activeThreadCount = threads.data.filter((thread) => !thread.archived).length;
  const latest = threads.data[0];

  return {
    ok: true,
    warnings: threads.warnings,
    data: {
      totalTokens,
      threadCount: threads.data.length,
      activeThreadCount,
      archivedThreadCount: threads.data.length - activeThreadCount,
      todayUpdatedThreadCount: threads.data.filter((thread) => dateKey(thread.updatedAt * 1000) === todayKey).length,
      latestUpdatedAt: latest?.updatedAt,
      latestUpdatedAtIso: latest?.updatedAtIso
    }
  };
}

export function getCodexUsageThreads(codexHome = process.env.CODEX_HOME ?? DEFAULT_CODEX_HOME): CodexUsageResult<CodexUsageThread[]> {
  return withDatabase(codexHome, 'state_5.sqlite', ['threads'], (database) => {
    const rows = database
      .prepare(
        `select id, title, cwd, created_at, updated_at, tokens_used, archived, rollout_path
         from threads
         order by updated_at desc`
      )
      .all() as ThreadRow[];

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      cwd: stripWindowsNamespace(row.cwd),
      createdAt: row.created_at,
      createdAtIso: toIso(row.created_at),
      updatedAt: row.updated_at,
      updatedAtIso: toIso(row.updated_at),
      tokensUsed: row.tokens_used,
      archived: row.archived === 1,
      rolloutPath: row.rollout_path
    }));
  });
}

export function getCodexUsageRecentEvents(
  limit = 30,
  codexHome = process.env.CODEX_HOME ?? DEFAULT_CODEX_HOME
): CodexUsageResult<CodexUsageRecentEvent[]> {
  const warnings: string[] = [];
  const normalizedLimit = Math.max(1, Math.min(200, Math.floor(limit) || 30));

  const result = withDatabase(codexHome, 'logs_2.sqlite', ['logs'], (database) => {
    const rows = database
      .prepare(
        `select id, ts, thread_id, feedback_log_body
         from logs
         where feedback_log_body like '%response.completed%'
           and feedback_log_body like '%"usage"%'
         order by id desc
         limit ?`
      )
      .all(normalizedLimit * 4) as LogRow[];

    const events: CodexUsageRecentEvent[] = [];
    for (const row of rows) {
      const parsed = parseUsageEvent(row);
      if (!parsed) {
        warnings.push(`log ${row.id} skipped: usage payload could not be parsed`);
        continue;
      }
      events.push(parsed);
      if (events.length >= normalizedLimit) {
        break;
      }
    }
    return events;
  });

  return result.ok ? { ...result, warnings: [...result.warnings, ...warnings] } : { ...result, warnings };
}

export function parseUsageEvent(row: LogRow): CodexUsageRecentEvent | undefined {
  const body = row.feedback_log_body ?? '';
  const payload = extractResponseCompletedPayload(body);
  const usage = payload?.response?.usage;
  if (!usage) {
    return undefined;
  }

  return {
    id: row.id,
    ts: row.ts,
    tsIso: toIso(row.ts),
    threadId: row.thread_id ?? extractThreadId(body),
    model: payload.response?.model ?? extractModel(body),
    inputTokens: numberOrZero(usage.input_tokens),
    cachedTokens: numberOrZero(usage.input_tokens_details?.cached_tokens),
    outputTokens: numberOrZero(usage.output_tokens),
    reasoningTokens: numberOrZero(usage.output_tokens_details?.reasoning_tokens),
    totalTokens: numberOrZero(usage.total_tokens)
  };
}

function withDatabase<T>(
  codexHome: string,
  fileName: string,
  requiredTables: string[],
  query: (database: DatabaseSync) => T
): CodexUsageResult<T> {
  if (!codexHome || !existsSync(codexHome)) {
    return failure('codex_home_missing', `Codex home not found: ${codexHome}`);
  }

  const databasePath = join(codexHome, fileName);
  if (!existsSync(databasePath)) {
    return failure('database_missing', `Codex database not found: ${databasePath}`);
  }

  let database: DatabaseSync | undefined;
  try {
    database = new DatabaseSync(databasePath, { readOnly: true });
    const tables = new Set(
      (database.prepare("select name from sqlite_master where type = 'table'").all() as Array<{ name: string }>).map(
        (row) => row.name
      )
    );
    const missing = requiredTables.filter((table) => !tables.has(table));
    if (missing.length > 0) {
      return failure('schema_missing', `Codex database schema is missing table(s): ${missing.join(', ')}`);
    }

    return { ok: true, data: query(database), warnings: [] };
  } catch (error) {
    return failure('query_failed', `Failed to query Codex database: ${fileName}`, error instanceof Error ? error.message : String(error));
  } finally {
    database?.close();
  }
}

function extractResponseCompletedPayload(body: string): any | undefined {
  for (const marker of ['Received message ', 'websocket event: ']) {
    const markerIndex = body.indexOf(marker);
    if (markerIndex === -1) {
      continue;
    }

    const jsonStart = body.indexOf('{', markerIndex + marker.length);
    const jsonText = extractBalancedJson(body, jsonStart);
    if (!jsonText) {
      continue;
    }

    try {
      const parsed = JSON.parse(jsonText);
      if (parsed?.type === 'response.completed') {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return undefined;
}

function extractBalancedJson(text: string, start: number): string | undefined {
  if (start < 0 || text[start] !== '{') {
    return undefined;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }
  return undefined;
}

function extractThreadId(body: string): string | undefined {
  return /thread(?:\.|_)?id=([0-9a-f-]+)/iu.exec(body)?.[1];
}

function extractModel(body: string): string | undefined {
  return /model=([^\s}]+)/u.exec(body)?.[1];
}

function stripWindowsNamespace(path: string): string {
  return path.startsWith('\\\\?\\') ? path.slice(4) : path;
}

function toIso(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

function dateKey(timeMs: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(timeMs));
}

function numberOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function failure<T>(code: CodexUsageError['code'], message: string, detail?: string): CodexUsageResult<T> {
  return { ok: false, error: { code, message, detail }, warnings: [] };
}
