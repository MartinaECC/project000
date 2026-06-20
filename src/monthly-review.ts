export const DEFAULT_MONTHLY_REVIEW_DOC_TOKEN = process.env.MONTHLY_REVIEW_DOC_TOKEN ?? '';

export type MonthPeriod = {
  start: string;
  end: string;
  label: string;
  days: number;
};

export type MonthlyComparisonPeriods = {
  target: MonthPeriod;
  comparison: MonthPeriod;
};

export type MonthlyReviewRawData = {
  grossIncome?: number;
  refundAmount?: number;
  activeIncome?: number;
  activeRefundAmount?: number;
  renewalIncome?: number;
  renewalRefundAmount?: number;
  signups?: number;
  cancellations?: number;
  chargeAttempts?: number;
  chargeSuccesses?: number;
  reportViews?: number;
  reportEligibleUsers?: number;
  addOnIncome?: number;
  addOnRefundAmount?: number;
  complaints?: number;
  totalOrders?: number;
};

export type MonthlyReviewMetric = {
  value: number | null;
  comparisonValue: number | null;
  changePercent: number | null;
};

export type MonthlyReview = {
  companyShortName: string;
  docToken: string;
  periods: MonthlyComparisonPeriods;
  grossIncome: MonthlyReviewMetric;
  netIncome: MonthlyReviewMetric;
  dailyNetIncome: MonthlyReviewMetric;
  activeNetIncome: MonthlyReviewMetric;
  renewalNetIncome: MonthlyReviewMetric;
  refundRate: MonthlyReviewMetric;
  cancellationRate: MonthlyReviewMetric;
  chargeSuccessRate: MonthlyReviewMetric;
  reportViewRate: MonthlyReviewMetric;
  addOnNetIncome: MonthlyReviewMetric;
  complaintRate: MonthlyReviewMetric;
  missingSections: string[];
};

export type BuildMonthlyReviewInput = {
  companyShortName: string;
  periods: MonthlyComparisonPeriods;
  target: MonthlyReviewRawData;
  comparison: MonthlyReviewRawData;
  docToken?: string;
  missingSections?: string[];
};

export type DataFinderFilter = {
  field: string;
  operator: 'eq' | 'gt' | 'is_null';
  value?: string | number;
};

export type DataFinderQuerySpec = {
  metric: keyof MonthlyReviewRawData;
  period: 'target' | 'comparison';
  start: string;
  end: string;
  eventName: string;
  valueField?: string;
  indicator: 'pv' | 'sum';
  groupBy?: string[];
  selectGroup?: string;
  filters: DataFinderFilter[];
  filterLogic?: 'AND' | 'OR' | 'AND_OR_TAIL';
};

export type DataFinderMonthlyQueryPlan = {
  companyShortName: string;
  companyField: string;
  target: MonthPeriod;
  comparison: MonthPeriod;
  queries: DataFinderQuerySpec[];
};

export type BuildDataFinderMonthlyQueryPlanInput = {
  companyShortName: string;
  periods: MonthlyComparisonPeriods;
  companyField?: string;
};

export type LarkDocAppender = {
  appendXml(docToken: string, content: string): Promise<void>;
};

export type MonthlyReviewLoadedData = {
  target: MonthlyReviewRawData;
  comparison: MonthlyReviewRawData;
  missingSections?: string[];
};

export type MonthlyReviewSource = {
  load(periods: MonthlyComparisonPeriods, companyShortName: string): Promise<MonthlyReviewLoadedData>;
};

export type MonthlyReviewWriter = {
  write(content: string): Promise<void>;
};

export function monthlyComparisonPeriods(now = new Date(), targetMonth?: string): MonthlyComparisonPeriods {
  const targetBase = targetMonth ? parseMonth(targetMonth) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const comparisonBase = new Date(targetBase.getFullYear(), targetBase.getMonth() - 1, 1);
  return {
    target: monthPeriod(targetBase),
    comparison: monthPeriod(comparisonBase)
  };
}

export function percentChange(value: number | null | undefined, comparisonValue: number | null | undefined): number | null {
  if (!isFiniteNumber(value) || !isFiniteNumber(comparisonValue) || comparisonValue === 0) {
    return null;
  }
  return ((value - comparisonValue) / comparisonValue) * 100;
}

