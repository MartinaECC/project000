import { spawn } from 'node:child_process';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  CustomerLedgerRecord,
  CustomerLedgerStatus,
  CustomerLedgerStore,
  CustomerLedgerWriteRequest,
  CustomerLedgerWriteResult,
  CustomerLedgerWriter
} from './types.ts';

export type ParsedCustomerLedgerIntent = {
  customerName: string;
  occurredAt: string;
  ledgerDate: string;
  action: string;
  rawText: string;
};

export type CustomerWikiNode = {
  nodeToken: string;
  objToken: string;
  objType: string;
  title: string;
};

export type LarkCliCustomerLedgerWriterConfig = {
  larkCliBin?: string;
  spaceId: string;
  parentNodeToken: string;
  asIdentity?: 'user' | 'bot';
};

const TIME_PATTERN =
  '(?<date>今天|今日|昨天|明天|\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}|\\d{2}[-/.]\\d{1,2}[-/.]\\d{1,2}|\\d{1,2}[-/.]\\d{1,2}|\\d{1,2}月\\d{1,2}日|\\d{1,2}日|\\d{6})(?:\\s*(?<time>\\d{1,2}[:：]\\d{2}))?';
const LEDGER_INPUT_RE = new RegExp(`^\\s*(?<customer>.+?)\\s+${TIME_PATTERN}\\s+(?<action>[\\s\\S]+?)\\s*$`, 'u');
const LEDGER_COMMAND_PREFIX_RE =
  /^(?:(?:小灰龙(?:[-－—]?运营助手)?|运营助手)[,，、\s]*)?(?:登记台账|记台账|记录台账|客户台账|台账登记|台账|记账)\s*[:：]?\s*/u;

export function parseCustomerLedgerInput(
  text: string,
  now: Date = new Date(),
  timeZone = 'Asia/Shanghai'
): ParsedCustomerLedgerIntent | undefined {
  const normalized = stripLedgerCommandPrefix(stripLeadingMention(text).trim()).trim();
  const match = normalized.match(LEDGER_INPUT_RE);
  const groups = match?.groups;
  if (!groups) {
    return undefined;
  }

  const customerName = cleanCustomerName(groups.customer);
  const action = groups.action.trim();
  if (!customerName || !action) {
    return undefined;
  }

  const occurredAt = parseOccurredAt(groups.date, groups.time, now, timeZone);
  if (!occurredAt) {
    return undefined;
  }

  return {
    customerName,
    occurredAt: occurredAt.toISOString(),
    ledgerDate: formatLedgerDate(occurredAt, timeZone),
    action,
    rawText: text
  };
}

export function matchCustomerWikiNode(
  customerName: string,
  nodes: CustomerWikiNode[]
):
  | { status: 'matched'; node: CustomerWikiNode; displayName: string }
  | { status: 'none'; candidates: CustomerWikiNode[] }
  | { status: 'multiple'; candidates: CustomerWikiNode[] } {
  const query = normalizeCustomerName(customerName);
  const usableNodes = nodes.filter((node) => node.objType === 'docx' && !isUtilityLedgerTitle(node.title));
  const exact = usableNodes.filter((node) => normalizeCustomerName(extractCustomerNameFromTitle(node.title)) === query);
  if (exact.length === 1) {
    return { status: 'matched', node: exact[0], displayName: extractCustomerNameFromTitle(exact[0].title) };
  }
  if (exact.length > 1) {
    return { status: 'multiple', candidates: exact };
  }

  const fuzzy = usableNodes.filter((node) => {
    const titleName = normalizeCustomerName(extractCustomerNameFromTitle(node.title));
    return titleName.includes(query) || query.includes(titleName);
  });
  if (fuzzy.length === 1) {
    return { status: 'matched', node: fuzzy[0], displayName: extractCustomerNameFromTitle(fuzzy[0].title) };
  }
  if (fuzzy.length > 1) {
    return { status: 'multiple', candidates: fuzzy };
  }

  return { status: 'none', candidates: [] };
}

