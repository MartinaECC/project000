import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { errorFields, logger } from './logger.ts';
import type { ToolRegistry, WeeklyContext } from './types.ts';

const execFileAsync = promisify(execFile);

export type DwsRunner = (bin: string, args: string[]) => Promise<string>;
export type GroupSummaryLimits = { today: number; this_week: number };
export type NowProvider = () => Date;

export class DwsToolRegistry implements ToolRegistry {
  readonly #bin: string;
  readonly #runner: DwsRunner;
  readonly #groupSummaryLimits: GroupSummaryLimits;
  readonly #now: NowProvider;

  constructor(
    bin = 'dws',
    runner: DwsRunner = runDws,
    groupSummaryLimits: GroupSummaryLimits = { today: 50, this_week: 100 },
    now: NowProvider = () => new Date()
  ) {
    this.#bin = bin;
    this.#runner = runner;
    this.#groupSummaryLimits = groupSummaryLimits;
    this.#now = now;
  }

  async readDocument(documentUrl: string): Promise<string> {
    return this.#run(['doc', 'read', '--url', documentUrl, '--format', 'json']);
  }

  async searchGroupMessages(conversationId: string, range: 'today' | 'this_week'): Promise<string[]> {
    const output = await this.#run([
      'chat',
      'message',
      'list',
      '--group',
      conversationId,
      '--limit',
      String(this.#groupSummaryLimits[range]),
      '--format',
      'json'
    ]);
    return parseStringList(output);
  }

  async searchAllGroupMessages(range: 'today' | 'this_week'): Promise<string[]> {
    const { start, end } = timeRange(range, this.#now());
    const output = await this.#run([
      'chat',
      'message',
      'list-all',
      '--start',
      start,
      '--end',
      end,
      '--limit',
      String(this.#groupSummaryLimits[range]),
      '--format',
      'json'
    ]);
    return parseMessageItems(output)
      .filter(isGroupMessageItem)
      .map(formatMessageItem);
  }

  async collectWeeklyContext(userId: string, conversationId: string): Promise<WeeklyContext> {
    const messages = await this.searchGroupMessages(conversationId, 'this_week').catch((error: unknown) => [
      `群聊查询失败：${String(error)}`
    ]);
    return {
      groupSummary: messages.join('\n'),
      documents: [],
      todos: [],
      meetings: [`用户：${userId}`]
    };
  }

  async submitWeeklyReport(userId: string, content: string): Promise<{ ok: boolean; id?: string }> {
    const output = await this.#run([
      'report',
      'create',
      '--user-id',
      userId,
      '--content',
      content,
      '--format',
      'json',
      '--yes'
    ]);
    const parsed = parseJson(output);
    return { ok: true, id: stringField(parsed, 'id') ?? stringField(parsed, 'reportId') };
  }

  async #run(args: string[]): Promise<string> {
    return this.#runner(this.#bin, args);
  }
}

export async function runDws(bin: string, args: string[]): Promise<string> {
  const startedAt = Date.now();
  logger.info('dws.command.started', {
    bin,
    command: args.slice(0, 3).join(' '),
    argCount: args.length,
    shell: shouldUseShellForDwsBin(bin)
  });

  try {
    const { stdout } = await execFileAsync(bin, args, {
      encoding: 'utf8',
      shell: shouldUseShellForDwsBin(bin),
      windowsHide: true,
      timeout: 30_000,
      maxBuffer: 4 * 1024 * 1024
    });
    logger.info('dws.command.completed', {
      bin,
      command: args.slice(0, 3).join(' '),
      durationMs: Date.now() - startedAt,
      stdoutLength: stdout.length
    });
    return stdout;
  } catch (error) {
    logger.error('dws.command.failed', {
      bin,
      command: args.slice(0, 3).join(' '),
      durationMs: Date.now() - startedAt,
      ...errorFields(error)
    });
    throw new Error(`DWS command failed (${bin} ${args.join(' ')}): ${String(error)}`);
  }
}

export function shouldUseShellForDwsBin(bin: string): boolean {
  return /\.(cmd|bat)$/iu.test(bin);
}

function parseStringList(output: string): string[] {
  return parseMessageItems(output).map(formatMessageItem);
}

function parseMessageItems(output: string): unknown[] {
  const parsed = parseJson(output);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { items?: unknown[] }).items)) {
    return (parsed as { items: unknown[] }).items;
  }
  return output.trim() ? [output.trim()] : [];
}

function formatMessageItem(item: unknown): string {
  if (typeof item === 'string') {
    return item;
  }
  if (!item || typeof item !== 'object') {
    return String(item);
  }

  const record = item as Record<string, unknown>;
  const time = firstString(record, ['createAt', 'sendTime', 'createdAt', 'time', 'msgTime', 'createTime']);
  const sender = firstString(record, ['senderNick', 'senderName', 'senderStaffName', 'sender', 'fromName', 'nick']);
  const conversation = firstString(record, ['conversationTitle', 'chatName', 'groupName', 'conversationName']);
  const text = extractText(record);

  if (time || sender || text) {
    const conversationPrefix = conversation ? `[${conversation}]` : '';
    const timePrefix = time ? `[${time}]` : '';
    const senderPrefix = sender ? ` ${sender}` : '';
    const prefix = `${conversationPrefix}${timePrefix}${senderPrefix}`.trim();
    return prefix ? `${prefix}: ${text || JSON.stringify(item)}` : text || JSON.stringify(item);
  }

  return JSON.stringify(item);
}

function isGroupMessageItem(item: unknown): boolean {
  if (!item || typeof item !== 'object') {
    return true;
  }

  const record = item as Record<string, unknown>;
  if (record.singleChat === true || record.singleChat === 'true') {
    return false;
  }
  if (record.singleChat === false || record.singleChat === 'false') {
    return true;
  }

  const conversationType = firstString(record, ['conversationType', 'chatType', 'type'])?.toLowerCase();
  if (conversationType) {
    return conversationType.includes('group') || conversationType.includes('群');
  }

  return true;
}

function timeRange(range: 'today' | 'this_week', now: Date): { start: string; end: string } {
  const start = new Date(now);
  if (range === 'this_week') {
    const day = start.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - daysSinceMonday);
  }
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return {
    start: formatDwsDateTime(start),
    end: formatDwsDateTime(end)
  };
}

function formatDwsDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function extractText(record: Record<string, unknown>): string | undefined {
  const direct = firstString(record, ['content', 'text', 'message', 'msgContent', 'body']);
  if (direct) {
    return direct;
  }

  for (const key of ['text', 'content', 'msgContent', 'body']) {
    const value = record[key];
    if (value && typeof value === 'object') {
      const nested = firstString(value as Record<string, unknown>, ['content', 'text', 'plainText']);
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function parseJson(output: string): unknown {
  try {
    return JSON.parse(output);
  } catch {
    return output;
  }
}

function stringField(value: unknown, key: string): string | undefined {
  return value && typeof value === 'object' && typeof (value as Record<string, unknown>)[key] === 'string'
    ? ((value as Record<string, unknown>)[key] as string)
    : undefined;
}
