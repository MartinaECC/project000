import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { RefundReportCardSender } from './dingtalk-card-service.ts';
import { errorFields, logger } from './logger.ts';
import { renderRefundReportTablePng } from './refund-report-image.ts';
import type { LlmAgent } from './types.ts';

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEZONE = 'Asia/Shanghai';
const DEFAULT_CHUNK_SIZE = 6;

export type AmountGroup = {
  company: string;
  amount: string | number;
  count: number;
};

export type RefundReportRow = {
  company: string;
  incomeAmount: number;
  refundAmount: number;
  incomeCount: number;
  refundCount: number;
  c0IncomeAmount: number;
  refundRate: number | null;
};

export type RefundReportDiagnostics = {
  incomeRows: number;
  incomeAmountRows?: number;
  incomeCountRows?: number;
  c0IncomeRows?: number;
  c0IncomeAmountRows?: number;
  refundRows: number;
  refundAmountRows?: number;
  refundCountRows?: number;
  incomeBadRows: unknown[];
  incomeAmountBadRows?: unknown[];
  incomeCountBadRows?: unknown[];
  c0IncomeBadRows?: unknown[];
  c0IncomeAmountBadRows?: unknown[];
  refundBadRows: unknown[];
  refundAmountBadRows?: unknown[];
  refundCountBadRows?: unknown[];
  incomeTruncated: boolean;
  incomeAmountTruncated?: boolean;
  incomeCountTruncated?: boolean;
  c0IncomeTruncated?: boolean;
  c0IncomeAmountTruncated?: boolean;
  refundTruncated: boolean;
  refundAmountTruncated?: boolean;
  refundCountTruncated?: boolean;
  incomeGranularity?: string;
  incomeAmountGranularity?: string;
  incomeCountGranularity?: string;
  c0IncomeGranularity?: string;
  c0IncomeAmountGranularity?: string;
  refundGranularity?: string;
  refundAmountGranularity?: string;
  refundCountGranularity?: string;
  amountMetric?: string;
};

export type RefundReportData = {
  rows: RefundReportRow[];
  diagnostics: RefundReportDiagnostics;
  baselineRows?: RefundReportRow[];
  baselineDiagnostics?: RefundReportDiagnostics;
  previousFullDayRows?: RefundReportRow[];
  previousFullDayDiagnostics?: RefundReportDiagnostics;
  yesterdayFullDayRows?: RefundReportRow[];
  yesterdayFullDayDiagnostics?: RefundReportDiagnostics;
  periods?: RefundReportPeriods;
};

export type RefundReportPeriods = {
  current: { start: Date; end: Date };
  baseline: { start: Date; end: Date };
  previousFullDay?: { start: Date; end: Date };
  yesterdayFullDay?: { start: Date; end: Date };
};

export type RefundReportSource = {
  load(now?: Date): Promise<RefundReportData>;
};

export type RefundReportConfig = {
  enabled: boolean;
  userIds: string[];
  groupConversationId?: string;
  cardTemplateId?: string;
  cardCallbackRouteKey?: string;
  cardApiBaseUrl?: string;
  renderMode: 'markdown' | 'image';
  thresholdPercent: number;
  timezone: string;
  llmOnAnomaly: 'never' | 'fail_only' | 'fail_or_threshold';
};

export function aggregateAmountGroups(groups: AmountGroup[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const group of groups) {
    const value = Number(group.amount);
    if (!group.company || !Number.isFinite(value)) {
      continue;
    }
    totals[group.company] = roundMoney((totals[group.company] ?? 0) + value);
  }
  return totals;
}

export function aggregateCountGroups(groups: AmountGroup[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const group of groups) {
    const count = Number(group.count);
    if (!group.company || !Number.isFinite(count)) {
      continue;
    }
    totals[group.company] = roundCount((totals[group.company] ?? 0) + count);
  }
  return totals;
}

