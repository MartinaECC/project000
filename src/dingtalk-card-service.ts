import { logger } from './logger.ts';

export type CardFetch = typeof fetch;

export type DingTalkInteractiveCardConfig = {
  clientId: string;
  clientSecret: string;
  robotCode?: string;
  cardTemplateId: string;
  callbackRouteKey?: string;
  apiBaseUrl?: string;
  mediaApiBaseUrl?: string;
};

export type RefundReportDeliveryTarget =
  | { type: 'single'; userId: string }
  | { type: 'group'; openConversationId: string };

export type RefundReportDeliveryMode = 'single' | 'group' | 'both';

export type RefundReportCardSender = {
  sendRefundReportCard(targets: RefundReportDeliveryTarget[], title: string, markdown: string): Promise<void>;
  sendRefundReportImageCard?(
    targets: RefundReportDeliveryTarget[],
    title: string,
    markdown: string,
    image: Buffer
  ): Promise<void>;
};

type AccessTokenResponse = {
  accessToken?: string;
  expireIn?: number;
};

export class DingTalkInteractiveCardSender implements RefundReportCardSender {
  readonly #config: Required<Pick<DingTalkInteractiveCardConfig, 'apiBaseUrl' | 'mediaApiBaseUrl'>> &
    Omit<DingTalkInteractiveCardConfig, 'apiBaseUrl' | 'mediaApiBaseUrl'>;
  readonly #fetch: CardFetch;
  #accessToken?: string;
  #accessTokenExpiresAt = 0;

  constructor(config: DingTalkInteractiveCardConfig, fetchImpl: CardFetch = fetch) {
    this.#config = {
      ...config,
      apiBaseUrl: trimTrailingSlash(config.apiBaseUrl ?? 'https://api.dingtalk.com'),
      mediaApiBaseUrl: trimTrailingSlash(config.mediaApiBaseUrl ?? deriveMediaApiBaseUrl(config.apiBaseUrl))
    };
    this.#fetch = fetchImpl;
  }

  async sendRefundReportCard(targets: RefundReportDeliveryTarget[], title: string, markdown: string): Promise<void> {
    if (targets.length === 0) {
      throw new Error('DingTalk delivery targets are required for refund report cards.');
    }
    if (!this.#config.cardTemplateId) {
      throw new Error('DingTalk cardTemplateId is required for refund report cards.');
    }

    const accessToken = await this.#getAccessToken();

    logger.info('dingtalk.card.send.started', {
      targetCount: targets.length,
      singleUserCount: targets.filter((target) => target.type === 'single').length,
      groupCount: targets.filter((target) => target.type === 'group').length,
      title,
      markdownLength: markdown.length
    });

    for (const [index, target] of targets.entries()) {
      const cardBizId = `refund-report-${Date.now()}-${index}-${targetKey(target)}`;
      const body = buildRefundReportCardBody({
        target,
        title,
        markdown,
        cardBizId,
        cardTemplateId: this.#config.cardTemplateId,
        callbackRouteKey: this.#config.callbackRouteKey,
        robotCode: this.#config.robotCode
      });

      const response = await this.#fetch(`${this.#config.apiBaseUrl}/v1.0/im/v1.0/robot/interactiveCards/send`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-acs-dingtalk-access-token': accessToken
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const responseBody = await response.text();
        throw new Error(`DingTalk interactive card send failed: ${response.status} ${responseBody}`);
      }
    }

    logger.info('dingtalk.card.send.completed', {
      targetCount: targets.length,
      singleUserCount: targets.filter((target) => target.type === 'single').length,
      groupCount: targets.filter((target) => target.type === 'group').length,
      title
    });
  }

  async sendRefundReportImageCard(
    targets: RefundReportDeliveryTarget[],
    title: string,
    markdown: string,
    image: Buffer
  ): Promise<void> {
    const imageRef = await this.uploadImage(image);
    const imageMarkdown = `![${title}](${imageRef})`;
    await this.sendRefundReportCard(targets, title, markdown.trim() ? `${markdown}\n\n${imageMarkdown}` : imageMarkdown);
  }

  async uploadImage(image: Buffer, filename = 'refund-report.png'): Promise<string> {
    const accessToken = await this.#getAccessToken();
    const form = new FormData();
    form.set('media', new Blob([new Uint8Array(image)], { type: 'image/png' }), filename);

    const response = await this.#fetch(`${this.#config.mediaApiBaseUrl}/media/upload?access_token=${encodeURIComponent(accessToken)}&type=image`, {
      method: 'POST',
      body: form
    });
    const responseBody = await response.text();
    if (!response.ok) {
      throw new Error(`DingTalk media upload failed: ${response.status} ${responseBody}`);
    }

    const parsed = JSON.parse(responseBody) as {
      errcode?: number;
      errmsg?: string;
      media_id?: string;
      mediaId?: string;
      downloadUrl?: string;
      url?: string;
    };
    if (parsed.errcode && parsed.errcode !== 0) {
      throw new Error(`DingTalk media upload failed: ${parsed.errcode} ${parsed.errmsg ?? responseBody}`);
    }
    const imageRef = parsed.downloadUrl ?? parsed.url ?? parsed.media_id ?? parsed.mediaId;
    if (!imageRef) {
      throw new Error(`DingTalk media upload response missing media id: ${responseBody}`);
    }
    return imageRef;
  }

  async #getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.#accessToken && now < this.#accessTokenExpiresAt) {
      return this.#accessToken;
    }

    const response = await this.#fetch(`${this.#config.apiBaseUrl}/v1.0/oauth2/accessToken`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        appKey: this.#config.clientId,
        appSecret: this.#config.clientSecret
      })
    });

    const responseBody = await response.text();
    if (!response.ok) {
      throw new Error(`DingTalk access token request failed: ${response.status} ${responseBody}`);
    }

    const parsed = JSON.parse(responseBody) as AccessTokenResponse;
    if (!parsed.accessToken) {
      throw new Error(`DingTalk access token response missing accessToken: ${responseBody}`);
    }

    this.#accessToken = parsed.accessToken;
    this.#accessTokenExpiresAt = now + Math.max((parsed.expireIn ?? 7200) - 120, 60) * 1000;
    return parsed.accessToken;
  }
}

