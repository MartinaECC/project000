import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRefundReportImageTable,
  buildRefundReportTableSvg,
  renderRefundReportTablePng
} from '../src/refund-report-image.ts';
import type { RefundReportRow } from '../src/refund-report.ts';

const rows: RefundReportRow[] = [
  { company: '宜信', incomeAmount: 1194519.7, refundAmount: 203757.3, incomeCount: 18070, refundCount: 3080, refundRate: 17.0575 },
  { company: '上涨企业', incomeAmount: 100, refundAmount: 11.1, incomeCount: 10, refundCount: 2, refundRate: 11.1 },
  { company: '下降企业', incomeAmount: 100, refundAmount: 9, incomeCount: 10, refundCount: 2, refundRate: 9 }
];

const baselineRows: RefundReportRow[] = [
  { company: '宜信', incomeAmount: 1060405.6, refundAmount: 226468.7, incomeCount: 16773, refundCount: 3428, refundRate: 21.3568 },
  { company: '上涨企业', incomeAmount: 100, refundAmount: 10, incomeCount: 10, refundCount: 2, refundRate: 10 },
  { company: '下降企业', incomeAmount: 100, refundAmount: 10, incomeCount: 10, refundCount: 2, refundRate: 10 }
];

test('builds image table with fixed columns and simplified comparison cells', () => {
  const table = buildRefundReportImageTable(rows, { baselineRows, thresholdPercent: 10 });

  assert.deepEqual(table.columns, ['企业名称', '退费率', '退费后金额', '支付金额', '支付数', '退费金额', '退费数']);
  assert.equal(table.rows[0].company, '总计');
  assert.equal(table.rows[1].company, '宜信');
  assert.equal(table.rows[1].refundRate.text, '17.06%（21.36%，-20.13% / -4.30pp）');
  assert.equal(table.rows[1].netIncomeAmount.text, '990,762.40（833,936.90，+18.81%）');
  assert.equal(table.rows[1].incomeAmount.text, '1,194,519.70（1,060,405.60，+12.65%）');
  assert.equal(table.rows[1].incomeCount.text, '18,070（16,773，+7.73%）');
  assert.equal(table.rows[1].refundAmount.text, '203,757.30（226,468.70，-10.03%）');
  assert.equal(table.rows[1].refundCount.text, '3,080（3,428，-10.15%）');
  assert.doesNotMatch(JSON.stringify(table), /昨日同期：|环比：/);
});

test('sorts image table company rows by net income amount descending', () => {
  const table = buildRefundReportImageTable(
    [
      { company: '低净额', incomeAmount: 100, refundAmount: 90, incomeCount: 1, refundCount: 1, refundRate: 90 },
      { company: '高净额', incomeAmount: 300, refundAmount: 20, incomeCount: 1, refundCount: 1, refundRate: 6.6667 },
      { company: '同净额A', incomeAmount: 200, refundAmount: 50, incomeCount: 1, refundCount: 1, refundRate: 25 },
      { company: '同净额B', incomeAmount: 250, refundAmount: 100, incomeCount: 1, refundCount: 1, refundRate: 40 }
    ],
    { thresholdPercent: 10 }
  );

  assert.deepEqual(
    table.rows.map((row) => row.company),
    ['总计', '高净额', '同净额A', '同净额B', '低净额']
  );
});

test('marks refund-rate increase and decrease cells for visual attention', () => {
  const table = buildRefundReportImageTable(rows, { baselineRows, thresholdPercent: 10 });

  assert.equal(table.rows.find((row) => row.company === '上涨企业')?.refundRate.tone, 'warning');
  assert.equal(table.rows.find((row) => row.company === '下降企业')?.refundRate.tone, 'good');
});

test('renders refund report table as a PNG buffer', async () => {
  const png = await renderRefundReportTablePng(rows, new Date('2026-06-20T22:00:00+08:00'), {
    baselineRows,
    thresholdPercent: 10
  });

  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(png.length > 1000);
});

test('SVG contains report title, time, and table labels', () => {
  const table = buildRefundReportImageTable(rows, { baselineRows, thresholdPercent: 10 });
  const svg = buildRefundReportTableSvg(table, new Date('2026-06-20T22:00:00+08:00'));

  assert.match(svg, /退费率播报/);
  assert.match(svg, /时间: 2026-06-20 22:00:00/);
  assert.match(svg, /口径说明：数据统计范围为今日 00:00 至当前整点；括号内依次为昨日同整点值、环比变化，退费率另展示百分点差异（pp）。/);
  assert.match(svg, /企业名称/);
});

test('SVG places methodology note before the table header', () => {
  const table = buildRefundReportImageTable(rows, { baselineRows, thresholdPercent: 10 });
  const svg = buildRefundReportTableSvg(table, new Date('2026-06-20T22:00:00+08:00'));

  const noteIndex = svg.indexOf('口径说明：数据统计范围');
  const headerIndex = svg.indexOf('企业名称');

  assert.ok(noteIndex > 0);
  assert.ok(headerIndex > noteIndex);
  assert.match(svg, /<rect x="36" y="188" width="250" height="92" fill="#B5C6EA"\/><text x="161" y="233"/);
});

test('SVG uses the requested light blue table header color with dark header text', () => {
  const table = buildRefundReportImageTable(rows, { baselineRows, thresholdPercent: 10 });
  const svg = buildRefundReportTableSvg(table, new Date('2026-06-20T22:00:00+08:00'));

  assert.match(svg, /<rect x="36" y="188" width="250" height="92" fill="#B5C6EA"\/>/);
  assert.match(svg, /<text x="161" y="233"[^>]+fill="#111827"[^>]*>企业名称<\/text>/);
});

test('SVG wraps comparison values inside clipped table cells to avoid overlap', () => {
  const table = buildRefundReportImageTable(rows, { baselineRows, thresholdPercent: 10 });
  const svg = buildRefundReportTableSvg(table, new Date('2026-06-20T22:00:00+08:00'));

  assert.match(svg, /<clipPath id="cell-1-1-clip">/);
  assert.match(svg, /<clipPath id="cell-1-2-clip">/);
  assert.match(svg, /clip-path="url\(#cell-1-1-clip\)"/);
  assert.match(svg, /<tspan x="[^"]+" dy="0">17\.06%<\/tspan>/);
  assert.match(svg, /<tspan x="[^"]+" dy="24" font-size="17" fill="#374151">（21\.36%，-20\.13% \/ -4\.30pp）<\/tspan>/);
  assert.match(svg, /<tspan x="[^"]+" dy="0">990,762\.40<\/tspan>/);
});
