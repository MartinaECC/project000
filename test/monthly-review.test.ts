import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_MONTHLY_REVIEW_DOC_TOKEN,
  LarkMonthlyReviewWriter,
  buildDataFinderMonthlyQueryPlan,
  buildMonthlyReview,
  buildMonthlyReviewDocXml,
  generateAndWriteMonthlyReview,
  monthlyComparisonPeriods,
  percentChange
} from '../src/monthly-review.ts';

test('computes previous complete natural month and comparison month', () => {
  assert.deepEqual(monthlyComparisonPeriods(new Date('2026-06-19T18:00:00+08:00')), {
    target: { start: '2026-05-01', end: '2026-05-31', label: '2026年05月', days: 31 },
    comparison: { start: '2026-04-01', end: '2026-04-30', label: '2026年04月', days: 30 }
  });
});

test('computes requested natural month across year boundary', () => {
  assert.deepEqual(monthlyComparisonPeriods(new Date('2026-06-19T18:00:00+08:00'), '2026-01'), {
    target: { start: '2026-01-01', end: '2026-01-31', label: '2026年01月', days: 31 },
    comparison: { start: '2025-12-01', end: '2025-12-31', label: '2025年12月', days: 31 }
  });
});

test('computes natural month percent change', () => {
  assert.equal(percentChange(120, 100), 20);
  assert.equal(percentChange(80, 100), -20);
  assert.equal(percentChange(80, 0), null);
});

test('builds monthly review metrics from target and comparison data', () => {
  const review = buildMonthlyReview({
    companyShortName: '奇富&优鉴',
    periods: monthlyComparisonPeriods(new Date('2026-06-19T18:00:00+08:00')),
    target: {
      grossIncome: 2_634,
      refundAmount: 131,
      activeIncome: 265,
      activeRefundAmount: 27,
      renewalIncome: 2_369,
      renewalRefundAmount: 105,
      signups: 100,
      cancellations: 8,
      chargeAttempts: 500,
      chargeSuccesses: 420,
      reportViews: 47,
      reportEligibleUsers: 100
    },
    comparison: {
      grossIncome: 2_430,
      refundAmount: 120,
      activeIncome: 232,
      activeRefundAmount: 24,
      renewalIncome: 2_198,
      renewalRefundAmount: 96,
      signups: 90,
      cancellations: 9,
      chargeAttempts: 450,
      chargeSuccesses: 360,
      reportViews: 51,
      reportEligibleUsers: 100
    },
    missingSections: ['complaints', 'addOns']
  });

  assert.equal(review.docToken, DEFAULT_MONTHLY_REVIEW_DOC_TOKEN);
  assert.equal(review.netIncome.value, 2503);
  assert.equal(review.netIncome.comparisonValue, 2310);
  assert.equal(review.netIncome.changePercent, 8.354978354978355);
  assert.equal(review.dailyNetIncome.value, 80.74193548387096);
  assert.equal(review.activeNetIncome.value, 238);
  assert.equal(review.renewalNetIncome.value, 2264);
  assert.equal(review.refundRate.value, 4.973424449506454);
  assert.equal(review.cancellationRate.value, 8);
  assert.equal(review.chargeSuccessRate.value, 84);
  assert.equal(review.reportViewRate.value, 47);
  assert.deepEqual(review.missingSections, ['complaints', 'addOns']);
});

