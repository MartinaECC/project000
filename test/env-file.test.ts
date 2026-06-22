import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEnvFile } from '../src/env-file.ts';
import { loadConfig } from '../src/config.ts';

test('parses dotenv style key values without overriding existing env', () => {
  const parsed = parseEnvFile(`
PORT=3099
DINGTALK_BOT_ID=ding3cv0e5gguron10zy
LLM_BASE_URL="https://example.com/v1"
EMPTY=
# ignored
`);

  assert.deepEqual(parsed, {
    PORT: '3099',
    DINGTALK_BOT_ID: 'ding3cv0e5gguron10zy',
    LLM_BASE_URL: 'https://example.com/v1',
    EMPTY: ''
  });
});

test('loads refund report configuration from env', () => {
  const config = loadConfig({
    REFUND_REPORT_ENABLED: 'true',
    REFUND_REPORT_DELIVERY_TARGET: 'both',
    REFUND_REPORT_USER_IDS: 'user-1,user-2',
    REFUND_REPORT_GROUP_CONVERSATION_ID: 'cid-1',
    REFUND_REPORT_CARD_TEMPLATE_ID: 'template-1',
    REFUND_REPORT_CARD_CALLBACK_ROUTE_KEY: 'refund-report',
    DINGTALK_API_BASE_URL: 'https://example.dingtalk.test',
    REFUND_REPORT_RENDER_MODE: 'image',
    REFUND_REPORT_THRESHOLD_PERCENT: '30',
    REFUND_REPORT_TIMEZONE: 'Asia/Shanghai',
    REFUND_REPORT_LLM_ON_ANOMALY: 'fail_or_threshold'
  });

  assert.deepEqual(config.refundReport, {
    enabled: true,
    deliveryTarget: 'both',
    userIds: ['user-1', 'user-2'],
    groupConversationId: 'cid-1',
    cardTemplateId: 'template-1',
    cardCallbackRouteKey: 'refund-report',
    cardApiBaseUrl: 'https://example.dingtalk.test',
    renderMode: 'image',
    thresholdPercent: 30,
    timezone: 'Asia/Shanghai',
    llmOnAnomaly: 'fail_or_threshold'
  });
});

test('loads intake configuration from env without enabling refund report', () => {
  const config = loadConfig({
    APP_ROLE: 'ecocc_intake',
    INTAKE_ENABLED: 'true',
    INTAKE_STORAGE_DIR: 'E:\\KnowledgeBase\\00-Inbox\\DingTalk',
    INTAKE_MODE: 'tagged',
    REFUND_REPORT_ENABLED: 'false',
    PORT: '3003'
  });

  assert.equal(config.port, 3003);
  assert.equal(config.appRole, 'ecocc_intake');
  assert.deepEqual(config.intake, {
    enabled: true,
    storageDir: 'E:\\KnowledgeBase\\00-Inbox\\DingTalk',
    mode: 'tagged',
    appRole: 'ecocc_intake'
  });
  assert.equal(config.refundReport?.enabled, false);
});
