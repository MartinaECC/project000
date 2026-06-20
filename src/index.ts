import { BotService } from './bot-service.ts';
import { loadConfig } from './config.ts';
import { loadEnvFile } from './env-file.ts';
import { logger } from './logger.ts';
import { OpenAiCompatibleLlmAgent } from './llm-agent.ts';
import { ConsoleReplyService, DwsReplyService } from './reply-service.ts';
import { PythonRefundReportSource, startHourlyRefundReport } from './refund-report.ts';
import { createBotHttpServer } from './server.ts';
import { startDingTalkStreamClient } from './stream-client.ts';
import { StreamWebhookReplyService } from './stream-reply-service.ts';
import { DwsToolRegistry } from './tool-registry.ts';

loadEnvFile();

const config = loadConfig();
logger.info('config.loaded', {
  mode: config.mode,
  port: config.port,
  dwsBin: config.dwsBin,
  dingtalkReplyMode: config.dingtalkReplyMode,
  hasDingTalkClientId: Boolean(config.dingtalkClientId),
  hasDingTalkClientSecret: Boolean(config.dingtalkClientSecret),
  hasDingTalkBotId: Boolean(config.dingtalkBotId),
  hasDefaultGroupConversationId: Boolean(config.defaultGroupConversationId),
  groupSummaryLimits: config.groupSummaryLimits,
  allowedConversationCount: config.allowedConversationIds.length,
  allowedUserCount: config.allowedUserIds?.length ?? 0,
  refundReport: {
    enabled: config.refundReport?.enabled ?? false,
    userCount: config.refundReport?.userIds.length ?? 0,
    thresholdPercent: config.refundReport?.thresholdPercent,
    timezone: config.refundReport?.timezone,
    llmOnAnomaly: config.refundReport?.llmOnAnomaly
  },
  llm: {
    baseUrl: config.llm.baseUrl,
    model: config.llm.model,
    hasApiKey: Boolean(config.llm.apiKey)
  }
});

const tools = new DwsToolRegistry(config.dwsBin, undefined, config.groupSummaryLimits);
const llm = new OpenAiCompatibleLlmAgent(config.llm);

if (config.refundReport?.enabled) {
  if (!config.dingtalkBotId) {
    logger.warn('refund_report.disabled', { reason: 'missing DINGTALK_BOT_ID' });
  } else if (config.refundReport.userIds.length === 0) {
    logger.warn('refund_report.disabled', { reason: 'missing REFUND_REPORT_USER_IDS' });
  } else {
    startHourlyRefundReport({
      source: new PythonRefundReportSource(),
      sender: new DwsReplyService(config.dwsBin, config.dingtalkBotId, undefined, 'single'),
      userIds: config.refundReport.userIds,
      thresholdPercent: config.refundReport.thresholdPercent,
      llm,
      llmOnAnomaly: config.refundReport.llmOnAnomaly
    });
    logger.info('refund_report.started', {
      userCount: config.refundReport.userIds.length,
      thresholdPercent: config.refundReport.thresholdPercent,
      timezone: config.refundReport.timezone
    });
  }
}

if (config.mode === 'http') {
  const replyService = config.dingtalkBotId
    ? new DwsReplyService(config.dwsBin, config.dingtalkBotId, undefined, config.dingtalkReplyMode)
    : new ConsoleReplyService();
  const service = new BotService(config, tools, llm, replyService);

  createBotHttpServer(service).listen(config.port, () => {
    logger.info('server.started', {
      url: `http://127.0.0.1:${config.port}`
    });
  });
} else {
  const streamReplyService = new StreamWebhookReplyService(async () => streamClient.getAccessToken());
  const service = new BotService(config, tools, llm, streamReplyService);

  createBotHttpServer(service).listen(config.port, () => {
    logger.info('server.started', {
      url: `http://127.0.0.1:${config.port}`,
      purpose: 'health-check-only'
    });
  });

  var streamClient = await startDingTalkStreamClient(
    {
      clientId: config.dingtalkClientId,
      clientSecret: config.dingtalkClientSecret
    },
    service
  );
}