export function buildMonthlyReview(input: BuildMonthlyReviewInput): MonthlyReview {
  const target = normalizeRawData(input.target);
  const comparison = normalizeRawData(input.comparison);

  const targetNetIncome = subtract(target.grossIncome, target.refundAmount);
  const comparisonNetIncome = subtract(comparison.grossIncome, comparison.refundAmount);
  const targetActiveNetIncome = subtract(target.activeIncome, target.activeRefundAmount);
  const comparisonActiveNetIncome = subtract(comparison.activeIncome, comparison.activeRefundAmount);
  const targetRenewalNetIncome = subtract(target.renewalIncome, target.renewalRefundAmount);
  const comparisonRenewalNetIncome = subtract(comparison.renewalIncome, comparison.renewalRefundAmount);
  const targetAddOnNetIncome = subtract(target.addOnIncome, target.addOnRefundAmount);
  const comparisonAddOnNetIncome = subtract(comparison.addOnIncome, comparison.addOnRefundAmount);

  return {
    companyShortName: input.companyShortName,
    docToken: input.docToken ?? DEFAULT_MONTHLY_REVIEW_DOC_TOKEN,
    periods: input.periods,
    grossIncome: metric(target.grossIncome, comparison.grossIncome),
    netIncome: metric(targetNetIncome, comparisonNetIncome),
    dailyNetIncome: metric(divide(targetNetIncome, input.periods.target.days), divide(comparisonNetIncome, input.periods.comparison.days)),
    activeNetIncome: metric(targetActiveNetIncome, comparisonActiveNetIncome),
    renewalNetIncome: metric(targetRenewalNetIncome, comparisonRenewalNetIncome),
    refundRate: metric(rate(target.refundAmount, target.grossIncome), rate(comparison.refundAmount, comparison.grossIncome)),
    cancellationRate: metric(rate(target.cancellations, target.signups), rate(comparison.cancellations, comparison.signups)),
    chargeSuccessRate: metric(rate(target.chargeSuccesses, target.chargeAttempts), rate(comparison.chargeSuccesses, comparison.chargeAttempts)),
    reportViewRate: metric(rate(target.reportViews, target.reportEligibleUsers), rate(comparison.reportViews, comparison.reportEligibleUsers)),
    addOnNetIncome: metric(targetAddOnNetIncome, comparisonAddOnNetIncome),
    complaintRate: metric(rate(target.complaints, target.totalOrders), rate(comparison.complaints, comparison.totalOrders)),
    missingSections: input.missingSections ?? inferMissingSections(input.target, input.comparison)
  };
}

export function buildMonthlyReviewDocXml(review: MonthlyReview): string {
  const monthNo = Number(review.periods.target.start.slice(5, 7));
  return [
    `<h1>${escapeXml(review.companyShortName)}${escapeXml(review.periods.target.label)}运营复盘初稿</h1>`,
    `<p>统计周期：${escapeXml(review.periods.target.start)} 至 ${escapeXml(review.periods.target.end)}；环比周期：${escapeXml(review.periods.comparison.start)} 至 ${escapeXml(review.periods.comparison.end)}。所有环比均按自然月计算。</p>`,
    '<h1>规则调整总览</h1>',
    missingParagraph(review, 'rules', '规则调整、账期变化、扣款策略等需人工补充。'),
    '<h1>收入表现</h1>',
    `<ul><li>${monthNo}月总收入 ${formatNumber(review.grossIncome.value)}，环比 ${formatPercent(review.grossIncome.changePercent)}。</li><li>${monthNo}月退费后收入 ${formatNumber(review.netIncome.value)}，环比 ${formatPercent(review.netIncome.changePercent)}；退费后日均收入 ${formatNumber(review.dailyNetIncome.value)}，环比 ${formatPercent(review.dailyNetIncome.changePercent)}。</li><li>${monthNo}月主动退费后收入 ${formatNumber(review.activeNetIncome.value)}，环比 ${formatPercent(review.activeNetIncome.changePercent)}。</li><li>${monthNo}月续费退费后收入 ${formatNumber(review.renewalNetIncome.value)}，环比 ${formatPercent(review.renewalNetIncome.changePercent)}。</li></ul>`,
    '<h1>退费和客诉表现</h1>',
    `<ul><li>${monthNo}月整体退费率 ${formatPercent(review.refundRate.value)}，环比 ${formatPercent(review.refundRate.changePercent)}。</li><li>${hasMissing(review, 'complaints') ? '客诉数据待补充：需确认外诉、内诉、完结率及平台拆分口径。' : `客诉率 ${formatPercent(review.complaintRate.value)}，环比 ${formatPercent(review.complaintRate.changePercent)}。`}</li></ul>`,
    '<h1>续费表现</h1>',
    `<ul><li>解约率 ${formatPercent(review.cancellationRate.value)}，环比 ${formatPercent(review.cancellationRate.changePercent)}。</li><li>扣款成功率 ${formatPercent(review.chargeSuccessRate.value)}，环比 ${formatPercent(review.chargeSuccessRate.changePercent)}。</li></ul>`,
    '<h1>报告查看率</h1>',
    hasMissing(review, 'reportViews')
      ? '<p>报告查看率数据待补充：需确认报告查看事件、可查看用户分母及企业简称过滤口径。</p>'
      : `<p>${monthNo}月报告查看率 ${formatPercent(review.reportViewRate.value)}，环比 ${formatPercent(review.reportViewRate.changePercent)}。</p>`,
    '<h1>加购数据表现</h1>',
    hasMissing(review, 'addOns')
      ? '<p>加购数据待补充：需确认加购事件、品类字段、收入和退费字段。</p>'
      : `<p>${monthNo}月加购退费后收入 ${formatNumber(review.addOnNetIncome.value)}，环比 ${formatPercent(review.addOnNetIncome.changePercent)}。</p>`,
    '<h1>下月重点推进工作</h1>',
    '<ul><li>待确认：结合规则调整、客诉风险、扣款成功率和报告查看率变化，补充下月优先级。</li><li>建议关注：退费率上升、扣款成功率下降、报告查看率下降、加购收入占比偏低等异常项。</li></ul>'
  ].join('\n\n');
}