export function extractCustomerNameFromTitle(title: string): string {
  return title
    .replace(/^\s*\d+\s*/u, '')
    .replace(/\s*[|｜]\s*(?:项目|运营|合作)?台账\s*$/u, '')
    .trim();
}

export function appendLedgerRowToDocumentXml(
  content: string,
  ledgerDate: string,
  action: string,
  imageUrls: string[] = []
): string {
  const table = findOperationLedgerTable(content);
  const row = buildLedgerRowXml(ledgerDate, action, imageUrls);
  const insertAt = table.xml.lastIndexOf('</tbody>');
  if (insertAt === -1) {
    throw new Error('目标运营台账表缺少 tbody，无法追加记录。');
  }

  const updatedTable = `${table.xml.slice(0, insertAt)}${row}${table.xml.slice(insertAt)}`;
  return `${content.slice(0, table.start)}${updatedTable}${content.slice(table.end)}`;
}

export function buildLedgerRowXml(ledgerDate: string, action: string, imageUrls: string[] = []): string {
  const date = escapeXmlText(ledgerDate);
  const content = escapeXmlText(action);
  const images = imageUrls.map((url) => `<img href="${escapeXmlAttribute(url)}"/>`).join('');
  return `<tr><td><p>${date}</p></td><td><p>${content}</p>${images}</td><td><p></p></td><td><p></p></td><td><p></p></td><td><p></p></td></tr>`;
}

export class JsonlCustomerLedgerStore implements CustomerLedgerStore {
  readonly #storageDir: string;
  readonly #defaultAppRole: string;
  readonly #now: () => Date;

  constructor(storageDir: string, defaultAppRole = 'customer_ledger', now: () => Date = () => new Date()) {
    this.#storageDir = storageDir;
    this.#defaultAppRole = defaultAppRole;
    this.#now = now;
  }

