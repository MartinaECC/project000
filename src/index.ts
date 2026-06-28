import { BotService } from './bot-service.ts';
import { loadConfig } from './config.ts';
import { JsonlCustomerLedgerStore, LarkCliCustomerLedgerWriter } from './customer-ledger.ts';
import { DingTalkInteractiveCardSender } from './dingtalk-card-service.ts';
import { DingTalkRobotMediaResolver } from './dingtalk-media.ts';
import { DingTalkRobotReactionService } from './dingtalk-reaction.ts';
import { loadEnvFile } from './env-file.ts';
import { JsonlIntakeStore } from './intake-store.ts';
import { logger } from './logger.ts';
import { OpenAiCompatibleLlmAgent } from './llm-agent.ts';
import { ConsoleReplyService, DwsReplyService } from './reply-service.ts';
import {
  buildRefundReportTargets,
  describeRefundReportTargets,
  validateRefundReportTargets
} from './refund-report-targets.ts';
import { PythonRefundReportSource, startHourlyRefundReport } from './refund-report.ts';
import { createBotHttpServer } from './server.ts';
import { startDingTalkStreamClient } from './stream-client.ts';
import { StreamWebhookReplyService } from './stream-reply-service.ts';
import { DwsToolRegistry } from './tool-registry.ts';

loadEnvFile(envFilePath());

const config = loadConfig();
logger.info('config.loaded', {
  appRole: config.appRole,
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
  intake: {
    enabled: config.intake?.enabled ?? false,
    storageDir: config.intake?.storageDir,
    mode: config.intake?.mode,
    appRole: config.intake?.appRole
  },
  customerLedger: {
    enabled: config.customerLedger?.enabled ?? false,
    storageDir: config.customerLedger?.storageDir,
    hasLarkCliBin: Boolean(config.customerLedger?.larkCliBin),
    hasWikiParentNodeToken: Boolean(config.customerLedger?.wikiParentNodeToken),
    hasSpaceId: Boolean(config.customerLedger?.spaceId),
    dateFormat: config.customerLedger?.dateFormat
  },
  refundReport: {
    enabled: config.refundReport?.enabled ?? false,
    deliveryTarget: config.refundReport?.deliveryTarget,
    userCount: config.refundReport?.userIds.length ?? 0,
    hasGroupConversationId: Boolean(config.refundReport?.groupConversationId),
    cardTemplateId: config.refundReport?.cardTemplateId,
    thresholdPercent: config.refundReport?.thresholdPercent,
    timezone: config.refundReport?.timezone,
    renderMode: config.refundReport?.renderMode,
    llmOnAnomaly: config.refundReport?.llmOnAnomaly
  },
  reaction: {
    enabled: config.reaction?.enabled ?? false,
    emotionName: config.reaction?.emotionName,
    emotionType: config.reaction?.emotionType,
    text: config.reaction?.text
  },
  llm: {
    baseUrl: config.llm.baseUrl,
    model: config.llm.model,
    hasApiKey: Boolean(config.llm.apiKey)
  }
});

const tools = new DwsToolRegistry(config.dwsBin, undefined, config.groupSummaryLimits);
const llm = new OpenAiCompatibleLlmAgent(config.llm);
const intakeStore = config.intake?.enabled ? new JsonlIntakeStore(config.intake.storageDir, config.intake.appRole) : undefined;
const customerLedgerEnabled =
  config.customerLedger?.enabled && config.customerLedger.wikiParentNodeToken && config.customerLedger.spaceId;
if (config.customerLedger?.enabled && !customerLedgerEnabled) {
  logger.warn('customer_ledger.disabled', {
    reason: 'missing CUSTOMER_LEDGER_WIKI_PARENT_NODE_TOKEN or CUSTOMER_LEDGER_SPACE_ID'
  });
}
const customerLedgerStore = customerLedgerEnabled
  ? new JsonlCustomerLedgerStore(config.customerLedger.storageDir, config.customerLedger.appRole)
  : undefined;
const customerLedgerWriter = customerLedgerEnabled
  ? new LarkCliCustomerLedgerWriter({
      larkCliBin: config.customerLedger.larkCliBin,
      spaceId: config.customerLedger.spaceId as string,
      parentNodeToken: config.customerLedger.wikiParentNodeToken as string
    })
  : undefined;
