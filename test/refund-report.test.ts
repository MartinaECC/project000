import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateAmountGroups,
  aggregateCountGroups,
  buildRefundReportRows,
  computeRefundReportPeriods,
  formatRefundReportMarkdown,
  formatRefundReportMarkdownChunks,
  hasRefundReportAnomaly,
  msUntilNextHour,
  sendRefundReportOnce,
  startHourlyRefundReport
} from '../src/refund-report.ts';
import type { LlmAgent } from '../src/types.ts';

const cleanDiagnostics = {
  incomeRows: 1,
  refundRows: 1,
  incomeBadRows: [],
  refundBadRows: [],
  incomeTruncated: false,
  refundTruncated: false
};

const unusedLlm: LlmAgent = {
  async chat() {
    throw new Error('not used');
  },
  async summarizeDocument() {
    throw new Error('not used');
  },
  async summarizeGroup() {
    throw new Error('not used');
  },
  async draftWeeklyReport() {
    throw new Error('not used');
  }
};

test('aggregates amount groups using DataFinder measure values directly', () => {
  const totals = aggregateAmountGroups([
    { company: '宜信', amount: '59.8', count: 2 },
    { company: '宜信', amount: 88, count: 1 },
    { company: '融呗', amount: '10', count: 3 }
  ]);

  assert.deepEqual(totals, {
    宜信: 147.8,
    融呗: 10
  });
});

test('aggregates count groups by company', () => {
  const totals = aggregateCountGroups([
    { company: '宜信', amount: '59.8', count: 2 },
    { company: '宜信', amount: 88, count: 1 },
    { company: '融呗', amount: '10', count: 3 }
  ]);

  assert.deepEqual(totals, {
    宜信: 3,
    融呗: 3
  });
});

test('builds rows with counts, filters zero amount companies, and sorts by refund amount then rate', () => {
  const rows = buildRefundReportRows(
    { 宜信: 100, 融呗: 0, 奇富数科: 200, 零动: 0, 同额低率: 200 },
    { 宜信: 25, 融呗: 10, 奇富数科: 20, 零动: 0, 同额低率: 25 },
    { 宜信: 5, 奇富数科: 10, 同额低率: 8 },
    { 宜信: 2, 融呗: 1, 奇富数科: 3, 同额低率: 4 }
  );

  assert.deepEqual(rows, [
    { company: '宜信', incomeAmount: 100, refundAmount: 25, incomeCount: 5, refundCount: 2, c0IncomeAmount: 0, refundRate: 25 },
    { company: '同额低率', incomeAmount: 200, refundAmount: 25, incomeCount: 8, refundCount: 4, c0IncomeAmount: 0, refundRate: 12.5 },
    { company: '奇富数科', incomeAmount: 200, refundAmount: 20, incomeCount: 10, refundCount: 3, c0IncomeAmount: 0, refundRate: 10 },
    { company: '融呗', incomeAmount: 0, refundAmount: 10, incomeCount: 0, refundCount: 1, c0IncomeAmount: 0, refundRate: null }
  ]);
});

test('computes current and baseline report periods using top-of-hour cutoff', () => {
  const periods = computeRefundReportPeriods(new Date('2026-06-20T21:34:44+08:00'), 'Asia/Shanghai');

  assert.deepEqual(periods, {
    current: {
      start: new Date('2026-06-20T00:00:00+08:00'),
      end: new Date('2026-06-20T21:00:00+08:00')
    },
    baseline: {
      start: new Date('2026-06-19T00:00:00+08:00'),
      end: new Date('2026-06-19T21:00:00+08:00')
    },
    previousFullDay: {
      start: new Date('2026-06-18T00:00:00+08:00'),
      end: new Date('2026-06-19T00:00:00+08:00')
    },
    yesterdayFullDay: {
      start: new Date('2026-06-19T00:00:00+08:00'),
      end: new Date('2026-06-20T00:00:00+08:00')
    }
  });
});

