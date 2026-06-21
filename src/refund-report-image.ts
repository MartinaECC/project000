import sharp from 'sharp';
import type { RefundReportRow } from './refund-report.ts';

export type RefundReportImageCell = {
  text: string;
  tone?: 'warning' | 'good' | 'attention';
};

export type RefundReportImageTableRow = {
  company: string;
  refundRate: RefundReportImageCell;
  netIncomeAmount: RefundReportImageCell;
  incomeAmount: RefundReportImageCell;
  incomeCount: RefundReportImageCell;
  c0IncomeAmount: RefundReportImageCell;
  refundAmount: RefundReportImageCell;
  refundCount: RefundReportImageCell;
};

export type RefundReportImageTable = {
  columns: string[];
  rows: RefundReportImageTableRow[];
};

const COLUMNS = ['企业名称', '退费率', '退费后金额', '支付金额', '支付数', 'c0收入', '退费金额', '退费数'];
const COLUMN_WIDTHS = [240, 300, 320, 320, 220, 320, 320, 220];
const TABLE_WIDTH = COLUMN_WIDTHS.reduce((sum, width) => sum + width, 0);
const PADDING_X = 36;
const HEADER_HEIGHT = 154;
const TABLE_TOP = 188;
const ROW_HEIGHT = 116;
const FONT_FAMILY = 'Microsoft YaHei, Arial, sans-serif';
const CURRENT_DAY_METHODOLOGY_NOTE =
  '口径说明：数据统计范围为今日 00:00 至当前整点；括号内依次为昨日同整点值、环比变化，退费率另展示百分点差异（pp）。';
const MIDNIGHT_METHODOLOGY_NOTE =
  '口径说明：数据统计范围为昨日全天；括号内依次为前日全天值、环比变化，退费率另展示百分点差异（pp）。';
const TABLE_HEADER_FILL = '#B5C6EA';
const TABLE_HEADER_TEXT_FILL = '#111827';

