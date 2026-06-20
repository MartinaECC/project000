import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateAmountGroups,
  buildRefundReportRows,
  formatRefundReportMarkdown,
  formatRefundReportTextChunks,
  hasRefundReportAnomaly,
  msUntilNextHour,
  sendRefundReportOnce,
  startHourlyRefundReport
} from '../src/refund-report.ts';

test('aggregates amount groups using amount multiplied by event count', () => {
  const totals = aggregateAmountGroups([
    { company: '宜信', amount: '29.9', count: 2 },
    { company: '宜信', amount: 88, count: 1 },
    { company: '融呗', amount: '10', count: 3 }
  ]);

  assert.deepEqual(totals, {
    宜信: 147.8,
    融呗: 30
  });
});

test('builds refund report rows sorted by refund rate descending', () => {
  const rows = buildRefundReportRows(
    { 宜信: 100, 融呗: 0, 奇富数科: 200 },
    { 宜信: 25, 融呗: 10, 奇富数科: 20 }
  );

  assert.deepEqual(rows, [
    { company: '融呗', incomeAmount: 0, refundAmount: 10, refundRate: null },
    { company: '宜信', incomeAmount: 100, refundAmount: 25, refundRate: 25 },
    { company: '奇富数科', incomeAmount: 200, refundAmount: 20, refundRate: 10 }
  ]);
});

test('formats refund report markdown with money and uncomputable rates', () => {
  const markdown = formatRefundReportMarkdown(
    [
      { company: '宜信', incomeAmount: 843408.3, refundAmount: 170717.8, refundRate: 20.2414 },
      { company: '薇钱包', incomeAmount: 0, refundAmount: 1584, refundRate: null }
    ],
    new Date('2026-06-19T10:00:00+08:00')
  );

  assert.match(markdown, /2026-06-19 10:00/);
  assert.match(markdown, /\| 宜信 \| 843,408\.30 \| 170,717\.80 \| 20\.24% \|/);
  assert.match(markdown, /\| 薇钱包 \| 0\.00 \| 1,584\.00 \| 无法计算 \|/);
});

test('formats refund report text chunks for DingTalk bot visibility', () => {
  const chunks = formatRefundReportTextChunks(
    [
      { company: '宜信', incomeAmount: 843408.3, refundAmount: 170717.8, refundRate: 20.2414 },
      { company: '薇钱包', incomeAmount: 0, refundAmount: 1584, refundRate: null },
      { company: '融呗', incomeAmount: 100, refundAmount: 10, refundRate: 10 }
    ],
    new Date('2026-06-19T10:00:00+08:00'),
    undefined,
    2
  );

  assert.equal(chunks.length, 2);
  assert.match(chunks[0], /【正文第1\/2段】今日退费率报表/);
  assert.match(chunks[0], /宜信｜支付843,408\.30｜退费170,717\.80｜退费率20\.24%/);
  assert.match(chunks[0], /薇钱包｜支付0\.00｜退费1,584\.00｜退费率无法计算/);
  assert.doesNotMatch(chunks[0], /[\s|#*`]/u);
});

test('computes delay until the next top of hour', () => {
  assert.equal(msUntilNextHour(new Date('2026-06-19T10:15:30.250+08:00')), 2669750);
  assert.equal(msUntilNextHour(new Date('2026-06-19T10:00:00.000+08:00')), 3600000);
});

test('detects truncated, bad-row, and threshold refund report anomalies', () => {
  assert.equal(
    hasRefundReportAnomaly(
      {
        rows: [{ company: '宜信', incomeAmount: 100, refundAmount: 20, refundRate: 20 }],
        diagnostics: { incomeRows: 1, refundRows: 1, incomeBadRows: [], refundBadRows: [], incomeTruncated: false, refundTruncated: false }
      },
      20
    ),
    true
  );
  assert.equal(
    hasRefundReportAnomaly(
      {
        rows: [{ company: '宜信', incomeAmount: 100, refundAmount: 1, refundRate: 1 }],
        diagnostics: { incomeRows: 1, refundRows: 1, incomeBadRows: [{}], refundBadRows: [], incomeTruncated: false, refundTruncated: false }
      },
      20
    ),
    true
  );
});

test('sends normal refund reports without calling the LLM', async () => {
  let llmCalls = 0;
  const sent: Array<{ users: string[]; title: string; markdown: string }> = [];

  await sendRefundReportOnce({
    source: {
      async load() {
        return {
          rows: [{ company: '宜信', incomeAmount: 100, refundAmount: 1, refundRate: 1 }],
          diagnostics: { incomeRows: 1, refundRows: 1, incomeBadRows: [], refundBadRows: [], incomeTruncated: false, refundTruncated: false }
        };
      }
    },
    sender: {
      async sendToUsers(users, title, markdown) {
        sent.push({ users, title, markdown });
      }
    },
    userIds: ['user-1'],
    thresholdPercent: 20,
    llmOnAnomaly: 'fail_or_threshold',
    llm: {
      async chat() {
        llmCalls += 1;
        return '异常说明';
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
    },
    now: new Date('2026-06-19T10:00:00+08:00')
  });

  assert.equal(llmCalls, 0);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].users, ['user-1']);
  assert.match(sent[0].markdown, /宜信｜支付100\.00｜退费1\.00｜退费率1\.00%/);
  assert.doesNotMatch(sent[0].markdown, /[\s|#*`]/u);
});

test('summarizes high refund-rate reports with the LLM', async () => {
  const sent: string[] = [];

  await sendRefundReportOnce({
    source: {
      async load() {
        return {
          rows: [{ company: '宜信', incomeAmount: 100, refundAmount: 25, refundRate: 25 }],
          diagnostics: { incomeRows: 1, refundRows: 1, incomeBadRows: [], refundBadRows: [], incomeTruncated: false, refundTruncated: false }
        };
      }
    },
    sender: {
      async sendToUsers(_users, _title, markdown) {
        sent.push(markdown);
      }
    },
    userIds: ['user-1'],
    thresholdPercent: 20,
    llmOnAnomaly: 'fail_or_threshold',
    llm: {
      async chat() {
        return '宜信退费率达到 25%，超过阈值。';
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
    },
    now: new Date('2026-06-19T10:00:00+08:00')
  });

  assert.match(sent[0], /宜信退费率达到25%，超过阈值。/);
});

test('sends large refund reports as multiple bot-visible text chunks', async () => {
  const sent: string[] = [];
  const rows = Array.from({ length: 9 }, (_value, index) => ({
    company: `企业${index + 1}`,
    incomeAmount: 100,
    refundAmount: index,
    refundRate: index
  }));

  await sendRefundReportOnce({
    source: {
      async load() {
        return {
          rows,
          diagnostics: { incomeRows: 9, refundRows: 9, incomeBadRows: [], refundBadRows: [], incomeTruncated: false, refundTruncated: false }
        };
      }
    },
    sender: {
      async sendToUsers(_users, title, markdown) {
        sent.push(`${title}:${markdown}`);
      }
    },
    userIds: ['user-1'],
    thresholdPercent: 20,
    llmOnAnomaly: 'never',
    now: new Date('2026-06-19T10:00:00+08:00')
  });

  assert.equal(sent.length, 2);
  assert.match(sent[0], /今日退费率报表1\/2/);
  assert.match(sent[1], /今日退费率报表2\/2/);
  assert.match(sent[1], /企业9｜支付100\.00｜退费8\.00｜退费率8\.00%/);
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
      async sendToUsers() {
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