export function buildRefundReportRows(
  incomeByCompany: Record<string, number>,
  refundByCompany: Record<string, number>,
  incomeCountByCompany: Record<string, number> = {},
  refundCountByCompany: Record<string, number> = {},
  c0IncomeByCompany: Record<string, number> = {}
): RefundReportRow[] {
  return [...new Set([...Object.keys(incomeByCompany), ...Object.keys(refundByCompany)])]
    .map((company) => {
      const incomeAmount = roundMoney(incomeByCompany[company] ?? 0);
      const refundAmount = roundMoney(refundByCompany[company] ?? 0);
      return {
        company,
        incomeAmount,
        refundAmount,
        incomeCount: roundCount(incomeCountByCompany[company] ?? 0),
        refundCount: roundCount(refundCountByCompany[company] ?? 0),
        c0IncomeAmount: roundMoney(c0IncomeByCompany[company] ?? 0),
        refundRate: incomeAmount > 0 ? (refundAmount / incomeAmount) * 100 : null
      };
    })
    .filter((row) => !(row.incomeAmount === 0 && row.refundAmount === 0))
    .sort(compareRefundRows);
}

export function formatRefundReportMarkdown(
  rows: RefundReportRow[],
  generatedAt: Date,
  options: {
    baselineRows?: RefundReportRow[];
    baselineDiagnostics?: RefundReportDiagnostics;
    diagnostics?: RefundReportDiagnostics;
    anomalySummary?: string;
    thresholdPercent?: number;
    timezone?: string;
  } = {}
): string {
  return buildMarkdown(rows, rows, generatedAt, options);
}

