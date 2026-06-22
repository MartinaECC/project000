import { DingTalkInteractiveCardSender } from './dingtalk-card-service.ts';
import type { RefundReportCardSender } from './dingtalk-card-service.ts';
import { loadConfig } from './config.ts';
import { loadEnvFile } from './env-file.ts';
import { OpenAiCompatibleLlmAgent } from './llm-agent.ts';
import {
  buildRefundReportTargets,
  describeRefundReportTargets,
  validateRefundReportTargets
} from './refund-report-targets.ts';
import { PythonRefundReportSource, sendRefundReportOnce } from './refund-report.ts';
import type { RefundReportSource } from './refund-report.ts';

export type RefundReportOnceLog = Record<string, unknown>;

export type RefundReportOnceOptions = {
  env?: NodeJS.ProcessEnv;
  envFilePath?: string;
  source?: RefundReportSource;
  sender?: RefundReportCardSender;
  now?: Date;
  log?: (record: RefundReportOnceLog) => void;
};

export async function runRefundReportOnceFromEnv(options: RefundReportOnceOptions = {}): Promise<void> {
  const env = options.env ?? process.env;
  loadEnvFile(options.envFilePath ?? '.env', env);
  const config = loadConfig(env);
  const generatedAt = options.now ?? new Date();

  requireValue(config.dingtalkClientId, 'DINGTALK_CLIENT_ID');
  requireValue(config.dingtalkClientSecret, 'DINGTALK_CLIENT_SECRET');
  requireValue(config.dingtalkBotId, 'DINGTALK_BOT_ID');
  const targetValidationError = validateRefundReportTargets(config.refundReport);
  if (targetValidationError) {
    throw new Error(targetValidationError);
  }
  const targets = buildRefundReportTargets(config.refundReport);
  const targetSummary = describeRefundReportTargets(targets);

  if (!options.source) {
    requireValue(env.DATAFINDER_APP_ID, 'DATAFINDER_APP_ID');
    requireValue(env.DATAFINDER_ACCESS_KEY, 'DATAFINDER_ACCESS_KEY');
    requireValue(env.DATAFINDER_SECRET_KEY, 'DATAFINDER_SECRET_KEY');
  }

  const sender =
    options.sender ??
    new DingTalkInteractiveCardSender({
      clientId: config.dingtalkClientId,
      clientSecret: config.dingtalkClientSecret,
      robotCode: config.dingtalkBotId,
      cardTemplateId: config.refundReport.cardTemplateId,
      callbackRouteKey: config.refundReport.cardCallbackRouteKey,
      apiBaseUrl: config.refundReport.cardApiBaseUrl
    });

  await sendRefundReportOnce({
    source: options.source ?? new PythonRefundReportSource(),
    sender,
    targets,
    thresholdPercent: config.refundReport.thresholdPercent,
    timezone: config.refundReport.timezone,
    renderMode: config.refundReport.renderMode,
    llm: new OpenAiCompatibleLlmAgent(config.llm),
    llmOnAnomaly: config.refundReport.llmOnAnomaly,
    now: generatedAt
  });

  options.log?.({
    ok: true,
    event: 'refund_report.once.completed',
    renderMode: config.refundReport.renderMode,
    deliveryTarget: config.refundReport.deliveryTarget,
    ...targetSummary,
    timezone: config.refundReport.timezone,
    thresholdPercent: config.refundReport.thresholdPercent,
    generatedAt: generatedAt.toISOString()
  });
}

function requireValue(value: string | undefined, name: string): void {
  if (!value) {
    throw new Error(`${name} is required`);
  }
}
