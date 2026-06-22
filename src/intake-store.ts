import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { IntakeItemType, IntakeRecord, IntakeStore } from './types.ts';

export class JsonlIntakeStore implements IntakeStore {
  readonly #storageDir: string;
  readonly #defaultAppRole: string;
  readonly #now: () => Date;

  constructor(storageDir: string, defaultAppRole = 'ecocc_intake', now: () => Date = () => new Date()) {
    this.#storageDir = storageDir;
    this.#defaultAppRole = defaultAppRole;
    this.#now = now;
  }

  async append(record: Omit<IntakeRecord, 'id' | 'createdAt' | 'source' | 'status'>): Promise<IntakeRecord> {
    const now = this.#now();
    const createdAt = now.toISOString();
    const filePath = intakeFilePath(this.#storageDir, now);
    await mkdir(this.#storageDir, { recursive: true });

    const id = await nextRecordId(filePath, now);
    const fullRecord: IntakeRecord = {
      id,
      createdAt,
      source: 'dingtalk',
      appRole: record.appRole || this.#defaultAppRole,
      type: record.type,
      status: '已收集',
      conversationId: record.conversationId,
      senderId: record.senderId,
      messageId: record.messageId,
      text: record.text,
      rawText: record.rawText
    };

    await appendFile(filePath, `${JSON.stringify(fullRecord)}\n`, 'utf8');
    return fullRecord;
  }

  async listRecent(options: { type?: IntakeItemType; days: number; limit: number }): Promise<IntakeRecord[]> {
    const now = this.#now();
    const since = new Date(now.getTime() - options.days * 24 * 60 * 60 * 1000);
    const records: IntakeRecord[] = [];

    for (const filePath of candidateMonthlyFiles(this.#storageDir, since, now)) {
      const content = await readExistingRecords(filePath);
      for (const line of content.split(/\r?\n/u)) {
        if (!line.trim()) {
          continue;
        }

        const record = parseRecord(line);
        if (!record) {
          continue;
        }

        const createdAt = new Date(record.createdAt);
        if (Number.isNaN(createdAt.getTime()) || createdAt < since || createdAt > now) {
          continue;
        }

        if (options.type && record.type !== options.type) {
          continue;
        }

        records.push(record);
      }
    }

    return records
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, options.limit);
  }
}

export function intakeFilePath(storageDir: string, date: Date): string {
  return join(storageDir, `intake-${date.getFullYear()}-${pad2(date.getMonth() + 1)}.jsonl`);
}

async function nextRecordId(filePath: string, date: Date): Promise<string> {
  const prefix = `#DT-${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-`;
  const existing = await readExistingRecords(filePath);
  let max = 0;

  for (const line of existing.split(/\r?\n/u)) {
    if (!line.trim()) {
      continue;
    }

    try {
      const record = JSON.parse(line) as { id?: string };
      if (typeof record.id === 'string' && record.id.startsWith(prefix)) {
        const sequence = Number(record.id.slice(prefix.length));
        if (Number.isInteger(sequence) && sequence > max) {
          max = sequence;
        }
      }
    } catch {
      // Ignore malformed historical lines; appending a new record should still work.
    }
  }

  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

async function readExistingRecords(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

function candidateMonthlyFiles(storageDir: string, since: Date, now: Date): string[] {
  const files: string[] = [];
  const cursor = new Date(since.getFullYear(), since.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);

  while (cursor <= end) {
    files.push(intakeFilePath(storageDir, cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return files;
}

function parseRecord(line: string): IntakeRecord | undefined {
  try {
    const record = JSON.parse(line) as Partial<IntakeRecord>;
    if (
      typeof record.id === 'string' &&
      typeof record.createdAt === 'string' &&
      record.source === 'dingtalk' &&
      typeof record.appRole === 'string' &&
      isIntakeItemType(record.type) &&
      record.status === '已收集' &&
      typeof record.conversationId === 'string' &&
      typeof record.senderId === 'string' &&
      typeof record.messageId === 'string' &&
      typeof record.text === 'string' &&
      typeof record.rawText === 'string'
    ) {
      return record as IntakeRecord;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function isIntakeItemType(value: unknown): value is IntakeItemType {
  return value === '待办' || value === '知识' || value === '进度' || value === '风险';
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