export function formatRefundReportMarkdownChunks(
  rows: RefundReportRow[],
  generatedAt: Date,
  options: {
    baselineRows?: RefundReportRow[];
    baselineDiagnostics?: RefundReportDiagnostics;
    diagnostics?: RefundReportDiagnostics;
    anomalySummary?: string;
    thresholdPercent?: number;
    timezone?: string;
    chunkSize?: number;
  } = {}
): string[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const totalParts = Math.max(1, Math.ceil(rows.length / chunkSize));
  const chunks: string[] = [];

  for (let offset = 0; offset < rows.length || offset === 0; offset += chunkSize) {
    const visibleRows = rows.slice(offset, offset + chunkSize);
    chunks.push(buildMarkdown(rows, visibleRows, generatedAt, { ...options, partNo: chunks.length + 1, totalParts }));
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

export function computeRefundReportPeriods(now = new Date(), timezone = DEFAULT_TIMEZONE): RefundReportPeriods {
  const parts = getDateTimeParts(now, timezone);
  const currentStart = zonedDate(parts.year, parts.month, parts.day, 0, timezone);
  const currentEnd = zonedDate(parts.year, parts.month, parts.day, parts.hour, timezone);
  const previousFullDayStart = new Date(currentStart.getTime() - 2 * 24 * 60 * 60 * 1000);
  const previousFullDayEnd = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayFullDayStart = previousFullDayEnd;
  const yesterdayFullDayEnd = currentStart;
  if (parts.hour === '00') {
    return {
      current: { start: yesterdayFullDayStart, end: yesterdayFullDayEnd },
      baseline: { start: previousFullDayStart, end: previousFullDayEnd },
      previousFullDay: { start: previousFullDayStart, end: previousFullDayEnd },
      yesterdayFullDay: { start: yesterdayFullDayStart, end: yesterdayFullDayEnd }
    };
  }
  return {
    current: { start: currentStart, end: currentEnd },
    baseline: {
      start: new Date(currentStart.getTime() - 24 * 60 * 60 * 1000),
      end: new Date(currentEnd.getTime() - 24 * 60 * 60 * 1000)
    },
    previousFullDay: { start: previousFullDayStart, end: previousFullDayEnd },
    yesterdayFullDay: { start: yesterdayFullDayStart, end: yesterdayFullDayEnd }
  };
}

export function hasRefundReportAnomaly(data: RefundReportData, thresholdPercent: number): boolean {
  const baselineByCompany = new Map((data.baselineRows ?? []).map((row) => [row.company, row]));
  return (
    data.diagnostics.incomeTruncated ||
    data.diagnostics.refundTruncated ||
    data.diagnostics.incomeBadRows.length > 0 ||
    data.diagnostics.refundBadRows.length > 0 ||
    (data.baselineDiagnostics?.incomeTruncated ?? false) ||
    (data.baselineDiagnostics?.refundTruncated ?? false) ||
    (data.baselineDiagnostics?.incomeBadRows.length ?? 0) > 0 ||
    (data.baselineDiagnostics?.refundBadRows.length ?? 0) > 0 ||
    data.rows.some((row) => isRefundRateChangeAnomaly(row, baselineByCompany.get(row.company), thresholdPercent)) ||
    data.rows.some((row) => row.incomeAmount === 0 && row.refundAmount > 0)
  );
}

export class PythonRefundReportSource implements RefundReportSource {
  readonly #pythonBin: string;
  readonly #scriptPath: string;

  constructor(pythonBin = 'python', scriptPath = 'scripts/datafinder_refund_report.py') {
    this.#pythonBin = pythonBin;
    this.#scriptPath = scriptPath;
  }

  async load(now = new Date()): Promise<RefundReportData> {
    const { stdout } = await execFileAsync(this.#pythonBin, [this.#scriptPath], {
      encoding: 'utf8',
      env: { ...process.env, REFUND_REPORT_NOW_ISO: now.toISOString() },
      windowsHide: true,
      timeout: 60_000,
      maxBuffer: 8 * 1024 * 1024
    });
    const parsed = JSON.parse(stdout) as {
      rows?: RefundReportRow[];
      diagnostics?: RefundReportDiagnostics;
      baselineRows?: RefundReportRow[];
      baselineDiagnostics?: RefundReportDiagnostics;
      previousFullDayRows?: RefundReportRow[];
      previousFullDayDiagnostics?: RefundReportDiagnostics;
      yesterdayFullDayRows?: RefundReportRow[];
      yesterdayFullDayDiagnostics?: RefundReportDiagnostics;
      periods?: {
        current?: { start?: string; end?: string };
        baseline?: { start?: string; end?: string };
        previousFullDay?: { start?: string; end?: string };
        yesterdayFullDay?: { start?: string; end?: string };
      };
    };
    if (!Array.isArray(parsed.rows) || !parsed.diagnostics) {
      throw new Error('Invalid refund report JSON from DataFinder script.');
    }
    return {
      rows: normalizeRows(parsed.rows),
      diagnostics: parsed.diagnostics,
      baselineRows: Array.isArray(parsed.baselineRows) ? normalizeRows(parsed.baselineRows) : undefined,
      baselineDiagnostics: parsed.baselineDiagnostics,
      previousFullDayRows: Array.isArray(parsed.previousFullDayRows) ? normalizeRows(parsed.previousFullDayRows) : undefined,
      previousFullDayDiagnostics: parsed.previousFullDayDiagnostics,
      yesterdayFullDayRows: Array.isArray(parsed.yesterdayFullDayRows) ? normalizeRows(parsed.yesterdayFullDayRows) : undefined,
      yesterdayFullDayDiagnostics: parsed.yesterdayFullDayDiagnostics,
      periods: parseRefundReportPeriods(parsed.periods)
    };
  }
}

export async function sendRefundReportOnce(options: {
  source: RefundReportSource;
  sender: RefundReportCardSender;
  userIds: string[];
  thresholdPercent: number;
  timezone?: string;
  renderMode?: RefundReportConfig['renderMode'];
  llm?: LlmAgent;
  llmOnAnomaly: RefundReportConfig['llmOnAnomaly'];
  now?: Date;
}): Promise<void> {
  let data: RefundReportData;
  let anomalySummary: string | undefined;
  const generatedAt = options.now ?? new Date();
  const timezone = options.timezone ?? DEFAULT_TIMEZONE;
  const expectedPeriods = computeRefundReportPeriods(generatedAt, timezone);
  logger.info('refund_report.periods.expected', formatPeriodLog(expectedPeriods, timezone));

  try {
    data = await options.source.load(generatedAt);
  } catch (error) {
    anomalySummary = await maybeSummarize(options.llm, options.llmOnAnomaly, '退费率播报数据查询失败', String(error));
    await options.sender.sendRefundReportCard(
      options.userIds,
      '退费率播报失败',
      formatFailureMarkdown('退费率播报失败', generatedAt, anomalySummary, error, timezone)
    );
    throw error;
  }

  logger.info('refund_report.periods.actual', {
    ...formatPeriodLog(data.periods ?? expectedPeriods, timezone),
    amountMetric: data.diagnostics.amountMetric,
    currentIncomeGranularity: data.diagnostics.incomeGranularity,
    currentIncomeAmountGranularity: data.diagnostics.incomeAmountGranularity,
    currentIncomeCountGranularity: data.diagnostics.incomeCountGranularity,
    currentC0IncomeGranularity: data.diagnostics.c0IncomeGranularity,
    currentRefundGranularity: data.diagnostics.refundGranularity,
    currentRefundAmountGranularity: data.diagnostics.refundAmountGranularity,
    currentRefundCountGranularity: data.diagnostics.refundCountGranularity,
    baselineIncomeGranularity: data.baselineDiagnostics?.incomeGranularity,
    baselineIncomeAmountGranularity: data.baselineDiagnostics?.incomeAmountGranularity,
    baselineIncomeCountGranularity: data.baselineDiagnostics?.incomeCountGranularity,
    baselineC0IncomeGranularity: data.baselineDiagnostics?.c0IncomeGranularity,
    baselineRefundGranularity: data.baselineDiagnostics?.refundGranularity,
    baselineRefundAmountGranularity: data.baselineDiagnostics?.refundAmountGranularity,
    baselineRefundCountGranularity: data.baselineDiagnostics?.refundCountGranularity,
    previousFullDayIncomeGranularity: data.previousFullDayDiagnostics?.incomeGranularity,
    yesterdayFullDayIncomeGranularity: data.yesterdayFullDayDiagnostics?.incomeGranularity
  });

  if (options.llmOnAnomaly === 'fail_or_threshold' && hasRefundReportAnomaly(data, options.thresholdPercent)) {
    anomalySummary = await maybeSummarize(
      options.llm,
      options.llmOnAnomaly,
      '退费率播报存在异常',
      JSON.stringify({
        thresholdPercent: options.thresholdPercent,
        thresholdMeaning: 'refund-rate period-over-period relative change percent',
        rows: data.rows.slice(0, 10),
        baselineRows: data.baselineRows?.slice(0, 10),
        diagnostics: data.diagnostics
      })
    );
  }

  const markdownOptions = {
    baselineRows: data.baselineRows,
    baselineDiagnostics: data.baselineDiagnostics,
    diagnostics: data.diagnostics,
    anomalySummary,
    thresholdPercent: options.thresholdPercent,
    timezone
  };

  if ((options.renderMode ?? 'markdown') === 'image') {
    try {
      if (!options.sender.sendRefundReportImageCard) {
        throw new Error('Refund report image mode requires sendRefundReportImageCard.');
      }
      const image = await renderRefundReportTablePng(data.rows, generatedAt, {
        baselineRows: data.baselineRows,
        previousFullDayRows: data.previousFullDayRows,
        yesterdayFullDayRows: data.yesterdayFullDayRows,
        thresholdPercent: options.thresholdPercent,
        timezone
      });
      const markdown = formatRefundReportImageCardMarkdown(generatedAt, timezone);
      await options.sender.sendRefundReportImageCard(options.userIds, '退费率播报', markdown, image);
      return;
    } catch (error) {
      logger.error('refund_report.image_send_failed', errorFields(error));
      await options.sender.sendRefundReportCard(
        options.userIds,
        '退费率播报失败',
        formatFailureMarkdown('退费率播报失败', generatedAt, anomalySummary, error, timezone)
      );
      throw error;
    }
  }

  const markdown = formatRefundReportMarkdown(data.rows, generatedAt, markdownOptions);
  await options.sender.sendRefundReportCard(options.userIds, '退费率播报', markdown);
}

export function startHourlyRefundReport(options: {
  source: RefundReportSource;
  sender: RefundReportCardSender;
  userIds: string[];
  thresholdPercent: number;
  timezone?: string;
  renderMode?: RefundReportConfig['renderMode'];
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

function buildMarkdown(
  allRows: RefundReportRow[],
  visibleRows: RefundReportRow[],
  generatedAt: Date,
  options: {
    baselineRows?: RefundReportRow[];
    baselineDiagnostics?: RefundReportDiagnostics;
    diagnostics?: RefundReportDiagnostics;
    anomalySummary?: string;
    thresholdPercent?: number;
    timezone?: string;
    partNo?: number;
    totalParts?: number;
  }
): string {
  const thresholdPercent = options.thresholdPercent ?? 10;
  const summary = summarizeRows(allRows);
  const baselineSummary = options.baselineRows ? summarizeRows(options.baselineRows) : undefined;
  const baselineByCompany = new Map((options.baselineRows ?? []).map((row) => [row.company, row]));
  const reportTitle = options.totalParts && options.totalParts > 1 ? `退费率播报 ${options.partNo}/${options.totalParts}` : '退费率播报';
  const lines = [
    titleHeading(reportTitle),
    timeHeading(`时间: ${formatDateTime(generatedAt, options.timezone ?? DEFAULT_TIMEZONE)}`),
    spacer(),
    sectionHeading('总览'),
    formatMetricLine('退费率', formatRate(summary.refundRate), summary.refundRate, baselineSummary?.refundRate, 'rate'),
    formatMetricLine('退费数', formatCount(summary.refundCount), summary.refundCount, baselineSummary?.refundCount, 'count'),
    formatMetricLine('支付数', formatCount(summary.incomeCount), summary.incomeCount, baselineSummary?.incomeCount, 'count'),
    formatMetricLine('退费金额', formatMoney(summary.refundAmount), summary.refundAmount, baselineSummary?.refundAmount, 'money'),
    formatMetricLine('支付金额', formatMoney(summary.incomeAmount), summary.incomeAmount, baselineSummary?.incomeAmount, 'money')
  ];

  if (visibleRows.length === 0) {
    lines.push(spacer(), sectionHeading('企业明细'), '暂无当日支付或退费数据');
  } else {
    for (const row of visibleRows) {
      const baseline = baselineByCompany.get(row.company);
      lines.push(
        spacer(),
        sectionHeading(row.company),
        formatMetricLine('退费率', formatRate(row.refundRate), row.refundRate, baseline?.refundRate, 'rate'),
        formatMetricLine('退费数', formatCount(row.refundCount), row.refundCount, baseline?.refundCount, 'count'),
        formatMetricLine('支付数', formatCount(row.incomeCount), row.incomeCount, baseline?.incomeCount, 'count'),
        formatMetricLine('退费金额', formatMoney(row.refundAmount), row.refundAmount, baseline?.refundAmount, 'money'),
        formatMetricLine('支付金额', formatMoney(row.incomeAmount), row.incomeAmount, baseline?.incomeAmount, 'money'),
        `关注点：${formatRowAttention(row, baseline, thresholdPercent)}`
      );
    }
  }

  lines.push(
    spacer(),
    sectionHeading('异常总结'),
    ...formatAnomalyLines(
      allRows,
      options.baselineRows,
      options.diagnostics,
      thresholdPercent,
      options.anomalySummary,
      options.baselineDiagnostics
    )
  );
  return lines.join('\n');
}

function formatRefundReportImageCardMarkdown(generatedAt: Date, timezone: string): string {
  return [titleHeading('退费率播报'), timeHeading(`时间: ${formatDateTime(generatedAt, timezone)}`)].join('\n');
}

function summarizeRows(rows: RefundReportRow[]): Omit<RefundReportRow, 'company'> {
  const incomeAmount = roundMoney(rows.reduce((sum, row) => sum + row.incomeAmount, 0));
  const refundAmount = roundMoney(rows.reduce((sum, row) => sum + row.refundAmount, 0));
  const incomeCount = roundCount(rows.reduce((sum, row) => sum + row.incomeCount, 0));
  const refundCount = roundCount(rows.reduce((sum, row) => sum + row.refundCount, 0));
  const c0IncomeAmount = roundMoney(rows.reduce((sum, row) => sum + (row.c0IncomeAmount ?? 0), 0));
  return {
    incomeAmount,
    refundAmount,
    incomeCount,
    refundCount,
    c0IncomeAmount,
    refundRate: incomeAmount > 0 ? (refundAmount / incomeAmount) * 100 : null
  };
}

function formatMetricLine(
  label: string,
  currentText: string,
  currentValue: number | null,
  baselineValue: number | null | undefined,
  kind: 'count' | 'money' | 'rate'
): string {
  return `${label}：${currentText}${formatComparison(currentValue, baselineValue, kind)}`;
}

function formatComparison(
  currentValue: number | null,
  baselineValue: number | null | undefined,
  kind: 'count' | 'money' | 'rate'
): string {
  if (currentValue === null || baselineValue === null || baselineValue === undefined || baselineValue === 0) {
    return '';
  }
  const relative = ((currentValue - baselineValue) / baselineValue) * 100;
  const baselineText = kind === 'money' ? formatMoney(baselineValue) : kind === 'rate' ? formatRate(baselineValue) : formatCount(baselineValue);
  const deltaText = kind === 'rate' ? ` / ${formatSigned(currentValue - baselineValue)}pp` : '';
  return `（${baselineText}，环比：${formatSigned(relative)}%${deltaText}）`;
}

function titleHeading(text: string): string {
  return `<font sizeToken=common_h1_text_style__font_size>**${text}**</font>`;
}

function timeHeading(text: string): string {
  return `<font sizeToken=common_h2_text_style__font_size>**${text}**</font>`;
}

function sectionHeading(text: string): string {
  return `<font sizeToken=common_h3_text_style__font_size>**${text}**</font>`;
}

function spacer(): string {
  return '&nbsp;';
}

function formatSigned(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}

function formatRowAttention(row: RefundReportRow, baseline: RefundReportRow | undefined, thresholdPercent: number): string {
  if (row.incomeAmount === 0 && row.refundAmount > 0) {
    return '支付金额为 0 但产生退费，需优先核查';
  }
  const refundRateChange = refundRateRelativeChange(row, baseline);
  if (refundRateChange !== null && refundRateChange > thresholdPercent) {
    return `退费率环比上升 ${formatSigned(refundRateChange)}%，需关注`;
  }
  if (refundRateChange !== null && refundRateChange <= -thresholdPercent) {
    return `退费率环比下降 ${formatSigned(refundRateChange)}%，需关注`;
  }
  return '无明显异常';
}

function isRefundRateChangeAnomaly(row: RefundReportRow, baseline: RefundReportRow | undefined, thresholdPercent: number): boolean {
  const refundRateChange = refundRateRelativeChange(row, baseline);
  return refundRateChange !== null && (refundRateChange > thresholdPercent || refundRateChange <= -thresholdPercent);
}

function refundRateRelativeChange(row: RefundReportRow, baseline: RefundReportRow | undefined): number | null {
  if (row.refundRate === null || baseline?.refundRate === null || baseline?.refundRate === undefined || baseline.refundRate === 0) {
    return null;
  }
  return ((row.refundRate - baseline.refundRate) / baseline.refundRate) * 100;
}

function formatAnomalyLines(
  rows: RefundReportRow[],
  baselineRows: RefundReportRow[] | undefined,
  diagnostics: RefundReportDiagnostics | undefined,
  thresholdPercent: number,
  anomalySummary: string | undefined,
  baselineDiagnostics: RefundReportDiagnostics | undefined = undefined
): string[] {
  const lines: string[] = [];
  const baselineByCompany = new Map((baselineRows ?? []).map((row) => [row.company, row]));
  for (const row of rows) {
    const attention = formatRowAttention(row, baselineByCompany.get(row.company), thresholdPercent);
    if (attention !== '无明显异常') {
      lines.push(`- ${row.company}：${attention}`);
    }
  }
  if (diagnostics?.incomeTruncated) {
    lines.push('- 支付数据返回被截断，需检查 DataFinder 分页或维度数量');
  }
  if (diagnostics?.refundTruncated) {
    lines.push('- 退费数据返回被截断，需检查 DataFinder 分页或维度数量');
  }
  if ((diagnostics?.incomeBadRows.length ?? 0) > 0) {
    lines.push(`- 支付数据存在 ${diagnostics?.incomeBadRows.length} 条无法解析记录`);
  }
  if ((diagnostics?.refundBadRows.length ?? 0) > 0) {
    lines.push(`- 退费数据存在 ${diagnostics?.refundBadRows.length} 条无法解析记录`);
  }
  if (baselineDiagnostics?.incomeTruncated) {
    lines.push('- 昨日同期支付数据返回被截断，需检查 DataFinder 分页或维度数量');
  }
  if (baselineDiagnostics?.refundTruncated) {
    lines.push('- 昨日同期退费数据返回被截断，需检查 DataFinder 分页或维度数量');
  }
  if ((baselineDiagnostics?.incomeBadRows.length ?? 0) > 0) {
    lines.push(`- 昨日同期支付数据存在 ${baselineDiagnostics?.incomeBadRows.length} 条无法解析记录`);
  }
  if ((baselineDiagnostics?.refundBadRows.length ?? 0) > 0) {
    lines.push(`- 昨日同期退费数据存在 ${baselineDiagnostics?.refundBadRows.length} 条无法解析记录`);
  }
  if (anomalySummary) {
    lines.push(`- AI 说明：${anomalySummary}`);
  }
  return lines.length > 0 ? lines : ['- 暂无'];
}

function compareRefundRows(left: RefundReportRow, right: RefundReportRow): number {
  return (
    right.refundAmount - left.refundAmount ||
    sortRate(right) - sortRate(left) ||
    left.company.localeCompare(right.company, 'zh-Hans-CN')
  );
}

function sortRate(row: RefundReportRow): number {
  return row.refundRate ?? Number.POSITIVE_INFINITY;
}

function normalizeRows(rows: RefundReportRow[]): RefundReportRow[] {
  return rows.map((row) => ({
    company: row.company,
    incomeAmount: roundMoney(row.incomeAmount),
    refundAmount: roundMoney(row.refundAmount),
    incomeCount: roundCount(row.incomeCount ?? 0),
    refundCount: roundCount(row.refundCount ?? 0),
    c0IncomeAmount: roundMoney(row.c0IncomeAmount ?? 0),
    refundRate: row.refundRate
  }));
}

function parseRefundReportPeriods(periods: {
  current?: { start?: string; end?: string };
  baseline?: { start?: string; end?: string };
  previousFullDay?: { start?: string; end?: string };
  yesterdayFullDay?: { start?: string; end?: string };
} | undefined): RefundReportPeriods | undefined {
  if (!periods?.current?.start || !periods.current.end || !periods.baseline?.start || !periods.baseline.end) {
    return undefined;
  }
  return {
    current: { start: new Date(periods.current.start), end: new Date(periods.current.end) },
    baseline: { start: new Date(periods.baseline.start), end: new Date(periods.baseline.end) },
    previousFullDay:
      periods.previousFullDay?.start && periods.previousFullDay.end
        ? { start: new Date(periods.previousFullDay.start), end: new Date(periods.previousFullDay.end) }
        : undefined,
    yesterdayFullDay:
      periods.yesterdayFullDay?.start && periods.yesterdayFullDay.end
        ? { start: new Date(periods.yesterdayFullDay.start), end: new Date(periods.yesterdayFullDay.end) }
        : undefined
  };
}

function formatPeriodLog(periods: RefundReportPeriods, timezone: string): Record<string, string> {
  return {
    windowMode: getDateTimeParts(periods.current.end, timezone).hour === '00' ? 'midnight_full_day' : 'same_hour',
    timezone,
    currentStart: formatDateTime(periods.current.start, timezone),
    currentEnd: formatDateTime(periods.current.end, timezone),
    baselineStart: formatDateTime(periods.baseline.start, timezone),
    baselineEnd: formatDateTime(periods.baseline.end, timezone),
    previousFullDayStart: periods.previousFullDay ? formatDateTime(periods.previousFullDay.start, timezone) : '',
    previousFullDayEnd: periods.previousFullDay ? formatDateTime(periods.previousFullDay.end, timezone) : '',
    yesterdayFullDayStart: periods.yesterdayFullDay ? formatDateTime(periods.yesterdayFullDay.start, timezone) : '',
    yesterdayFullDayEnd: periods.yesterdayFullDay ? formatDateTime(periods.yesterdayFullDay.end, timezone) : ''
  };
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCount(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatRate(value: number | null): string {
  return value === null ? '无法计算' : `${value.toFixed(2)}%`;
}

function formatDateTime(date: Date, timezone: string): string {
  const parts = getDateTimeParts(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function getDateTimeParts(date: Date, timezone: string): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
} {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const hour = pick('hour') === '24' ? '00' : pick('hour');
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour,
    minute: pick('minute'),
    second: pick('second')
  };
}

function zonedDate(year: string, month: string, day: string, hour: string | number, timezone: string): Date {
  const hourText = String(hour).padStart(2, '0');
  if (timezone === DEFAULT_TIMEZONE) {
    return new Date(`${year}-${month}-${day}T${hourText}:00:00+08:00`);
  }
  return new Date(`${year}-${month}-${day}T${hourText}:00:00`);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundCount(value: number): number {
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

function formatFailureMarkdown(
  title: string,
  generatedAt: Date,
  anomalySummary: string | undefined,
  error: unknown,
  timezone: string
): string {
  return [titleHeading(title), timeHeading(`时间: ${formatDateTime(generatedAt, timezone)}`), spacer(), anomalySummary ?? String(error)].join('\n');
}