const customerLedgerImageResolver =
  customerLedgerEnabled && config.dingtalkClientId && config.dingtalkClientSecret && config.dingtalkBotId
    ? new DingTalkRobotMediaResolver({
        clientId: config.dingtalkClientId,
        clientSecret: config.dingtalkClientSecret,
        robotCode: config.dingtalkBotId
      })
    : undefined;
if (customerLedgerEnabled && !customerLedgerImageResolver) {
  logger.warn('customer_ledger.image_resolver.disabled', {
    reason: 'missing DINGTALK_CLIENT_ID, DINGTALK_CLIENT_SECRET, or DINGTALK_BOT_ID'
  });
}

const reactionService =
  config.reaction?.enabled && config.dingtalkClientId && config.dingtalkClientSecret && config.dingtalkBotId
    ? new DingTalkRobotReactionService({
        clientId: config.dingtalkClientId,
        clientSecret: config.dingtalkClientSecret,
        robotCode: config.dingtalkBotId,
        apiBaseUrl: config.reaction.apiBaseUrl,
        emotionName: config.reaction.emotionName,
        emotionType: config.reaction.emotionType,
        text: config.reaction.text
      })
    : undefined;
if (config.reaction?.enabled && !reactionService) {
  logger.warn('dingtalk.reaction.disabled', {
    reason: 'missing DINGTALK_CLIENT_ID, DINGTALK_CLIENT_SECRET, or DINGTALK_BOT_ID'
  });
}

if (config.refundReport?.enabled) {
  const targetValidationError = validateRefundReportTargets(config.refundReport);
  const refundReportTargets = buildRefundReportTargets(config.refundReport);
  const targetSummary = describeRefundReportTargets(refundReportTargets);

  if (!config.dingtalkClientId || !config.dingtalkClientSecret) {
    logger.warn('refund_report.disabled', { reason: 'missing DINGTALK_CLIENT_ID or DINGTALK_CLIENT_SECRET' });
  } else if (targetValidationError) {
    logger.warn('refund_report.disabled', { reason: targetValidationError });
  } else {
    startHourlyRefundReport({
      source: new PythonRefundReportSource(),
      sender: new DingTalkInteractiveCardSender({
        clientId: config.dingtalkClientId,
        clientSecret: config.dingtalkClientSecret,
        robotCode: config.dingtalkBotId,
        cardTemplateId: config.refundReport.cardTemplateId,
        callbackRouteKey: config.refundReport.cardCallbackRouteKey,
        apiBaseUrl: config.refundReport.cardApiBaseUrl
      }),
      targets: refundReportTargets,
      thresholdPercent: config.refundReport.thresholdPercent,
      timezone: config.refundReport.timezone,
      renderMode: config.refundReport.renderMode,
      llm,
      llmOnAnomaly: config.refundReport.llmOnAnomaly
    });
    logger.info('refund_report.started', {
      deliveryTarget: config.refundReport.deliveryTarget,
      ...targetSummary,
      cardTemplateId: config.refundReport.cardTemplateId,
      thresholdPercent: config.refundReport.thresholdPercent,
      timezone: config.refundReport.timezone,
      renderMode: config.refundReport.renderMode
    });
  }
}

if (config.mode === 'http') {
  const replyService = config.dingtalkBotId
    ? new DwsReplyService(config.dwsBin, config.dingtalkBotId, undefined, config.dingtalkReplyMode)
    : new ConsoleReplyService();
  const service = new BotService(
    config,
    tools,
    llm,
    replyService,
    undefined,
    undefined,
    intakeStore,
    customerLedgerStore,
    customerLedgerWriter,
    customerLedgerImageResolver,
    reactionService
  );

  createBotHttpServer(service).listen(config.port, () => {
    logger.info('server.started', {
      url: `http://127.0.0.1:${config.port}`
    });
  });
} else {
  const streamReplyService = new StreamWebhookReplyService(async () => streamClient.getAccessToken());
  const service = new BotService(
    config,
    tools,
    llm,
    streamReplyService,
    undefined,
    undefined,
    intakeStore,
    customerLedgerStore,
    customerLedgerWriter,
    customerLedgerImageResolver,
    reactionService
  );

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

function envFilePath(): string {
  const argIndex = process.argv.indexOf('--env-file');
  if (argIndex !== -1 && process.argv[argIndex + 1]) {
    return process.argv[argIndex + 1];
  }

  const inlineArg = process.argv.find((arg) => arg.startsWith('--env-file='));
  if (inlineArg) {
    return inlineArg.slice('--env-file='.length);
  }

  return process.env.DINGTALK_ENV_FILE ?? '.env';
}
