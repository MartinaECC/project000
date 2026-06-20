import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runRefundReportOnceFromEnv } from '../src/refund-report-runner.ts';

const cleanDiagnostics = {
  incomeRows: 1,
  refundRows: 1,
  incomeBadRows: [],
  refundBadRows: [],
  incomeTruncated: false,
  refundTruncated: false
};

test('single-run refund report fails clearly when required DingTalk env is missing', async () => {
  await assert.rejects(
    () =>
      runRefundReportOnceFromEnv({
        envFilePath: '__missing__.env',
        env: {
          REFUND_REPORT_USER_IDS: 'user-1',
          DATAFINDER_APP_ID: 'app-1',
          DATAFINDER_ACCESS_KEY: 'ak-1',
          DATAFINDER_SECRET_KEY: 'sk-1'
        }
      }),
    /DINGTALK_CLIENT_ID is required/
  );
});

test('single-run refund report passes render mode, user ids, threshold, and timezone from env', async () => {
  const sent: Array<{ users: string[]; title: string; markdown: string; image?: Buffer }> = [];
  const logs: Array<Record<string, unknown>> = [];

  await runRefundReportOnceFromEnv({
    envFilePath: '__missing__.env',
    env: {
      DINGTALK_CLIENT_ID: 'client-1',
      DINGTALK_CLIENT_SECRET: 'secret-1',
      DINGTALK_BOT_ID: 'robot-1',
      REFUND_REPORT_USER_IDS: 'user-1,user-2',
      REFUND_REPORT_CARD_TEMPLATE_ID: 'StandardCard',
      REFUND_REPORT_RENDER_MODE: 'image',
      REFUND_REPORT_THRESHOLD_PERCENT: '12',
      REFUND_REPORT_TIMEZONE: 'Asia/Shanghai',
      REFUND_REPORT_LLM_ON_ANOMALY: 'never'
    },
    source: {
      async load(now) {
        assert.equal(now?.toISOString(), '2026-06-20T13:34:44.000Z');
        return {
          rows: [{ company: '宜信', incomeAmount: 100, refundAmount: 10, incomeCount: 10, refundCount: 1, refundRate: 10 }],
          diagnostics: cleanDiagnostics
        };
      }
    },
    sender: {
      async sendRefundReportCard() {
        throw new Error('markdown sender should not be called in image mode');
      },
      async sendRefundReportImageCard(users, title, markdown, image) {
        sent.push({ users, title, markdown, image });
      }
    },
    now: new Date('2026-06-20T21:34:44+08:00'),
    log(record) {
      logs.push(record);
    }
  });

  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].users, ['user-1', 'user-2']);
  assert.equal(sent[0].title, '退费率播报');
  assert.equal(sent[0].image?.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.match(sent[0].markdown, /时间: 2026-06-20 21:34:44/);
  assert.deepEqual(logs.at(-1), {
    ok: true,
    event: 'refund_report.once.completed',
    renderMode: 'image',
    userCount: 2,
    timezone: 'Asia/Shanghai',
    thresholdPercent: 12,
    generatedAt: '2026-06-20T13:34:44.000Z'
  });
});

test('single-run script is independent from the long-running Stream service entrypoint', async () => {
  const script = await readFile('scripts/send_refund_report_once.mjs', 'utf8');

  assert.match(script, /runRefundReportOnceFromEnv/);
  assert.doesNotMatch(script, /src\/index\.ts|startHourlyRefundReport|startDingTalkStreamClient|createBotHttpServer/);
});