  async appendPending(
    record: Omit<
      CustomerLedgerRecord,
      'id' | 'createdAt' | 'updatedAt' | 'source' | 'status' | 'docToken' | 'wikiNodeToken' | 'customerTitle' | 'error'
    >
  ): Promise<CustomerLedgerRecord> {
    const now = this.#now();
    const filePath = customerLedgerFilePath(this.#storageDir, now);
    await mkdir(this.#storageDir, { recursive: true });
    const id = await nextCustomerLedgerId(filePath, now);
    const fullRecord: CustomerLedgerRecord = {
      id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      source: 'dingtalk',
      status: 'pending',
      appRole: record.appRole || this.#defaultAppRole,
      customerName: record.customerName,
      occurredAt: record.occurredAt,
      ledgerDate: record.ledgerDate,
      action: record.action,
      imageUrls: record.imageUrls,
      conversationId: record.conversationId,
      senderId: record.senderId,
      messageId: record.messageId,
      rawText: record.rawText
    };
    await this.#append(fullRecord);
    return fullRecord;
  }

  async markSynced(
    id: string,
    result: { docToken: string; wikiNodeToken: string; customerTitle: string }
  ): Promise<CustomerLedgerRecord> {
    return this.#appendStatus(id, 'synced', result);
  }

  async markFailed(id: string, error: string): Promise<CustomerLedgerRecord> {
    return this.#appendStatus(id, 'failed', { error });
  }

  async markNeedsCustomerConfirmation(id: string, error: string): Promise<CustomerLedgerRecord> {
    return this.#appendStatus(id, 'needs_customer_confirmation', { error });
  }

  async #appendStatus(
    id: string,
    status: CustomerLedgerStatus,
    patch: Partial<CustomerLedgerRecord>
  ): Promise<CustomerLedgerRecord> {
    const now = this.#now();
    const record: CustomerLedgerRecord = {
      id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      source: 'dingtalk',
      status,
      appRole: this.#defaultAppRole,
      customerName: '',
      occurredAt: '',
      ledgerDate: '',
      action: '',
      conversationId: '',
      senderId: '',
      messageId: '',
      rawText: '',
      ...patch
    };
    await this.#append(record);
    return record;
  }

  async #append(record: CustomerLedgerRecord): Promise<void> {
    await mkdir(this.#storageDir, { recursive: true });
    await appendFile(customerLedgerFilePath(this.#storageDir, new Date(record.createdAt)), `${JSON.stringify(record)}\n`, 'utf8');
  }
}

export class LarkCliCustomerLedgerWriter implements CustomerLedgerWriter {
  readonly #config: Required<LarkCliCustomerLedgerWriterConfig>;
  #nodesCache?: CustomerWikiNode[];

  constructor(config: LarkCliCustomerLedgerWriterConfig) {
    this.#config = {
      larkCliBin: config.larkCliBin ?? defaultLarkCliBin(),
      asIdentity: config.asIdentity ?? 'user',
      spaceId: config.spaceId,
      parentNodeToken: config.parentNodeToken
    };
  }

  async write(request: CustomerLedgerWriteRequest): Promise<CustomerLedgerWriteResult> {
    const nodes = await this.#getCustomerNodes();
    const match = matchCustomerWikiNode(request.customerName, nodes);
    if (match.status === 'none') {
      throw new CustomerLedgerMatchError(`未找到客户台账：${request.customerName}`);
    }
    if (match.status === 'multiple') {
      const titles = match.candidates.map((candidate) => candidate.title).slice(0, 5).join('、');
      throw new CustomerLedgerMatchError(`客户名不唯一：${request.customerName}。候选：${titles}`);
    }

    const document = await this.#fetchDocument(match.node.objToken);
    const updatedContent = appendLedgerRowToDocumentXml(
      document.content,
      request.ledgerDate,
      request.action,
      request.imageUrls
    );
    const tableId = findOperationLedgerTable(document.content).id;
    await this.#updateTable(match.node.objToken, tableId, updatedContent.slice(updatedContent.indexOf(`<table id="${tableId}"`), updatedContent.indexOf('</table>', updatedContent.indexOf(`<table id="${tableId}"`)) + '</table>'.length));

    return {
      docToken: match.node.objToken,
      wikiNodeToken: match.node.nodeToken,
      customerTitle: match.node.title
    };
  }

  async #getCustomerNodes(): Promise<CustomerWikiNode[]> {
    if (this.#nodesCache) {
      return this.#nodesCache;
    }

    const output = await runCli(this.#config.larkCliBin, [
      'wiki',
      '+node-list',
      '--space-id',
      this.#config.spaceId,
      '--parent-node-token',
      this.#config.parentNodeToken,
      '--page-all',
      '--as',
      this.#config.asIdentity,
      '--format',
      'json'
    ]);
    const parsed = JSON.parse(output) as {
      data?: {
        nodes?: Array<{ node_token?: string; obj_token?: string; obj_type?: string; title?: string }>;
      };
    };
    this.#nodesCache =
      parsed.data?.nodes
        ?.filter((node) => node.node_token && node.obj_token && node.obj_type && node.title)
        .map((node) => ({
          nodeToken: node.node_token as string,
          objToken: node.obj_token as string,
          objType: node.obj_type as string,
          title: node.title as string
        })) ?? [];
    return this.#nodesCache;
  }

  async #fetchDocument(docToken: string): Promise<{ content: string; revisionId: number }> {
    const output = await runCli(this.#config.larkCliBin, [
      'docs',
      '+fetch',
      '--doc',
      docToken,
      '--api-version',
      'v2',
      '--scope',
      'full',
      '--detail',
      'with-ids',
      '--doc-format',
      'xml',
      '--as',
      this.#config.asIdentity,
      '--format',
      'json'
    ]);
    const parsed = JSON.parse(output) as { data?: { document?: { content?: string; revision_id?: number } } };
    const content = parsed.data?.document?.content;
    if (!content) {
      throw new Error(`无法读取客户台账文档内容：${docToken}`);
    }
    return { content, revisionId: parsed.data?.document?.revision_id ?? -1 };
  }

  async #updateTable(docToken: string, tableId: string, tableXml: string): Promise<void> {
    await runCli(
      this.#config.larkCliBin,
      [
        'docs',
        '+update',
        '--doc',
        docToken,
        '--api-version',
        'v2',
        '--command',
        'block_replace',
        '--block-id',
        tableId,
        '--content',
        '-',
        '--as',
        this.#config.asIdentity,
        '--format',
        'json'
      ],
      tableXml
    );
  }
}