test('formats refund report markdown with overview, company sections, and anomalies', () => {
  const markdown = formatRefundReportMarkdown(
    [
      { company: '宜信', incomeAmount: 843408.3, refundAmount: 170717.8, incomeCount: 1200, refundCount: 80, refundRate: 20.2414 },
      { company: '奇富数科', incomeAmount: 0, refundAmount: 1584, incomeCount: 0, refundCount: 3, refundRate: null }
    ],
    new Date('2026-06-19T10:00:00+08:00'),
    { diagnostics: cleanDiagnostics, thresholdPercent: 10 }
  );

  assert.match(markdown, /^<font sizeToken=common_h1_text_style__font_size>\*\*退费率播报\*\*<\/font>$/m);
  assert.match(markdown, /^<font sizeToken=common_h2_text_style__font_size>\*\*时间: 2026-06-19 10:00:00\*\*<\/font>$/m);
  assert.match(markdown, /^<font sizeToken=common_h3_text_style__font_size>\*\*总览\*\*<\/font>$/m);
  assert.match(markdown, /退费数：83/);
  assert.match(markdown, /支付数：1,200/);
  assert.match(markdown, /退费金额：172,301\.80/);
  assert.match(markdown, /支付金额：843,408\.30/);
  assert.match(markdown, /^<font sizeToken=common_h3_text_style__font_size>\*\*宜信\*\*<\/font>$/m);
  assert.match(markdown, /退费率：20\.24%/);
  assert.match(markdown, /^<font sizeToken=common_h3_text_style__font_size>\*\*奇富数科\*\*<\/font>$/m);
  assert.match(markdown, /退费率：无法计算/);
  assert.match(markdown, /关注点：支付金额为 0 但产生退费，需优先核查/);
  assert.match(markdown, /^<font sizeToken=common_h3_text_style__font_size>\*\*异常总结\*\*<\/font>$/m);
  assert.match(markdown, /关注点：无明显异常/);
  assert.doesNotMatch(markdown, /宜信：退费率达到/);
  assert.match(markdown, /- 奇富数科：支付金额为 0 但产生退费，需优先核查/);
});

test('formats overview and company rows with baseline values and period-over-period deltas', () => {
  const markdown = formatRefundReportMarkdown(
    [
      { company: '宜信', incomeAmount: 200, refundAmount: 20, incomeCount: 20, refundCount: 4, refundRate: 10 },
      { company: '奇富数科', incomeAmount: 300, refundAmount: 30, incomeCount: 30, refundCount: 6, refundRate: 10 }
    ],
    new Date('2026-06-20T21:34:44+08:00'),
    {
      diagnostics: cleanDiagnostics,
      baselineRows: [
        { company: '宜信', incomeAmount: 100, refundAmount: 5, incomeCount: 10, refundCount: 2, refundRate: 5 },
        { company: '奇富数科', incomeAmount: 300, refundAmount: 15, incomeCount: 15, refundCount: 3, refundRate: 5 }
      ],
      thresholdPercent: 10
    }
  );

  assert.match(markdown, /^<font sizeToken=common_h1_text_style__font_size>\*\*退费率播报\*\*<\/font>$/m);
  assert.match(markdown, /^<font sizeToken=common_h2_text_style__font_size>\*\*时间: 2026-06-20 21:34:44\*\*<\/font>$/m);
  assert.match(markdown, /^<font sizeToken=common_h3_text_style__font_size>\*\*总览\*\*<\/font>$/m);
  assert.match(markdown, /退费率：10\.00%（5\.00%，环比：\+100\.00% \/ \+5\.00pp）/);
  assert.match(markdown, /退费数：10（5，环比：\+100\.00%）/);
  assert.match(markdown, /支付数：50（25，环比：\+100\.00%）/);
  assert.match(markdown, /退费金额：50\.00（20\.00，环比：\+150\.00%）/);
  assert.match(markdown, /支付金额：500\.00（400\.00，环比：\+25\.00%）/);
  assert.doesNotMatch(markdown, /昨日同期：/);
  assert.match(markdown, /^<font sizeToken=common_h2_text_style__font_size>\*\*时间: 2026-06-20 21:34:44\*\*<\/font>$\n&nbsp;\n^<font sizeToken=common_h3_text_style__font_size>\*\*总览\*\*<\/font>$/m);
  assert.match(markdown, /^<font sizeToken=common_h3_text_style__font_size>\*\*总览\*\*<\/font>$[\s\S]+?支付金额：500\.00（400\.00，环比：\+25\.00%）\n&nbsp;\n^<font sizeToken=common_h3_text_style__font_size>\*\*宜信\*\*<\/font>$/m);
  assert.match(markdown, /^<font sizeToken=common_h3_text_style__font_size>\*\*宜信\*\*<\/font>$/m);
  assert.match(markdown, /退费率：10\.00%（5\.00%，环比：\+100\.00% \/ \+5\.00pp）/);
  assert.match(markdown, /^<font sizeToken=common_h3_text_style__font_size>\*\*奇富数科\*\*<\/font>$/m);
  assert.match(markdown, /关注点：退费率环比上升 \+100\.00%，需关注/);
  assert.match(markdown, /- 宜信：退费率环比上升 \+100\.00%，需关注/);
  assert.match(markdown, /- 奇富数科：退费率环比上升 \+100\.00%，需关注/);
});