export function buildRefundReportImageTable(
  rows: RefundReportRow[],
  options: {
    baselineRows?: RefundReportRow[];
    previousFullDayRows?: RefundReportRow[];
    yesterdayFullDayRows?: RefundReportRow[];
    thresholdPercent?: number;
  } = {}
): RefundReportImageTable {
  const baselineByCompany = new Map((options.baselineRows ?? []).map((row) => [row.company, row]));
  const previousFullDayByCompany = new Map((options.previousFullDayRows ?? []).map((row) => [row.company, row]));
  const yesterdayFullDayByCompany = new Map((options.yesterdayFullDayRows ?? []).map((row) => [row.company, row]));
  const sortedRows = [...rows].sort(compareNetIncomeRows);

  const tableRows = [buildTotalRow(rows), ...sortedRows].map((row) => {
    const baseline = row.company === '总计' ? summarizeRows(options.baselineRows ?? []) : baselineByCompany.get(row.company);
    const previousFullDay = row.company === '总计' ? summarizeRows(options.previousFullDayRows ?? []) : previousFullDayByCompany.get(row.company);
    const yesterdayFullDay = row.company === '总计' ? summarizeRows(options.yesterdayFullDayRows ?? []) : yesterdayFullDayByCompany.get(row.company);
    const relativeRateChange = refundRateRelativeChange(row, baseline);
    const netIncomeAmount = netIncome(row);
    const baselineNetIncomeAmount = baseline ? netIncome(baseline) : undefined;
    const previousFullDayNetIncomeAmount = previousFullDay ? netIncome(previousFullDay) : undefined;
    const yesterdayFullDayNetIncomeAmount = yesterdayFullDay ? netIncome(yesterdayFullDay) : undefined;

    return {
      company: row.company,
      refundRate: {
        text: formatMetricCell(
          formatRate(row.refundRate),
          row.refundRate,
          baseline?.refundRate,
          previousFullDay?.refundRate,
          yesterdayFullDay?.refundRate,
          'rate'
        ),
        tone:
          row.incomeAmount === 0 && row.refundAmount > 0
            ? 'attention'
            : relativeRateChange !== null && relativeRateChange > (options.thresholdPercent ?? 10)
              ? 'warning'
              : relativeRateChange !== null && relativeRateChange <= -(options.thresholdPercent ?? 10)
                ? 'good'
                : undefined
      },
      netIncomeAmount: {
        text: formatMetricCell(
          formatMoney(netIncomeAmount),
          netIncomeAmount,
          baselineNetIncomeAmount,
          previousFullDayNetIncomeAmount,
          yesterdayFullDayNetIncomeAmount,
          'money'
        )
      },
      incomeAmount: {
        text: formatMetricCell(
          formatMoney(row.incomeAmount),
          row.incomeAmount,
          baseline?.incomeAmount,
          previousFullDay?.incomeAmount,
          yesterdayFullDay?.incomeAmount,
          'money'
        )
      },
      incomeCount: {
        text: formatMetricCell(
          formatCount(row.incomeCount),
          row.incomeCount,
          baseline?.incomeCount,
          previousFullDay?.incomeCount,
          yesterdayFullDay?.incomeCount,
          'count'
        )
      },
      c0IncomeAmount: {
        text: formatMetricCell(
          formatMoney(row.c0IncomeAmount ?? 0),
          row.c0IncomeAmount ?? 0,
          baseline?.c0IncomeAmount ?? 0,
          previousFullDay?.c0IncomeAmount,
          yesterdayFullDay?.c0IncomeAmount,
          'money'
        )
      },
      refundAmount: {
        text: formatMetricCell(
          formatMoney(row.refundAmount),
          row.refundAmount,
          baseline?.refundAmount,
          previousFullDay?.refundAmount,
          yesterdayFullDay?.refundAmount,
          'money'
        )
      },
      refundCount: {
        text: formatMetricCell(
          formatCount(row.refundCount),
          row.refundCount,
          baseline?.refundCount,
          previousFullDay?.refundCount,
          yesterdayFullDay?.refundCount,
          'count'
        )
      }
    };
  });

  return {
    columns: COLUMNS,
    rows: tableRows
  };
}

