import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  getCodexUsageRecentEvents,
  getCodexUsageSummary,
  getCodexUsageThreads,
  parseUsageEvent
} from '../src/codex-usage.ts';
import { createBotHttpServer } from '../src/server.ts';

test('queries Codex thread usage and summary from sqlite fixtures', () => {
  const codexHome = makeCodexHome();
  try {
    createStateDatabase(codexHome);

    const threads = getCodexUsageThreads(codexHome);
    assert.equal(threads.ok, true);
    assert.equal(threads.data.length, 2);
    assert.equal(threads.data[0].id, 'thread-new');
    assert.equal(threads.data[0].cwd, 'E:\\Workspace_codex\\project000');
    assert.equal(threads.data[0].tokensUsed, 1200);
    assert.equal(threads.data[1].archived, true);

    const summary = getCodexUsageSummary(codexHome);
    assert.equal(summary.ok, true);
    assert.equal(summary.data.totalTokens, 1800);
    assert.equal(summary.data.threadCount, 2);
    assert.equal(summary.data.activeThreadCount, 1);
    assert.equal(summary.data.archivedThreadCount, 1);
  } finally {
    rmSync(codexHome, { recursive: true, force: true });
  }
});

test('parses response.completed usage details from Codex logs', () => {
  const payload = {
    type: 'response.completed',
    response: {
      model: 'gpt-5.5',
      usage: {
        input_tokens: 100,
        input_tokens_details: { cached_tokens: 40 },
        output_tokens: 25,
        output_tokens_details: { reasoning_tokens: 7 },
        total_tokens: 125
      }
    }
  };

  const event = parseUsageEvent({
    id: 7,
    ts: 1782003988,
    thread_id: 'thread-1',
    feedback_log_body: `Received message ${JSON.stringify(payload)}`
  });

  assert.deepEqual(event, {
    id: 7,
    ts: 1782003988,
    tsIso: '2026-06-21T01:06:28.000Z',
    threadId: 'thread-1',
    model: 'gpt-5.5',
    inputTokens: 100,
    cachedTokens: 40,
    outputTokens: 25,
    reasoningTokens: 7,
    totalTokens: 125
  });
});

test('skips broken or non-usage logs without failing recent event query', () => {
  const codexHome = makeCodexHome();
  try {
    createLogsDatabase(codexHome);
    const events = getCodexUsageRecentEvents(5, codexHome);

    assert.equal(events.ok, true);
    assert.equal(events.data.length, 1);
    assert.equal(events.data[0].totalTokens, 125);
    assert.equal(events.warnings.length, 1);
  } finally {
    rmSync(codexHome, { recursive: true, force: true });
  }
});

test('serves Codex usage API and static dashboard routes', async () => {
  const codexHome = makeCodexHome();
  const originalCodexHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = codexHome;
  try {
    createStateDatabase(codexHome);
    createLogsDatabase(codexHome);
    const server = createBotHttpServer({} as never);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    assert.equal(typeof address, 'object');
    const baseUrl = `http://127.0.0.1:${address!.port}`;

    const summary = await fetchJson(`${baseUrl}/codex-usage/summary`);
    assert.equal(summary.ok, true);
    assert.equal(summary.data.totalTokens, 1800);

    const threads = await fetchJson(`${baseUrl}/codex-usage/threads`);
    assert.equal(threads.ok, true);
    assert.equal(threads.data[0].id, 'thread-new');

    const page = await fetch(`${baseUrl}/codex-usage`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Codex 用量分析看板/u);

    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  } finally {
    process.env.CODEX_HOME = originalCodexHome;
    rmSync(codexHome, { recursive: true, force: true });
  }
});

function makeCodexHome(): string {
  return mkdtempSync(join(tmpdir(), 'codex-usage-test-'));
}

function createStateDatabase(codexHome: string): void {
  const database = new DatabaseSync(join(codexHome, 'state_5.sqlite'));
  database.exec(`
    create table threads (
      id text primary key,
      title text not null,
      cwd text not null,
      created_at integer not null,
      updated_at integer not null,
      tokens_used integer not null default 0,
      archived integer not null default 0,
      rollout_path text not null
    );
  `);
  database
    .prepare(
      `insert into threads (id, title, cwd, created_at, updated_at, tokens_used, archived, rollout_path)
       values (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run('thread-old', '旧对话', 'E:\\Other', 1781910000, 1781911000, 600, 1, 'old.jsonl');
  database
    .prepare(
      `insert into threads (id, title, cwd, created_at, updated_at, tokens_used, archived, rollout_path)
       values (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run('thread-new', '新对话', '\\\\?\\E:\\Workspace_codex\\project000', 1782000000, 1782003988, 1200, 0, 'new.jsonl');
  database.close();
}

function createLogsDatabase(codexHome: string): void {
  const database = new DatabaseSync(join(codexHome, 'logs_2.sqlite'));
  database.exec(`
    create table logs (
      id integer primary key,
      ts integer not null,
      thread_id text,
      feedback_log_body text
    );
  `);
  const payload = {
    type: 'response.completed',
    response: {
      model: 'gpt-5.5',
      usage: {
        input_tokens: 100,
        input_tokens_details: { cached_tokens: 40 },
        output_tokens: 25,
        output_tokens_details: { reasoning_tokens: 7 },
        total_tokens: 125
      }
    }
  };
  database
    .prepare('insert into logs (id, ts, thread_id, feedback_log_body) values (?, ?, ?, ?)')
    .run(1, 1782003988, 'thread-new', `Received message ${JSON.stringify(payload)}`);
  database
    .prepare('insert into logs (id, ts, thread_id, feedback_log_body) values (?, ?, ?, ?)')
    .run(2, 1782003989, 'thread-new', 'Received message {"type":"response.completed","response":{"usage":');
  database.close();
}

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url);
  assert.equal(response.status, 200);
  return response.json();
}