test('flags refund-rate relative increase above 10 percent and decrease at least 10 percent', () => {
  const markdown = formatRefundReportMarkdown(
    [
      { company: '上涨企业', incomeAmount: 100, refundAmount: 11.1, incomeCount: 10, refundCount: 2, refundRate: 11.1 },
      { company: '下降企业', incomeAmount: 100, refundAmount: 9, incomeCount: 10, refundCount: 2, refundRate: 9 },
      { company: '持平高企业', incomeAmount: 100, refundAmount: 25, incomeCount: 10, refundCount: 2, refundRate: 25 }
    ],
    new Date('2026-06-20T21:34:44+08:00'),
    {
      diagnostics: cleanDiagnostics,
      baselineRows: [
        { company: '上涨企业', incomeAmount: 100, refundAmount: 10, incomeCount: 10, refundCount: 2, refundRate: 10 },
        { company: '下降企业', incomeAmount: 100, refundAmount: 10, incomeCount: 10, refundCount: 2, refundRate: 10 },
        { company: '持平高企业', incomeAmount: 100, refundAmount: 25, incomeCount: 10, refundCount: 2, refundRate: 25 }
      ],
      thresholdPercent: 10
    }
  );

  assert.match(markdown, /上涨企业[\s\S]+?关注点：退费率环比上升 \+11\.00%，需关注/);
  assert.match(markdown, /下降企业[\s\S]+?关注点：退费率环比下降 -10\.00%，需关注/);
  assert.match(markdown, /持平高企业[\s\S]+?关注点：无明显异常/);
  assert.match(markdown, /- 上涨企业：退费率环比上升 \+11\.00%，需关注/);
  assert.match(markdown, /- 下降企业：退费率环比下降 -10\.00%，需关注/);
  assert.doesNotMatch(markdown, /持平高企业：/);
});

test('hides baseline comparison when yesterday value is zero or missing', () => {
  const markdown = formatRefundReportMarkdown(
    [{ company: '宜信', incomeAmount: 200, refundAmount: 20, incomeCount: 20, refundCount: 4, refundRate: 10 }],
    new Date('2026-06-20T21:34:44+08:00'),
    {
      diagnostics: cleanDiagnostics,
      baselineRows: [{ company: '宜信', incomeAmount: 0, refundAmount: 0, incomeCount: 0, refundCount: 0, refundRate: null }],
      thresholdPercent: 20
    }
  );

  assert.match(markdown, /退费率：10\.00%/);
  assert.doesNotMatch(markdown, /昨日同期/);
});