export async function renderRefundReportTablePng(
  rows: RefundReportRow[],
  generatedAt: Date,
  options: {
    baselineRows?: RefundReportRow[];
    previousFullDayRows?: RefundReportRow[];
    yesterdayFullDayRows?: RefundReportRow[];
    thresholdPercent?: number;
    timezone?: string;
  } = {}
): Promise<Buffer> {
  const table = buildRefundReportImageTable(rows, options);
  const svg = buildRefundReportTableSvg(table, generatedAt, options.timezone ?? 'Asia/Shanghai');
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export function buildRefundReportTableSvg(
  table: RefundReportImageTable,
  generatedAt: Date,
  timezone = 'Asia/Shanghai'
): string {
  const width = TABLE_WIDTH + PADDING_X * 2;
  const height = TABLE_TOP + ROW_HEIGHT * (table.rows.length + 1) + 36;
  const columnStarts = COLUMN_WIDTHS.reduce<number[]>((starts, width, index) => {
    starts.push(index === 0 ? PADDING_X : starts[index - 1] + COLUMN_WIDTHS[index - 1]);
    return starts;
  }, []);

  const headerCells = table.columns
    .map((column, index) => {
      const x = columnStarts[index];
      return [
        `<rect x="${x}" y="${TABLE_TOP}" width="${COLUMN_WIDTHS[index]}" height="${ROW_HEIGHT}" fill="${TABLE_HEADER_FILL}"/>`,
        text(column, x + COLUMN_WIDTHS[index] / 2, TABLE_TOP + 62, {
          size: 24,
          weight: 700,
          fill: TABLE_HEADER_TEXT_FILL,
          anchor: 'middle'
        })
      ].join('');
    })
    .join('');

  const rowsSvg = table.rows
    .map((row, rowIndex) => {
      const y = TABLE_TOP + ROW_HEIGHT * (rowIndex + 1);
      const fill = rowIndex === 0 ? '#eef6ff' : rowIndex % 2 === 0 ? '#ffffff' : '#f7f7f8';
      const cells = [
        { value: row.company, tone: undefined },
        row.refundRate,
        row.netIncomeAmount,
        row.incomeAmount,
        row.incomeCount,
        row.c0IncomeAmount,
        row.refundAmount,
        row.refundCount
      ];
      return cells
        .map((cell, cellIndex) => {
          const x = columnStarts[cellIndex];
          const clipId = `cell-${rowIndex}-${cellIndex}-clip`;
          const bg = cell.tone === 'warning' ? '#fde2e2' : cell.tone === 'good' ? '#c9f2ce' : cell.tone === 'attention' ? '#fff1b8' : fill;
          const textValue = cell.value ?? cell.text;
          return [
            `<rect x="${x}" y="${y}" width="${COLUMN_WIDTHS[cellIndex]}" height="${ROW_HEIGHT}" fill="${bg}"/>`,
            `<line x1="${x + COLUMN_WIDTHS[cellIndex]}" y1="${y}" x2="${x + COLUMN_WIDTHS[cellIndex]}" y2="${y + ROW_HEIGHT}" stroke="#e5e7eb"/>`,
            `<clipPath id="${clipId}"><rect x="${x + 8}" y="${y + 4}" width="${COLUMN_WIDTHS[cellIndex] - 16}" height="${ROW_HEIGHT - 8}"/></clipPath>`,
            cellIndex === 0
              ? text(fitText(textValue, COLUMN_WIDTHS[cellIndex], 15), x + COLUMN_WIDTHS[cellIndex] / 2, y + 68, {
                  size: rowIndex === 0 ? 23 : 22,
                  weight: 700,
                  fill: '#111827',
                  anchor: 'middle',
                  clipId
                })
              : metricText(textValue, x + COLUMN_WIDTHS[cellIndex] / 2, y + 34, COLUMN_WIDTHS[cellIndex], {
                  primarySize: rowIndex === 0 ? 22 : 21,
                  secondarySize: rowIndex === 0 ? 17 : 16,
                  referenceSize: rowIndex === 0 ? 15 : 14,
                  weight: rowIndex === 0 ? 700 : 500,
                  clipId
                })
          ].join('');
        })
        .join('');
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#ffffff"/>
${text('退费率播报', PADDING_X, 54, { size: 34, weight: 800, fill: '#111827' })}
${text(`时间: ${formatDateTime(generatedAt, timezone)}`, PADDING_X, 98, { size: 24, weight: 600, fill: '#374151' })}
${text(fitText(methodologyNote(generatedAt, timezone), TABLE_WIDTH, 12), PADDING_X, 133, { size: 21, weight: 500, fill: '#4b5563' })}
<rect x="${PADDING_X}" y="${HEADER_HEIGHT}" width="${TABLE_WIDTH}" height="1" fill="#d1d5db"/>
${headerCells}
${rowsSvg}
</svg>`;
}

function buildTotalRow(rows: RefundReportRow[]): RefundReportRow {
  return { company: '总计', ...summarizeRows(rows) };
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

function compareNetIncomeRows(left: RefundReportRow, right: RefundReportRow): number {
  return netIncome(right) - netIncome(left) || left.company.localeCompare(right.company, 'zh-Hans-CN');
}

function netIncome(row: RefundReportRow): number {
  return roundMoney(row.incomeAmount - row.refundAmount);
}

function formatMetricCell(
  currentText: string,
  currentValue: number | null,
  baselineValue: number | null | undefined,
  previousFullDayValue: number | null | undefined,
  yesterdayFullDayValue: number | null | undefined,
  kind: 'count' | 'money' | 'rate'
): string {
  const lines = [currentText];
  if (!(currentValue === null || baselineValue === null || baselineValue === undefined || baselineValue === 0)) {
    const relative = ((currentValue - baselineValue) / baselineValue) * 100;
    const baselineText = formatMetricValue(baselineValue, kind);
    const deltaText = kind === 'rate' ? ` / ${formatSigned(currentValue - baselineValue)}pp` : '';
    lines.push(`(${baselineText}，${formatSigned(relative)}%${deltaText})`);
  }
  const referenceText = formatFullDayReference(previousFullDayValue, yesterdayFullDayValue, kind);
  if (referenceText) {
    lines.push(referenceText);
  }
  return lines.join('\n');
}

function formatFullDayReference(
  previousFullDayValue: number | null | undefined,
  yesterdayFullDayValue: number | null | undefined,
  kind: 'count' | 'money' | 'rate'
): string | undefined {
  const previousText = previousFullDayValue === null || previousFullDayValue === undefined ? undefined : `前日 ${formatMetricValue(previousFullDayValue, kind)}`;
  const yesterdayText = yesterdayFullDayValue === null || yesterdayFullDayValue === undefined ? undefined : `昨日 ${formatMetricValue(yesterdayFullDayValue, kind)}`;
  return [previousText, yesterdayText].filter(Boolean).join('｜') || undefined;
}

function formatMetricValue(value: number, kind: 'count' | 'money' | 'rate'): string {
  return kind === 'money' ? formatMoney(value) : kind === 'rate' ? formatRate(value) : formatCount(value);
}

function refundRateRelativeChange(row: RefundReportRow, baseline: RefundReportRow | undefined): number | null {
  if (row.refundRate === null || baseline?.refundRate === null || baseline?.refundRate === undefined || baseline.refundRate === 0) {
    return null;
  }
  return ((row.refundRate - baseline.refundRate) / baseline.refundRate) * 100;
}

function text(
  value: string,
  x: number,
  y: number,
  options: { size: number; weight: number; fill: string; anchor?: 'start' | 'middle'; clipId?: string }
): string {
  const clip = options.clipId ? ` clip-path="url(#${options.clipId})"` : '';
  return `<text x="${x}" y="${y}" font-family="${FONT_FAMILY}" font-size="${options.size}" font-weight="${options.weight}" fill="${options.fill}" text-anchor="${options.anchor ?? 'start'}"${clip}>${escapeXml(value)}</text>`;
}

function metricText(
  value: string,
  x: number,
  y: number,
  columnWidth: number,
  options: { primarySize: number; secondarySize: number; referenceSize: number; weight: number; clipId: string }
): string {
  const [primary, secondary, reference] = splitMetricText(value);
  const secondaryLine = secondary
    ? `<tspan x="${x}" dy="24" font-size="${options.secondarySize}" fill="#374151">${escapeXml(fitText(secondary, columnWidth, 9))}</tspan>`
    : '';
  const referenceLine = reference
    ? `<tspan x="${x}" dy="22" font-size="${options.referenceSize}" fill="#6b7280">${escapeXml(fitText(reference, columnWidth, 8))}</tspan>`
    : '';
  return `<text x="${x}" y="${y}" font-family="${FONT_FAMILY}" font-size="${options.primarySize}" font-weight="${options.weight}" fill="#111827" text-anchor="middle" clip-path="url(#${options.clipId})"><tspan x="${x}" dy="0">${escapeXml(fitText(primary, columnWidth, 12))}</tspan>${secondaryLine}${referenceLine}</text>`;
}

function splitMetricText(value: string): [string, string | undefined, string | undefined] {
  const lines = value.split('\n');
  return [lines[0] ?? '', lines[1], lines[2]];
}

function fitText(value: string, columnWidth: number, pxPerChar: number): string {
  const maxChars = Math.max(6, Math.floor((columnWidth - 20) / pxPerChar));
  return value.length > maxChars ? `${value.slice(0, maxChars - 1)}…` : value;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
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

function methodologyNote(date: Date, timezone: string): string {
  return getDateTimeParts(date, timezone).hour === '00' ? MIDNIGHT_METHODOLOGY_NOTE : CURRENT_DAY_METHODOLOGY_NOTE;
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

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundCount(value: number): number {
  return Math.round(value * 100) / 100;
}

function formatSigned(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
}
