import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRefundReportImageTable,
  buildRefundReportTableSvg,
  renderRefundReportTablePng
} from '../src/refund-report-image.ts';
import type { RefundReportRow } from '../src/refund-report.ts';

const rows: RefundReportRow[] = [
  row('宜信', 1194519.7, 203757.3, 18070, 3080, 800000),
  row('上涨企业', 100, 11.1, 10, 2, 60),
  row('下降企业', 100, 9, 10, 2, 50)
];

const baselineRows: RefundReportRow[] = [
  row('宜信', 1060405.6, 226468.7, 16773, 3428, 700000),
  row('上涨企业', 100, 10, 10, 2, 50),
  row('下降企业', 100, 10, 10, 2, 55)
];

const previousFullDayRows: RefundReportRow[] = [
  row('宜信', 993328, 170000, 17000, 3000, 680000),
  row('上涨企业', 100, 9, 9, 1, 40)
];

const yesterdayFullDayRows: RefundReportRow[] = [
  row('宜信', 1197085.3, 203757.3, 18104, 3080, 810000),
  row('上涨企业', 100, 10, 10, 2, 50)
];

test('builds image table with v1.0.1 columns and three-line company cells', () => {
  const table = buildRefundReportImageTable(rows, {
    baselineRows,
    previousFullDayRows,
    yesterdayFullDayRows,
    thresholdPercent: 10
  });

  assert.deepEqual(table.columns, ['企业名称', '退费率', '退费后金额', '支付金额', '支付数', 'c0收入', '退费金额', '退费数']);
  assert.equal(table.rows[0].company, '总计');
  assert.equal(table.rows[1].company, '宜信');
  assert.equal(table.rows[1].refundRate.text, '17.06%\n(21.36%，-20.13% / -4.30pp)\n前日 17.11%｜昨日 17.02%');
  assert.equal(table.rows[1].netIncomeAmount.text, '990,762.40\n(833,936.90，+18.81%)\n前日 823,328.00｜昨日 993,328.00');
  assert.equal(table.rows[1].incomeAmount.text, '1,194,519.70\n(1,060,405.60，+12.65%)\n前日 993,328.00｜昨日 1,197,085.30');
  assert.equal(table.rows[1].incomeCount.text, '18,070\n(16,773，+7.73%)\n前日 17,000｜昨日 18,104');
  assert.equal(table.rows[1].c0IncomeAmount.text, '800,000.00\n(700,000.00，+14.29%)\n前日 680,000.00｜昨日 810,000.00');
  assert.equal(table.rows[1].refundAmount.text, '203,757.30\n(226,468.70，-10.03%)\n前日 170,000.00｜昨日 203,757.30');
  assert.equal(table.rows[1].refundCount.text, '3,080\n(3,428，-10.15%)\n前日 3,000｜昨日 3,080');
  assert.doesNotMatch(JSON.stringify(table), /昨日同期：|环比：/);
});

test('builds total row full-day reference from full-day rows, not baseline/current rows', () => {
  const table = buildRefundReportImageTable(rows, {
    baselineRows,
    previousFullDayRows,
    yesterdayFullDayRows,
    thresholdPercent: 10
  });

  assert.equal(table.rows[0].incomeAmount.text, '1,194,719.70\n(1,060,605.60，+12.65%)\n前日 993,428.00｜昨日 1,197,185.30');
  assert.equal(table.rows[0].c0IncomeAmount.text, '800,110.00\n(700,105.00，+14.28%)\n前日 680,040.00｜昨日 810,050.00');
});

test('sorts image table company rows by net income amount descending', () => {
  const table = buildRefundReportImageTable(
    [
      row('低净额', 100, 90),
      row('高净额', 300, 20),
      row('同净额A', 200, 50),
      row('同净额B', 250, 100)
    ],
    { thresholdPercent: 10 }
  );

  assert.deepEqual(
    table.rows.map((item) => item.company),
    ['总计', '高净额', '同净额A', '同净额B', '低净额']
  );
});

test('marks refund-rate increase and decrease cells for visual attention', () => {
  const table = buildRefundReportImageTable(rows, { baselineRows, thresholdPercent: 10 });

  assert.equal(table.rows.find((item) => item.company === '上涨企业')?.refundRate.tone, 'warning');
  assert.equal(table.rows.find((item) => item.company === '下降企业')?.refundRate.tone, 'good');
});

test('renders refund report table as a PNG buffer', async () => {
  const png = await renderRefundReportTablePng(rows, new Date('2026-06-20T22:00:00+08:00'), {
    baselineRows,
    previousFullDayRows,
    yesterdayFullDayRows,
    thresholdPercent: 10
  });

  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(png.length > 1000);
});

test('SVG contains v1.0.1 labels, full-day reference line, and clipping', () => {
  const table = buildRefundReportImageTable(rows, {
    baselineRows,
    previousFullDayRows,
    yesterdayFullDayRows,
    thresholdPercent: 10
  });
  const svg = buildRefundReportTableSvg(table, new Date('2026-06-20T22:00:00+08:00'));

  assert.match(svg, /退费率播报/);
  assert.match(svg, /时间: 2026-06-20 22:00:00/);
  assert.match(svg, /口径说明：数据统计范围为今日 00:00 至当前整点/);
  assert.match(svg, /企业名称/);
  assert.match(svg, /c0收入/);
  assert.match(svg, /前日 17\.11%｜昨日 17\.02%/);
  assert.match(svg, /前日 680,000\.00｜昨日 810,000\.00/);
  assert.match(svg, /<clipPath id="cell-1-1-clip">/);
  assert.match(svg, /clip-path="url\(#cell-1-1-clip\)"/);
  assert.match(svg, /<tspan x="[^"]+" dy="22" font-size="14" fill="#6b7280">前日 17\.11%｜昨日 17\.02%<\/tspan>/);
});

test('SVG uses yesterday full-day methodology note during the midnight hour', () => {
  const table = buildRefundReportImageTable(rows, { baselineRows, thresholdPercent: 10 });
  const svg = buildRefundReportTableSvg(table, new Date('2026-06-21T00:02:27+08:00'));

  assert.match(svg, /时间: 2026-06-21 00:02:27/);
  assert.match(svg, /口径说明：数据统计范围为昨日全天/);
  assert.match(svg, /前日全天值/);
});

test('SVG places methodology note before the table header and uses the requested header color', () => {
  const table = buildRefundReportImageTable(rows, { baselineRows, thresholdPercent: 10 });
  const svg = buildRefundReportTableSvg(table, new Date('2026-06-20T22:00:00+08:00'));

  const noteIndex = svg.indexOf('口径说明：数据统计范围');
  const headerIndex = svg.indexOf('企业名称');

  assert.ok(noteIndex > 0);
  assert.ok(headerIndex > noteIndex);
  assert.match(svg, /<rect x="36" y="188" width="240" height="116" fill="#B5C6EA"\/>/);
  assert.match(svg, /<text x="156" y="250"[^>]+fill="#111827"[^>]*>企业名称<\/text>/);
});

function row(
  company: string,
  incomeAmount: number,
  refundAmount: number,
  incomeCount = 1,
  refundCount = 1,
  c0IncomeAmount = 0
): RefundReportRow {
  return {
    company,
    incomeAmount,
    refundAmount,
    incomeCount,
    refundCount,
    c0IncomeAmount,
    refundRate: incomeAmount > 0 ? (refundAmount / incomeAmount) * 100 : null
  };
}