export function buildDataFinderMonthlyQueryPlan(input: BuildDataFinderMonthlyQueryPlanInput): DataFinderMonthlyQueryPlan {
  const companyField = input.companyField ?? '$_vp_alis_name';
  const periods = [
    ['target', input.periods.target],
    ['comparison', input.periods.comparison]
  ] as const;
  const queries: DataFinderQuerySpec[] = [];

  for (const [period, range] of periods) {
    queries.push(
      amountQuery('grossIncome', period, range, 'order_suc_back', companyField, input.companyShortName),
      amountQuery('refundAmount', period, range, 'refund_back', companyField, input.companyShortName),
      amountQuery('activeIncome', period, range, 'order_suc_back', companyField, input.companyShortName, [
        { field: 'cycle', operator: 'is_null' },
        { field: 'cycle', operator: 'eq', value: 0 }
      ], 'AND_OR_TAIL'),
      amountQuery('activeRefundAmount', period, range, 'refund_back', companyField, input.companyShortName, [
        { field: 'cycle', operator: 'is_null' },
        { field: 'cycle', operator: 'eq', value: 0 }
      ], 'AND_OR_TAIL'),
      amountQuery('renewalIncome', period, range, 'order_suc_back', companyField, input.companyShortName, [
        { field: 'cycle', operator: 'gt', value: 0 }
      ]),
      amountQuery('renewalRefundAmount', period, range, 'refund_back', companyField, input.companyShortName, [
        { field: 'cycle', operator: 'gt', value: 0 }
      ]),
      countQuery('signups', period, range, 'renew_plan_back', companyField, input.companyShortName),
      countQuery('cancellations', period, range, 'renew_cancel_back', companyField, input.companyShortName),
      countQuery('chargeAttempts', period, range, 'renew_plan_back', companyField, input.companyShortName),
      countQuery('chargeSuccesses', period, range, 'order_suc_back', companyField, input.companyShortName),
      countQuery('complaints', period, range, 'alipay_complaint_back', companyField, input.companyShortName)
    );
  }

  return {
    companyShortName: input.companyShortName,
    companyField,
    target: input.periods.target,
    comparison: input.periods.comparison,
    queries
  };
}

export class LarkMonthlyReviewWriter {
  readonly #appender: LarkDocAppender;
  readonly #docToken: string;

  constructor(appender: LarkDocAppender, docToken = DEFAULT_MONTHLY_REVIEW_DOC_TOKEN) {
    this.#appender = appender;
    this.#docToken = docToken;
  }

  async write(content: string): Promise<void> {
    await this.#appender.appendXml(this.#docToken, content);
  }
}

export async function generateAndWriteMonthlyReview(options: {
  companyShortName: string;
  source: MonthlyReviewSource;
  writer: MonthlyReviewWriter;
  now?: Date;
  targetMonth?: string;
  docToken?: string;
}): Promise<MonthlyReview> {
  const periods = monthlyComparisonPeriods(options.now ?? new Date(), options.targetMonth);
  const data = await options.source.load(periods, options.companyShortName);
  const review = buildMonthlyReview({
    companyShortName: options.companyShortName,
    periods,
    target: data.target,
    comparison: data.comparison,
    missingSections: data.missingSections,
    docToken: options.docToken
  });
  await options.writer.write(buildMonthlyReviewDocXml(review));
  return review;
}