test('formats doc xml with fixed sections and待补充 markers', () => {
  const review = buildMonthlyReview({
    companyShortName: '奇富&优鉴',
    periods: monthlyComparisonPeriods(new Date('2026-06-19T18:00:00+08:00')),
    target: {
      grossIncome: 2_634,
      refundAmount: 131,
      activeIncome: 265,
      activeRefundAmount: 27,
      renewalIncome: 2_369,
      renewalRefundAmount: 105,
      signups: 100,
      cancellations: 8,
      chargeAttempts: 500,
      chargeSuccesses: 420
    },
    comparison: {
      grossIncome: 2_430,
      refundAmount: 120,
      activeIncome: 232,
      activeRefundAmount: 24,
      renewalIncome: 2_198,
      renewalRefundAmount: 96,
      signups: 90,
      cancellations: 9,
      chargeAttempts: 450,
      chargeSuccesses: 360
    },
    missingSections: ['rules', 'complaints', 'reportViews', 'addOns']
  });

  const xml = buildMonthlyReviewDocXml(review);

  assert.match(xml, /<h1>收入表现<\/h1>/);
  assert.match(xml, /5月退费后收入 2,503\.00，环比 8\.35%/);
  assert.match(xml, /<h1>规则调整总览<\/h1>\s*<p>待补充：/);
  assert.match(xml, /<h1>退费和客诉表现<\/h1>/);
  assert.match(xml, /客诉数据待补充/);
  assert.match(xml, /报告查看率数据待补充/);
  assert.match(xml, /加购数据待补充/);
  assert.doesNotMatch(xml, /&(?!(amp|lt|gt|quot|apos);)/);
});

test('builds DataFinder query plan with natural month ranges and company short name filter', () => {
  const plan = buildDataFinderMonthlyQueryPlan({
    companyShortName: '奇富&优鉴',
    periods: monthlyComparisonPeriods(new Date('2026-06-19T18:00:00+08:00')),
    companyField: '企业简称'
  });

  assert.equal(plan.target.start, '2026-05-01');
  assert.equal(plan.target.end, '2026-05-31');
  assert.equal(plan.comparison.start, '2026-04-01');
  assert.equal(plan.queries[0].period, 'target');
  assert.equal(plan.queries[0].eventName, 'order_suc_back');
  assert.deepEqual(plan.queries[0].filters, [{ field: '企业简称', operator: 'eq', value: '奇富&优鉴' }]);
  assert.deepEqual(plan.queries.find((query) => query.metric === 'renewalIncome')?.filters, [
    { field: '企业简称', operator: 'eq', value: '奇富&优鉴' },
    { field: 'cycle', operator: 'gt', value: 0 }
  ]);
  assert.deepEqual(plan.queries.find((query) => query.metric === 'activeIncome')?.filterLogic, 'AND_OR_TAIL');
});

test('uses virtual enterprise short name as grouped selector by default', () => {
  const plan = buildDataFinderMonthlyQueryPlan({
    companyShortName: '奇富数科',
    periods: monthlyComparisonPeriods(new Date('2026-06-19T18:00:00+08:00'))
  });

  assert.equal(plan.companyField, '$_vp_alis_name');
  assert.deepEqual(plan.queries[0].groupBy, ['$_vp_alis_name']);
  assert.equal(plan.queries[0].selectGroup, '奇富数科');
  assert.deepEqual(plan.queries[0].filters, []);
});

test('appends monthly review XML to the configured Feishu document token', async () => {
  const calls: Array<{ docToken: string; content: string }> = [];
  const writer = new LarkMonthlyReviewWriter({
    async appendXml(docToken, content) {
      calls.push({ docToken, content });
    }
  });

  await writer.write('<h1>收入表现</h1>');

  assert.deepEqual(calls, [{ docToken: DEFAULT_MONTHLY_REVIEW_DOC_TOKEN, content: '<h1>收入表现</h1>' }]);
});

test('generates and writes a monthly review draft from a source', async () => {
  const written: string[] = [];
  const review = await generateAndWriteMonthlyReview({
    companyShortName: '奇富数科',
    now: new Date('2026-06-19T18:00:00+08:00'),
    source: {
      async load() {
        return {
          target: { grossIncome: 100, refundAmount: 10, chargeAttempts: 10, chargeSuccesses: 8 },
          comparison: { grossIncome: 80, refundAmount: 8, chargeAttempts: 10, chargeSuccesses: 7 },
          missingSections: ['rules', 'complaints', 'reportViews', 'addOns']
        };
      }
    },
    writer: {
      async write(content) {
        written.push(content);
      }
    }
  });

  assert.equal(review.companyShortName, '奇富数科');
  assert.equal(review.periods.target.label, '2026年05月');
  assert.equal(written.length, 1);
  assert.match(written[0], /奇富数科2026年05月运营复盘初稿/);
  assert.match(written[0], /5月退费后收入 90\.00，环比 25\.00%/);
});