export function buildRefundReportCardBody(options: {
  target: RefundReportDeliveryTarget;
  title: string;
  markdown: string;
  cardBizId: string;
  cardTemplateId: string;
  callbackRouteKey?: string;
  robotCode?: string;
}): Record<string, unknown> {
  const targetFields =
    options.target.type === 'single'
      ? { singleChatReceiver: JSON.stringify({ userId: options.target.userId }) }
      : { openConversationId: options.target.openConversationId };

  return removeUndefined({
    cardTemplateId: options.cardTemplateId,
    ...targetFields,
    cardBizId: options.cardBizId,
    callbackRouteKey: options.callbackRouteKey,
    robotCode: options.robotCode,
    cardData: JSON.stringify(buildStandardCardData(options.title, options.markdown))
  });
}

export function buildStandardCardData(title: string, markdown: string): Record<string, unknown> {
  return {
    config: {
      autoLayout: true,
      enableForward: true
    },
    header: {
      title: {
        type: 'text',
        text: title
      }
    },
    contents: [
      {
        type: 'markdown',
        text: markdown,
        id: 'refund_report_content'
      }
    ]
  };
}

function removeUndefined(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter((entry) => entry[1] !== undefined));
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, '');
}

function targetKey(target: RefundReportDeliveryTarget): string {
  return target.type === 'single' ? `u-${target.userId}` : `g-${target.openConversationId}`;
}

function deriveMediaApiBaseUrl(apiBaseUrl: string | undefined): string {
  const trimmed = trimTrailingSlash(apiBaseUrl ?? 'https://api.dingtalk.com');
  return trimmed === 'https://api.dingtalk.com' ? 'https://oapi.dingtalk.com' : trimmed;
}
