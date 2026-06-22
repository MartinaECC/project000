import type { RefundReportDeliveryMode, RefundReportDeliveryTarget } from './dingtalk-card-service.ts';

export type RefundReportTargetSettings = {
  deliveryTarget: RefundReportDeliveryMode;
  userIds: string[];
  groupConversationId?: string;
};

export function buildRefundReportTargets(settings: RefundReportTargetSettings): RefundReportDeliveryTarget[] {
  const targets: RefundReportDeliveryTarget[] = [];

  if (settings.deliveryTarget === 'single' || settings.deliveryTarget === 'both') {
    targets.push(...settings.userIds.map((userId) => ({ type: 'single' as const, userId })));
  }

  if (settings.deliveryTarget === 'group' || settings.deliveryTarget === 'both') {
    if (settings.groupConversationId) {
      targets.push({ type: 'group', openConversationId: settings.groupConversationId });
    }
  }

  return targets;
}

export function validateRefundReportTargets(settings: RefundReportTargetSettings): string | undefined {
  if ((settings.deliveryTarget === 'single' || settings.deliveryTarget === 'both') && settings.userIds.length === 0) {
    return 'missing REFUND_REPORT_USER_IDS';
  }
  if ((settings.deliveryTarget === 'group' || settings.deliveryTarget === 'both') && !settings.groupConversationId) {
    return 'missing REFUND_REPORT_GROUP_CONVERSATION_ID or DINGTALK_DEFAULT_GROUP_CONVERSATION_ID';
  }
  return undefined;
}

export function describeRefundReportTargets(targets: RefundReportDeliveryTarget[]): {
  targetCount: number;
  singleUserCount: number;
  groupCount: number;
} {
  return {
    targetCount: targets.length,
    singleUserCount: targets.filter((target) => target.type === 'single').length,
    groupCount: targets.filter((target) => target.type === 'group').length
  };
}
