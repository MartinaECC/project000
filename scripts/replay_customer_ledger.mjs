import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadConfig } from '../src/config.ts';
import { LarkCliCustomerLedgerWriter, JsonlCustomerLedgerStore } from '../src/customer-ledger.ts';
import { loadEnvFile } from '../src/env-file.ts';

const options = parseArgs(process.argv.slice(2));
const envFile = options.envFile ?? process.env.DINGTALK_ENV_FILE ?? '.env.intake.local';
loadEnvFile(envFile);

const config = loadConfig();
const storageDir = resolve(options.storageDir ?? config.customerLedger?.storageDir ?? 'E:\\KnowledgeBase\\00-Inbox\\DingTalkCustomerLedger');
const dryRun = options.dryRun ?? false;
const limit = options.limit ?? 20;

if (!config.customerLedger?.wikiParentNodeToken || !config.customerLedger.spaceId) {
  throw new Error('Missing CUSTOMER_LEDGER_WIKI_PARENT_NODE_TOKEN or CUSTOMER_LEDGER_SPACE_ID.');
}

const pendingRecords = (await loadReplayCandidates(storageDir)).slice(0, limit);
console.log(JSON.stringify({ event: 'customer_ledger.replay.started', storageDir, dryRun, count: pendingRecords.length }));

if (dryRun) {
  for (const record of pendingRecords) {
    console.log(JSON.stringify({ event: 'customer_ledger.replay.candidate', id: record.id, customerName: record.customerName, ledgerDate: record.ledgerDate, action: record.action }));
  }
  process.exit(0);
}

const writer = new LarkCliCustomerLedgerWriter({
  larkCliBin: config.customerLedger.larkCliBin,
  spaceId: config.customerLedger.spaceId,
  parentNodeToken: config.customerLedger.wikiParentNodeToken
});
const store = new JsonlCustomerLedgerStore(storageDir, config.customerLedger.appRole);

let synced = 0;
let failed = 0;
for (const record of pendingRecords) {
  try {
    const result = await writer.write({
      customerName: record.customerName,
      occurredAt: record.occurredAt,
      ledgerDate: record.ledgerDate,
      action: record.action,
      imageUrls: record.imageUrls,
      conversationId: record.conversationId,
      senderId: record.senderId,
      messageId: record.messageId,
      rawText: record.rawText
    });
    await store.markSynced(record.id, result);
    synced += 1;
    console.log(JSON.stringify({ event: 'customer_ledger.replay.synced', id: record.id, customerTitle: result.customerTitle }));
  } catch (error) {
    failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    await store.markFailed(record.id, `replay failed: ${message}`);
    console.log(JSON.stringify({ event: 'customer_ledger.replay.failed', id: record.id, error: message }));
  }
}

console.log(JSON.stringify({ event: 'customer_ledger.replay.completed', synced, failed }));

async function loadReplayCandidates(storageDir) {
  const files = await listLedgerFiles(storageDir);
  const byId = new Map();
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    for (const line of content.split(/\r?\n/u)) {
      if (!line.trim()) {
        continue;
      }
      const record = JSON.parse(line);
      if (!record.id) {
        continue;
      }
      const entry = byId.get(record.id) ?? { rows: [], latest: undefined, pending: undefined, hasSynced: false };
      entry.rows.push(record);
      entry.latest = record;
      if (record.status === 'synced') {
        entry.hasSynced = true;
      }
      if (record.status === 'pending' && record.customerName && record.ledgerDate && record.action) {
        entry.pending = record;
      }
      byId.set(record.id, entry);
    }
  }

  return [...byId.values()]
    .filter((entry) => entry.pending && !entry.hasSynced && entry.latest?.status !== 'needs_customer_confirmation')
    .map((entry) => entry.pending)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

async function listLedgerFiles(storageDir) {
  try {
    const names = await readdir(storageDir);
    return names
      .filter((name) => /^customer-ledger-\d{4}-\d{2}\.jsonl$/u.test(name))
      .sort()
      .map((name) => join(storageDir, name));
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--env-file') {
      parsed.envFile = args[index + 1];
      index += 1;
    } else if (arg === '--storage-dir') {
      parsed.storageDir = args[index + 1];
      index += 1;
    } else if (arg === '--limit') {
      parsed.limit = Number(args[index + 1]);
      index += 1;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    }
  }
  return parsed;
}
