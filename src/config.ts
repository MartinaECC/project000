import type { ReplyMode } from './reply-service.ts';
import type { BotConfig } from './types.ts';
import type { RefundReportDeliveryMode } from './dingtalk-card-service.ts';

export type AppConfig = BotConfig & {
  port: number;
  dwsBin: string;
  mode: 'stream' | 'http';
  dingtalkClientId?: string;
  dingtalkClientSecret?: string;
  dingtalkBotId?: string;
  dingtalkReplyMode: ReplyMode;
  llm: {
    apiKey?: string;
    baseUrl: string;
    model?: string;
  };
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 3000),
    dwsBin: env.DWS_BIN ?? 'dws',
    mode: env.DINGTALK_MODE === 'http' ? 'http' : 'stream',
    dingtalkClientId: env.DINGTALK_CLIENT_ID,
    dingtalkClientSecret: env.DINGTALK_CLIENT_SECRET,
    dingtalkBotId: env.DINGTALK_BOT_ID,
    dingtalkReplyMode: env.DINGTALK_REPLY_MODE === 'single' ? 'single' : 'group',
    allowedConversationIds: splitCsv(env.DINGTALK_ALLOWED_CONVERSATION_IDS),
    allowedUserIds: splitCsv(env.DINGTALK_ALLOWED_USER_IDS),
    defaultGroupConversationId: blankToUndefined(env.DINGTALK_DEFAULT_GROUP_CONVERSATION_ID),
    appRole: blankToUndefined(env.APP_ROLE),
    intake: {
      enabled: env.INTAKE_ENABLED === 'true',
      storageDir: blankToUndefined(env.INTAKE_STORAGE_DIR) ?? 'E:\\KnowledgeBase\\00-Inbox\\DingTalk',
      mode: 'tagged',
      appRole: blankToUndefined(env.APP_ROLE) ?? 'ecocc_intake'
    },
    customerLedger: {
      enabled: env.CUSTOMER_LEDGER_ENABLED === 'true',
      storageDir: blankToUndefined(env.CUSTOMER_LEDGER_STORAGE_DIR) ?? 'E:\\KnowledgeBase\\00-Inbox\\DingTalkCustomerLedger',
      appRole: blankToUndefined(env.CUSTOMER_LEDGER_APP_ROLE) ?? blankToUndefined(env.APP_ROLE) ?? 'customer_ledger',
      larkCliBin: blankToUndefined(env.CUSTOMER_LEDGER_LARK_CLI_BIN) ?? blankToUndefined(env.LARK_CLI_BIN),
      wikiParentNodeToken: blankToUndefined(env.CUSTOMER_LEDGER_WIKI_PARENT_NODE_TOKEN),
      spaceId: blankToUndefined(env.CUSTOMER_LEDGER_SPACE_ID),
      dateFormat: 'yyMMdd'
    },
    groupSummaryLimits: {
      today: numberEnv(env.DINGTALK_GROUP_SUMMARY_LIMIT_TODAY, 50),
      this_week: numberEnv(env.DINGTALK_GROUP_SUMMARY_LIMIT_WEEK, 100)
    },
    refundReport: {
      enabled: env.REFUND_REPORT_ENABLED === 'true',
      deliveryTarget: parseRefundReportDeliveryTarget(env.REFUND_REPORT_DELIVERY_TARGET),
      userIds: splitCsv(env.REFUND_REPORT_USER_IDS),
      groupConversationId:
        blankToUndefined(env.REFUND_REPORT_GROUP_CONVERSATION_ID) ??
        blankToUndefined(env.DINGTALK_DEFAULT_GROUP_CONVERSATION_ID),
      cardTemplateId: blankToUndefined(env.REFUND_REPORT_CARD_TEMPLATE_ID) ?? 'StandardCard',
      cardCallbackRouteKey: blankToUndefined(env.REFUND_REPORT_CARD_CALLBACK_ROUTE_KEY),
      cardApiBaseUrl: blankToUndefined(env.DINGTALK_API_BASE_URL),
      renderMode: parseRefundReportRenderMode(env.REFUND_REPORT_RENDER_MODE),
      thresholdPercent: numberEnv(env.REFUND_REPORT_THRESHOLD_PERCENT, 10),
      timezone: blankToUndefined(env.REFUND_REPORT_TIMEZONE) ?? 'Asia/Shanghai',
      llmOnAnomaly: parseRefundReportLlmPolicy(env.REFUND_REPORT_LLM_ON_ANOMALY)
    },
    reaction: {
      enabled: env.DINGTALK_REACTION_ENABLED === 'true',
      emotionName: blankToUndefined(env.DINGTALK_REACTION_EMOTION_NAME) ?? 'get',
      emotionType: numberEnv(env.DINGTALK_REACTION_EMOTION_TYPE, 2),
      text: blankToUndefined(env.DINGTALK_REACTION_TEXT) ?? 'get',
      apiBaseUrl: blankToUndefined(env.DINGTALK_API_BASE_URL)
    },
    llm: {
      apiKey: env.LLM_API_KEY,
      baseUrl: env.LLM_BASE_URL ?? 'https://api.openai.com/v1',
      model: env.LLM_MODEL
    }
  };
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function numberEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseRefundReportLlmPolicy(value: string | undefined): 'never' | 'fail_only' | 'fail_or_threshold' {
  return value === 'never' || value === 'fail_only' || value === 'fail_or_threshold' ? value : 'fail_or_threshold';
}

function parseRefundReportRenderMode(value: string | undefined): 'markdown' | 'image' {
  return value === 'image' ? 'image' : 'markdown';
}

function parseRefundReportDeliveryTarget(value: string | undefined): RefundReportDeliveryMode {
  return value === 'group' || value === 'both' ? value : 'single';
}

function splitCsv(value: string | undefined): string[] {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}