test('formats empty refund report as no data markdown', () => {
  const markdown = formatRefundReportMarkdown([], new Date('2026-06-19T10:00:00+08:00'), {
    diagnostics: cleanDiagnostics,
    thresholdPercent: 20
  });

  assert.match(markdown, /暂无当日支付或退费数据/);
  assert.match(markdown, /退费数：0/);
  assert.match(markdown, /- 暂无/);
});

test('formats large refund reports as multiple markdown chunks', () => {
  const rows = Array.from({ length: 9 }, (_value, index) => ({
    company: `企业${index + 1}`,
    incomeAmount: 100,
    refundAmount: index,
    incomeCount: 10,
    refundCount: index,
    refundRate: index
  }));

  const chunks = formatRefundReportMarkdownChunks(rows, new Date('2026-06-19T10:00:00+08:00'), {
    diagnostics: cleanDiagnostics,
    thresholdPercent: 20,
    chunkSize: 5
  });

  assert.equal(chunks.length, 2);
  assert.match(chunks[0], /^<font sizeToken=common_h1_text_style__font_size>\*\*退费率播报 1\/2\*\*<\/font>$/m);
  assert.match(chunks[1], /^<font sizeToken=common_h1_text_style__font_size>\*\*退费率播报 2\/2\*\*<\/font>$/m);
  assert.match(chunks[0], /^<font sizeToken=common_h3_text_style__font_size>\*\*企业5\*\*<\/font>$/m);
  assert.doesNotMatch(chunks[0], /^<font sizeToken=common_h3_text_style__font_size>\*\*企业6\*\*<\/font>$/m);
  assert.match(chunks[1], /^<font sizeToken=common_h3_text_style__font_size>\*\*企业9\*\*<\/font>$/m);
});

test('computes delay until the next top of hour', () => {
  assert.equal(msUntilNextHour(new Date('2026-06-19T10:15:30.250+08:00')), 2669750);
  assert.equal(msUntilNextHour(new Date('2026-06-19T10:00:00.000+08:00')), 3600000);
});

test('detects diagnostics, zero-income refunds, and refund-rate relative change anomalies', () => {
  assert.equal(
    hasRefundReportAnomaly(
      {
        rows: [{ company: '宜信', incomeAmount: 100, refundAmount: 25, incomeCount: 5, refundCount: 1, refundRate: 25 }],
        diagnostics: cleanDiagnostics
      },
      10
    ),
    false
  );
  assert.equal(
    hasRefundReportAnomaly(
      {
        rows: [{ company: '上涨企业', incomeAmount: 100, refundAmount: 11.1, incomeCount: 5, refundCount: 1, refundRate: 11.1 }],
        baselineRows: [{ company: '上涨企业', incomeAmount: 100, refundAmount: 10, incomeCount: 5, refundCount: 1, refundRate: 10 }],
        diagnostics: cleanDiagnostics
      },
      10
    ),
    true
  );
  assert.equal(
    hasRefundReportAnomaly(
      {
        rows: [{ company: '下降企业', incomeAmount: 100, refundAmount: 9, incomeCount: 5, refundCount: 1, refundRate: 9 }],
        baselineRows: [{ company: '下降企业', incomeAmount: 100, refundAmount: 10, incomeCount: 5, refundCount: 1, refundRate: 10 }],
        diagnostics: cleanDiagnostics
      },
      10
    ),
    true
  );
  assert.equal(
    hasRefundReportAnomaly(
      {
        rows: [{ company: '宜信', incomeAmount: 100, refundAmount: 1, incomeCount: 5, refundCount: 1, refundRate: 1 }],
        diagnostics: { ...cleanDiagnostics, incomeBadRows: [{}] }
      },
      10
    ),
    true
  );
  assert.equal(
    hasRefundReportAnomaly(
      {
        rows: [{ company: '奇富数科', incomeAmount: 0, refundAmount: 1, incomeCount: 0, refundCount: 1, refundRate: null }],
        diagnostics: cleanDiagnostics
      },
      10
    ),
    true
  );
});

