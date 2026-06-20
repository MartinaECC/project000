import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { errorFields, logger } from './logger.ts';
import type { LlmAgent } from './types.ts';

const execFileAsync = promisify(execFile);

export type AmountGroup = {
  company: string;
  amount: string | number;
  count: number;
};

export type RefundReportRow = {
  company: string;
  incomeAmount: number;
  refundAmount: number;
  refundRate: number | null;
};

export type RefundReportDiagnostics = {
  incomeRows: number;
  refundRows: number;
  incomeBadRows: unknown[];
  refundBadRows: unknown[];
  incomeTruncated: boolean;
  refundTruncated: boolean;
};

export type RefundReportData = {
  rows: RefundReportRow[];
  diagnostics: RefundReportDiagnostics;
};

export type RefundReportSource = {
  load(): Promise<RefundReportData>;
};

export type ScheduledRefundReportSender = {
  sendToUsers(userIds: string[], title: string, markdown: string): Promise<void>;
};

export type RefundReportConfig = {
  enabled: boolean;
  userIds: string[];
  thresholdPercent: number;
  timezone: string;
  llmOnAnomaly: 'never' | 'fail_only' | 'fail_or_threshold';
};

export function aggregateAmountGroups(groups: AmountGroup[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const group of groups) {
    const amount = Number(group.amount);
    const count = Number(group.count);
    if (!group.company || !Number.isFinite(amount) || !Number.isFinite(count)) {
      continue;
    }
    totals[group.company] = (totals[group.company] ?? 0) + amount * count;
  }
  return totals;
}

export function buildRefundReportRows(
  incomeByCompany: Record<string, number>,
  refundByCompany: Record<string, number>
): RefundReportRow[] {
  return [...new Set([...Object.keys(incomeByCompany), ...Object.keys(refundByCompany)])]
    .map((company) => {
      const incomeAmount = roundMoney(incomeByCompany[company] ?? 0);
      const refundAmount = roundMoney(refundByCompany[company] ?? 0);
      return {
        company,
        incomeAmount,
        refundAmount,
        refundRate: incomeAmount > 0 ? (refundAmount / incomeAmount) * 100 : null
      };
    })
    .sort((left, right) => sortRate(right) - sortRate(left) || left.company.localeCompare(right.company, 'zh-Hans-CN'));
}

export function formatRefundReportMarkdown(rows: RefundReportRow[], generatedAt: Date, anomalySummary?: string): string {
  return [
    '## 每小时退费率报表',
    '',
    `生成时间：${formatDateTime(generatedAt)}`,
    '',
    ...(anomalySummary ? [`**异常说明**：${anomalySummary}`, ''] : []),
    '| 企业 | 支付成功金额 | 退费金额 | 退费率 |',
    '|---|---:|---:|---:|',
    ...rows.map(
      (row) =>
        `| ${row.company} | ${formatMoney(row.incomeAmount)} | ${formatMoney(row.refundAmount)} | ${formatRate(row.refundRate)} |`
    )
  ].join('\n');
}

export function formatRefundReportTextChunks(
  rows: RefundReportRow[],
  generatedAt: Date,
  anomalySummary?: string,
  chunkSize = 5
): string[] {
  const totalParts = Math.max(1, Math.ceil(rows.length / chunkSize));
  const chunks: string[] = [];
  for (let offset = 0; offset < rows.length || offset === 0; offset += chunkSize) {
    const partNo = Math.floor(offset / chunkSize) + 1;
    const body = rows.slice(offset, offset + chunkSize).map((row, index) => {
      const rank = offset + index + 1;
      return `${rank}.${row.company}｜支付${formatMoney(row.incomeAmount)}｜退费${formatMoney(row.refundAmount)}｜退费率${formatRate(row.refundRate)}`;
    });
    chunks.push(
      compactBotText(
        [
          `【正文第${partNo}/${totalParts}段】今日退费率报表`,
          `生成时间:${formatDateTime(generatedAt)}`,
          '金额单位:元',
          '字段:企业｜支付成功｜退费｜退费率',
          ...(anomalySummary ? [`异常说明:${anomalySummary}`] : []),
          ...body
        ].join(';')
      )
    );
    if (offset + chunkSize >= rows.length) {
      break;
    }
  }
  return chunks;
}