function parseMonth(month: string): Date {
  const match = /^(\d{4})-(\d{2})$/u.exec(month);
  if (!match) {
    throw new Error('targetMonth must be YYYY-MM.');
  }
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    throw new Error('targetMonth month must be between 01 and 12.');
  }
  return new Date(year, monthIndex, 1);
}

function monthPeriod(date: Date): MonthPeriod {
  const year = date.getFullYear();
  const monthIndex = date.getMonth();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  return {
    start: `${year}-${pad2(monthIndex + 1)}-01`,
    end: `${year}-${pad2(monthIndex + 1)}-${pad2(days)}`,
    label: `${year}年${pad2(monthIndex + 1)}月`,
    days
  };
}

function amountQuery(
  metricName: keyof MonthlyReviewRawData,
  period: 'target' | 'comparison',
  range: MonthPeriod,
  eventName: string,
  companyField: string,
  companyShortName: string,
  extraFilters: DataFinderFilter[] = [],
  filterLogic: DataFinderQuerySpec['filterLogic'] = 'AND'
): DataFinderQuerySpec {
  const companySelector = companySelection(companyField, companyShortName);
  return {
    metric: metricName,
    period,
    start: range.start,
    end: range.end,
    eventName,
    valueField: 'amount',
    indicator: 'sum',
    groupBy: companySelector.groupBy,
    selectGroup: companySelector.selectGroup,
    filters: [...companySelector.filters, ...extraFilters],
    filterLogic
  };
}

function countQuery(
  metricName: keyof MonthlyReviewRawData,
  period: 'target' | 'comparison',
  range: MonthPeriod,
  eventName: string,
  companyField: string,
  companyShortName: string
): DataFinderQuerySpec {
  const companySelector = companySelection(companyField, companyShortName);
  return {
    metric: metricName,
    period,
    start: range.start,
    end: range.end,
    eventName,
    indicator: 'pv',
    groupBy: companySelector.groupBy,
    selectGroup: companySelector.selectGroup,
    filters: companySelector.filters,
    filterLogic: 'AND'
  };
}

function companySelection(companyField: string, companyShortName: string): { groupBy?: string[]; selectGroup?: string; filters: DataFinderFilter[] } {
  if (companyField.startsWith('$_vp_')) {
    return { groupBy: [companyField], selectGroup: companyShortName, filters: [] };
  }
  return { filters: [{ field: companyField, operator: 'eq', value: companyShortName }] };
}

function normalizeRawData(data: MonthlyReviewRawData): MonthlyReviewRawData {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, isFiniteNumber(value) ? value : undefined]));
}

function metric(value: number | null | undefined, comparisonValue: number | null | undefined): MonthlyReviewMetric {
  const normalizedValue = isFiniteNumber(value) ? value : null;
  const normalizedComparison = isFiniteNumber(comparisonValue) ? comparisonValue : null;
  return {
    value: normalizedValue,
    comparisonValue: normalizedComparison,
    changePercent: percentChange(normalizedValue, normalizedComparison)
  };
}

function subtract(value: number | null | undefined, subtractBy: number | null | undefined): number | null {
  if (!isFiniteNumber(value)) {
    return null;
  }
  return value - (isFiniteNumber(subtractBy) ? subtractBy : 0);
}

function divide(value: number | null | undefined, divisor: number): number | null {
  return isFiniteNumber(value) && divisor > 0 ? value / divisor : null;
}

function rate(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (!isFiniteNumber(numerator) || !isFiniteNumber(denominator) || denominator === 0) {
    return null;
  }
  return (numerator / denominator) * 100;
}

function inferMissingSections(target: MonthlyReviewRawData, comparison: MonthlyReviewRawData): string[] {
  const missing: string[] = ['rules'];
  if (!isFiniteNumber(target.complaints) || !isFiniteNumber(comparison.complaints) || !isFiniteNumber(target.totalOrders)) {
    missing.push('complaints');
  }
  if (!isFiniteNumber(target.reportViews) || !isFiniteNumber(target.reportEligibleUsers)) {
    missing.push('reportViews');
  }
  if (!isFiniteNumber(target.addOnIncome) || !isFiniteNumber(comparison.addOnIncome)) {
    missing.push('addOns');
  }
  return missing;
}

function missingParagraph(review: MonthlyReview, key: string, text: string): string {
  return hasMissing(review, key) ? `<p>待补充：${escapeXml(text)}</p>` : '<p>本月规则调整已确认。</p>';
}

function hasMissing(review: MonthlyReview, key: string): boolean {
  return review.missingSections.includes(key);
}

function formatNumber(value: number | null): string {
  return value === null ? '待补充' : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number | null): string {
  return value === null ? '待补充' : `${value.toFixed(2)}%`;
}

function escapeXml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