test('sends normal refund reports as one complete card without calling the LLM', async () => {
  const sent: Array<{ users: string[]; title: string; markdown: string }> = [];

  await sendRefundReportOnce({
    source: {
      async load() {
        return {
          rows: [{ company: '宜信', incomeAmount: 100, refundAmount: 1, incomeCount: 10, refundCount: 1, refundRate: 1 }],
          diagnostics: cleanDiagnostics
        };
      }
    },
    sender: {
      async sendRefundReportCard(users, title, markdown) {
        sent.push({ users, title, markdown });
      }
    },
    userIds: ['user-1'],
    thresholdPercent: 10,
    llmOnAnomaly: 'fail_or_threshold',
    llm: unusedLlm,
    now: new Date('2026-06-19T10:00:00+08:00')
  });

  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].users, ['user-1']);
  assert.equal(sent[0].title, '退费率播报');
  assert.match(sent[0].markdown, /^<font sizeToken=common_h3_text_style__font_size>\*\*宜信\*\*<\/font>$/m);
  assert.match(sent[0].markdown, /退费率：1\.00%/);
});

test('summarizes refund-rate relative change reports with the LLM', async () => {
  const sent: string[] = [];

  await sendRefundReportOnce({
    source: {
      async load() {
        return {
          rows: [{ company: '宜信', incomeAmount: 100, refundAmount: 11.1, incomeCount: 10, refundCount: 2, refundRate: 11.1 }],
          baselineRows: [{ company: '宜信', incomeAmount: 100, refundAmount: 10, incomeCount: 10, refundCount: 2, refundRate: 10 }],
          diagnostics: cleanDiagnostics
        };
      }
    },
    sender: {
      async sendRefundReportCard(_users, _title, markdown) {
        sent.push(markdown);
      }
    },
    userIds: ['user-1'],
    thresholdPercent: 10,
    llmOnAnomaly: 'fail_or_threshold',
    llm: {
      ...unusedLlm,
      async chat() {
        return '宜信退费率环比上升 11%，需关注。';
      }
    },
    now: new Date('2026-06-19T10:00:00+08:00')
  });

  assert.match(sent[0], /AI 说明：宜信退费率环比上升 11%，需关注。/);
});

test('sends large refund reports as one complete card markdown body', async () => {
  const sent: string[] = [];
  const rows = Array.from({ length: 9 }, (_value, index) => ({
    company: `企业${index + 1}`,
    incomeAmount: 100,
    refundAmount: index,
    incomeCount: 10,
    refundCount: index,
    refundRate: index
  }));

  await sendRefundReportOnce({
    source: {
      async load() {
        return {
          rows,
          diagnostics: cleanDiagnostics
        };
      }
    },
    sender: {
      async sendRefundReportCard(_users, title, markdown) {
        sent.push(`${title}:${markdown}`);
      }
    },
    userIds: ['user-1'],
    thresholdPercent: 20,
    llmOnAnomaly: 'never',
    now: new Date('2026-06-19T10:00:00+08:00')
  });

  assert.equal(sent.length, 1);
  assert.match(sent[0], /^退费率播报:<font sizeToken=common_h1_text_style__font_size>\*\*退费率播报\*\*<\/font>$/m);
  assert.match(sent[0], /^<font sizeToken=common_h3_text_style__font_size>\*\*企业1\*\*<\/font>$/m);
  assert.match(sent[0], /^<font sizeToken=common_h3_text_style__font_size>\*\*企业9\*\*<\/font>$/m);
});