export class CustomerLedgerMatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomerLedgerMatchError';
  }
}

export function customerLedgerFilePath(storageDir: string, date: Date): string {
  return join(storageDir, `customer-ledger-${date.getFullYear()}-${pad2(date.getMonth() + 1)}.jsonl`);
}

function stripLeadingMention(text: string): string {
  return text.replace(/^\s*@\S+\s+/u, '');
}

function parseOccurredAt(dateText: string, timeText: string | undefined, now: Date, timeZone: string): Date | undefined {
  const nowParts = datePartsInZone(now, timeZone);
  let year = nowParts.year;
  let month = nowParts.month;
  let day = nowParts.day;

  if (dateText === '今天' || dateText === '今日') {
    // Keep current local date.
  } else if (dateText === '昨天' || dateText === '明天') {
    const offset = dateText === '昨天' ? -1 : 1;
    const shifted = new Date(Date.UTC(nowParts.year, nowParts.month - 1, nowParts.day + offset, 0, 0, 0));
    year = shifted.getUTCFullYear();
    month = shifted.getUTCMonth() + 1;
    day = shifted.getUTCDate();
  } else if (/^\d{6}$/u.test(dateText)) {
    year = 2000 + Number(dateText.slice(0, 2));
    month = Number(dateText.slice(2, 4));
    day = Number(dateText.slice(4, 6));
  } else if (/^\d{1,2}月\d{1,2}日$/u.test(dateText)) {
    const match = dateText.match(/^(?<month>\d{1,2})月(?<day>\d{1,2})日$/u);
    month = Number(match?.groups?.month);
    day = Number(match?.groups?.day);
  } else if (/^\d{1,2}日$/u.test(dateText)) {
    const match = dateText.match(/^(?<day>\d{1,2})日$/u);
    day = Number(match?.groups?.day);
  } else {
    const segments = dateText.split(/[-/.]/u).map(Number);
    if (segments.length === 3) {
      year = segments[0] < 100 ? 2000 + segments[0] : segments[0];
      month = segments[1];
      day = segments[2];
    } else if (segments.length === 2) {
      month = segments[0];
      day = segments[1];
    } else {
      return undefined;
    }
  }

  const [hour, minute] = timeText ? timeText.replace('：', ':').split(':').map(Number) : [0, 0];
  if (!isValidDatePart(year, month, day) || hour > 23 || minute > 59) {
    return undefined;
  }

  return zonedDateToUtc(year, month, day, hour, minute, timeZone);
}

function formatLedgerDate(date: Date, timeZone: string): string {
  const parts = datePartsInZone(date, timeZone);
  return `${String(parts.year).slice(-2)}${pad2(parts.month)}${pad2(parts.day)}`;
}

function datePartsInZone(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

function zonedDateToUtc(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = timeZoneOffsetMs(utcGuess, timeZone);
  return new Date(utcGuess.getTime() - offset);
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );
  return asUtc - date.getTime();
}

function findOperationLedgerTable(content: string): { id: string; xml: string; start: number; end: number } {
  const headingMatch = /<h[1-6][^>]*>[\s\S]*?运营台账[\s\S]*?<\/h[1-6]>/u.exec(content);
  const searchStart = headingMatch ? (headingMatch.index ?? 0) + headingMatch[0].length : 0;
  const tableFromHeading = findNextTable(content, searchStart);
  if (tableFromHeading && isOperationLedgerTable(tableFromHeading.xml)) {
    return tableFromHeading;
  }

  let cursor = 0;
  while (cursor < content.length) {
    const table = findNextTable(content, cursor);
    if (!table) {
      break;
    }
    if (isOperationLedgerTable(table.xml)) {
      return table;
    }
    cursor = table.end;
  }

  throw new Error('未找到包含「日期 / 内容 / 行动 / 复盘 / 下一步」的运营台账表。');
}

