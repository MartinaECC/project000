import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { JsonlIntakeStore, intakeFilePath } from '../src/intake-store.ts';

test('jsonl intake store creates monthly files and appends records', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ecocc-intake-'));
  try {
    const store = new JsonlIntakeStore(dir, 'ecocc_intake', () => new Date('2026-06-22T10:00:00.000Z'));

    const first = await store.append({
      appRole: 'ecocc_intake',
      type: '\u5f85\u529e',
      conversationId: 'cid-1',
      senderId: 'user-1',
      messageId: 'msg-1',
      text: '\u8ddf\u8fdb\u767d\u540d\u5355',
      rawText: '[\u5f85\u529e] \u8ddf\u8fdb\u767d\u540d\u5355'
    });
    const second = await store.append({
      appRole: 'ecocc_intake',
      type: '\u77e5\u8bc6',
      conversationId: 'cid-1',
      senderId: 'user-1',
      messageId: 'msg-2',
      text: 'Stream \u5148\u8fde\u63a5\u518d\u914d\u4e8b\u4ef6',
      rawText: '[\u77e5\u8bc6] Stream \u5148\u8fde\u63a5\u518d\u914d\u4e8b\u4ef6'
    });

    assert.equal(first.id, '#DT-20260622-001');
    assert.equal(second.id, '#DT-20260622-002');
    const file = await readFile(intakeFilePath(dir, new Date('2026-06-22T10:00:00.000Z')), 'utf8');
    const rows = file.trim().split(/\r?\n/u).map((line) => JSON.parse(line));
    assert.equal(rows.length, 2);
    assert.equal(rows[0].source, 'dingtalk');
    assert.equal(rows[0].status, '\u5df2\u6536\u96c6');
    assert.equal(rows[1].type, '\u77e5\u8bc6');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('jsonl intake store lists recent records by type newest first', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ecocc-intake-'));
  try {
    const store = new JsonlIntakeStore(dir, 'ecocc_intake', () => new Date('2026-06-22T12:00:00.000Z'));
    await store.append({
      appRole: 'ecocc_intake',
      type: '\u5f85\u529e',
      conversationId: 'cid-1',
      senderId: 'user-1',
      messageId: 'msg-1',
      text: '\u65e7\u5f85\u529e',
      rawText: '[\u5f85\u529e] \u65e7\u5f85\u529e'
    });

    const newerStore = new JsonlIntakeStore(dir, 'ecocc_intake', () => new Date('2026-06-22T13:00:00.000Z'));
    await newerStore.append({
      appRole: 'ecocc_intake',
      type: '\u5f85\u529e',
      conversationId: 'cid-1',
      senderId: 'user-1',
      messageId: 'msg-2',
      text: '\u65b0\u5f85\u529e',
      rawText: '[\u5f85\u529e] \u65b0\u5f85\u529e'
    });
    await newerStore.append({
      appRole: 'ecocc_intake',
      type: '\u77e5\u8bc6',
      conversationId: 'cid-1',
      senderId: 'user-1',
      messageId: 'msg-3',
      text: '\u4e0d\u662f\u5f85\u529e',
      rawText: '[\u77e5\u8bc6] \u4e0d\u662f\u5f85\u529e'
    });

    const records = await newerStore.listRecent({ type: '\u5f85\u529e', days: 7, limit: 10 });

    assert.deepEqual(
      records.map((record) => record.text),
      ['\u65b0\u5f85\u529e', '\u65e7\u5f85\u529e']
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