test('sends image mode refund reports with title and time but without duplicate text summary', async () => {
  const sent: Array<{ users: string[]; title: string; markdown: string; image: Buffer }> = [];
  const rows = [
    { company: '宜信', incomeAmount: 100, refundAmount: 10, incomeCount: 10, refundCount: 1, refundRate: 10 },
    { company: '奇富数科', incomeAmount: 100, refundAmount: 5, incomeCount: 8, refundCount: 1, refundRate: 5 }
  ];

  await sendRefundReportOnce({
    source: {
      async load() {
        return {
          rows,
          baselineRows: [{ company: '宜信', incomeAmount: 100, refundAmount: 5, incomeCount: 10, refundCount: 1, refundRate: 5 }],
          diagnostics: cleanDiagnostics
        };
      }
    },
    sender: {
      async sendRefundReportCard() {
        throw new Error('markdown sender should not be called');
      },
      async sendRefundReportImageCard(users, title, markdown, image) {
        sent.push({ users, title, markdown, image });
      }
    },
    userIds: ['user-1'],
    thresholdPercent: 10,
    renderMode: 'image',
    llmOnAnomaly: 'never',
    now: new Date('2026-06-19T10:00:00+08:00')
  });

  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].users, ['user-1']);
  assert.equal(sent[0].title, '退费率播报');
  assert.equal(sent[0].image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.match(sent[0].markdown, /^<font sizeToken=common_h1_text_style__font_size>\*\*退费率播报\*\*<\/font>$/m);
  assert.match(sent[0].markdown, /^<font sizeToken=common_h2_text_style__font_size>\*\*时间: 2026-06-19 10:00:00\*\*<\/font>$/m);
  assert.doesNotMatch(sent[0].markdown, /总览|异常总结|退费率：|支付金额/);
  assert.doesNotMatch(sent[0].markdown, /^<font sizeToken=common_h3_text_style__font_size>\*\*宜信\*\*<\/font>$/m);
  assert.doesNotMatch(sent[0].markdown, /^<font sizeToken=common_h3_text_style__font_size>\*\*奇富数科\*\*<\/font>$/m);
});

test('image mode sends a failure card instead of silently falling back to markdown when image sending fails', async () => {
  const failureCards: Array<{ title: string; markdown: string }> = [];

  await assert.rejects(
    () =>
      sendRefundReportOnce({
        source: {
          async load() {
            return {
              rows: [{ company: '宜信', incomeAmount: 100, refundAmount: 10, incomeCount: 10, refundCount: 1, refundRate: 10 }],
              diagnostics: cleanDiagnostics
            };
          }
        },
        sender: {
          async sendRefundReportCard(_users, title, markdown) {
            failureCards.push({ title, markdown });
          },
          async sendRefundReportImageCard() {
            throw new Error('upload failed');
          }
        },
        userIds: ['user-1'],
        thresholdPercent: 10,
        renderMode: 'image',
        llmOnAnomaly: 'never',
        now: new Date('2026-06-19T10:00:00+08:00')
      }),
    /upload failed/
  );

  assert.equal(failureCards.length, 1);
  assert.equal(failureCards[0].title, '退费率播报失败');
  assert.match(failureCards[0].markdown, /upload failed/);
});

test('schedules the first refund report for the next top of hour', () => {
  const delays: number[] = [];
  const cancel = startHourlyRefundReport({
    source: {
      async load() {
        throw new Error('not invoked by fake timer');
      }
    },
    sender: {
      async sendRefundReportCard() {
        throw new Error('not invoked by fake timer');
      }
    },
    userIds: ['user-1'],
    thresholdPercent: 20,
    llmOnAnomaly: 'never',
    now: () => new Date('2026-06-19T10:15:30.250+08:00'),
    setTimer: ((callback: () => void, delay: number) => {
      delays.push(delay);
      return setTimeout(callback, 10_000);
    }) as typeof setTimeout
  });

  cancel();
  assert.deepEqual(delays, [2669750]);
});