function findNextTable(content: string, startAt: number): { id: string; xml: string; start: number; end: number } | undefined {
  const start = content.indexOf('<table', startAt);
  if (start === -1) {
    return undefined;
  }
  const end = content.indexOf('</table>', start);
  if (end === -1) {
    return undefined;
  }
  const xml = content.slice(start, end + '</table>'.length);
  const id = xml.match(/<table[^>]*\sid="([^"]+)"/u)?.[1];
  if (!id) {
    return undefined;
  }
  return { id, xml, start, end: end + '</table>'.length };
}

function isOperationLedgerTable(tableXml: string): boolean {
  const normalized = tableXml.replace(/<[^>]+>/gu, '').replace(/\s+/gu, '');
  const hasContentColumn = normalized.includes('内容') || normalized.includes('问题和内容');
  const hasNextStepColumn = normalized.includes('下一步') || normalized.includes('下一步行动');
  return normalized.includes('日期') && hasContentColumn && hasNextStepColumn;
}

function escapeXmlText(value: string): string {
  return value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/\r?\n/gu, '<br/>');
}

function escapeXmlAttribute(value: string): string {
  return escapeXmlText(value).replace(/"/gu, '&quot;');
}

function cleanCustomerName(value: string): string {
  return stripLedgerCommandPrefix(value.trim()).trim();
}

function stripLedgerCommandPrefix(value: string): string {
  return value.replace(LEDGER_COMMAND_PREFIX_RE, '').trim();
}

function isUtilityLedgerTitle(title: string): boolean {
  return /^(模板|复盘)\s*[|｜]/u.test(title.trim());
}

function normalizeCustomerName(value: string): string {
  return value.replace(/[\s|｜\-—_（）()]/gu, '').toLowerCase();
}

async function nextCustomerLedgerId(filePath: string, date: Date): Promise<string> {
  const prefix = `#CL-${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-`;
  const existing = await readExisting(filePath);
  let max = 0;
  for (const line of existing.split(/\r?\n/u)) {
    if (!line.trim()) {
      continue;
    }
    try {
      const record = JSON.parse(line) as { id?: string };
      if (record.id?.startsWith(prefix)) {
        const sequence = Number(record.id.slice(prefix.length));
        if (Number.isInteger(sequence) && sequence > max) {
          max = sequence;
        }
      }
    } catch {
      // Ignore malformed historical rows.
    }
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

async function readExisting(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return '';
    }
    throw error;
  }
}

function isValidDatePart(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function runCli(bin: string, args: string[], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = commandForSpawn(bin, args);
    const child = spawn(command.bin, command.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: command.shell,
      windowsHide: true
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || stdout || `${bin} exited with code ${code}`));
      }
    });
    child.stdin.end(input ?? '');
  });
}

function defaultLarkCliBin(): string {
  return process.platform === 'win32' ? 'lark-cli.cmd' : 'lark-cli';
}

function commandForSpawn(bin: string, args: string[]): { bin: string; args: string[]; shell?: boolean } {
  if (process.platform !== 'win32' || !/\.(cmd|bat)$/iu.test(bin)) {
    return { bin, args };
  }

  return {
    bin: [bin, ...args].map(quoteCmdArg).join(' '),
    args: [],
    shell: true
  };
}

function quoteCmdArg(value: string): string {
  if (!value) {
    return '""';
  }
  if (/^[A-Za-z0-9_+=:.,/@-]+$/u.test(value)) {
    return value;
  }
  return `"${value.replace(/"/gu, '""')}"`;
}