export function msUntilNextHour(now = new Date()): number {
  const next = new Date(now);
  next.setHours(now.getHours() + 1, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function hasRefundReportAnomaly(data: RefundReportData, thresholdPercent: number): boolean {
  return (
    data.diagnostics.incomeTruncated ||
    data.diagnostics.refundTruncated ||
    data.diagnostics.incomeBadRows.length > 0 ||
    data.diagnostics.refundBadRows.length > 0 ||
    data.rows.some((row) => row.refundRate !== null && row.refundRate >= thresholdPercent)
  );
}

export class PythonRefundReportSource implements RefundReportSource {
  readonly #pythonBin: string;
  readonly #scriptPath: string;

  constructor(pythonBin = 'python', scriptPath = 'scripts/datafinder_refund_report.py') {
    this.#pythonBin = pythonBin;
    this.#scriptPath = scriptPath;
  }

  async load(): Promise<RefundReportData> {
    const { stdout } = await execFileAsync(this.#pythonBin, [this.#scriptPath], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 60_000,
      maxBuffer: 8 * 1024 * 1024
    });
    const parsed = JSON.parse(stdout) as { rows?: RefundReportRow[]; diagnostics?: RefundReportDiagnostics };
    if (!Array.isArray(parsed.rows) || !parsed.diagnostics) {
      throw new Error('Invalid refund report JSON from DataFinder script.');
    }
    return { rows: parsed.rows, diagnostics: parsed.diagnostics };
  }
}

export async function sendRefundReportOnce(options: {
  source: RefundReportSource;
  sender: ScheduledRefundReportSender;
  userIds: string[];
  thresholdPercent: number;
  llm?: LlmAgent;
  llmOnAnomaly: RefundReportConfig['llmOnAnomaly'];
  now?: Date;
}): Promise<void> {
  let data: RefundReportData;
  let anomalySummary: string | undefined;

  try {
    data = await options.source.load();
  } catch (error) {
    anomalySummary = await maybeSummarize(options.llm, options.llmOnAnomaly, '退费率报表数据查询失败', String(error));
    await options.sender.sendToUsers(
      options.userIds,
      '退费率报表失败',
      compactBotText(`退费率报表数据查询失败;生成时间${formatDateTime(options.now ?? new Date())};${anomalySummary ?? String(error)}`)
    );
    throw error;
  }

  if (options.llmOnAnomaly === 'fail_or_threshold' && hasRefundReportAnomaly(data, options.thresholdPercent)) {
    anomalySummary = await maybeSummarize(
      options.llm,
      options.llmOnAnomaly,
      '退费率报表存在异常',
      JSON.stringify({ thresholdPercent: options.thresholdPercent, rows: data.rows.slice(0, 10), diagnostics: data.diagnostics })
    );
  }

  const chunks = formatRefundReportTextChunks(data.rows, options.now ?? new Date(), anomalySummary);
  for (const [index, chunk] of chunks.entries()) {
    await options.sender.sendToUsers(options.userIds, `今日退费率报表${index + 1}/${chunks.length}`, chunk);
  }
}

export function startHourlyRefundReport(options: {
  source: RefundReportSource;
  sender: ScheduledRefundReportSender;
  userIds: string[];
  thresholdPercent: number;
  llm?: LlmAgent;
  llmOnAnomaly: RefundReportConfig['llmOnAnomaly'];
  setTimer?: typeof setTimeout;
  now?: () => Date;
}): () => void {
  const setTimer = options.setTimer ?? setTimeout;
  const now = options.now ?? (() => new Date());
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const schedule = (delayMs: number) => {
    timer = setTimer(async () => {
      try {
        await sendRefundReportOnce({ ...options, now: now() });
      } catch (error) {
        logger.error('refund_report.send_failed', errorFields(error));
      } finally {
        if (!stopped) {
          schedule(60 * 60 * 1000);
        }
      }
    }, delayMs);
  };

  schedule(msUntilNextHour(now()));
  return () => {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
    }
  };
}

function sortRate(row: RefundReportRow): number {
  return row.refundRate ?? Number.POSITIVE_INFINITY;
}

function compactBotText(text: string): string {
  return text.replace(/\s+/gu, '').replace(/[|#*`]/gu, '');
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatRate(value: number | null): string {
  return value === null ? '无法计算' : `${value.toFixed(2)}%`;
}

function formatDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')} ${pick('hour')}:${pick('minute')}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

async function maybeSummarize(
  llm: LlmAgent | undefined,
  policy: RefundReportConfig['llmOnAnomaly'],
  title: string,
  detail: string
): Promise<string | undefined> {
  if (!llm || policy === 'never') {
    return undefined;
  }
  return llm.chat(`${title}\n请用一句中文说明重点，不要扩展事实。\n${detail}`);
}

function formatFailureMarkdown(title: string, generatedAt: Date, anomalySummary: string | undefined, error: unknown): string {
  return [`## ${title}`, '', `生成时间：${formatDateTime(generatedAt)}`, '', anomalySummary ?? String(error)].join('\n');
}
