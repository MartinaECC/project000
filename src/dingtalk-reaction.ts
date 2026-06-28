import { logger } from './logger.ts';
import type { BotEvent, ReactionService } from './types.ts';

export type DingTalkRobotReactionConfig = {
  clientId: string;
  clientSecret: string;
  robotCode: string;
  apiBaseUrl?: string;
  emotionName?: string;
  emotionType?: number;
  text?: string;
};

type AccessTokenResponse = {
  accessToken?: string;
  expireIn?: number;
};

type RobotEmotionReplyResponse = {
  success?: boolean;
};

export class DingTalkRobotReactionService implements ReactionService {
  readonly #config: Required<DingTalkRobotReactionConfig>;
  readonly #fetch: typeof fetch;
  #accessToken?: string;
  #accessTokenExpiresAt = 0;

  constructor(config: DingTalkRobotReactionConfig, fetchImpl: typeof fetch = fetch) {
    this.#config = {
      apiBaseUrl: trimTrailingSlash(config.apiBaseUrl ?? 'https://api.dingtalk.com'),
      emotionName: config.emotionName ?? 'get',
      emotionType: config.emotionType ?? 2,
      text: config.text ?? config.emotionName ?? 'get',
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      robotCode: config.robotCode
    };
    this.#fetch = fetchImpl;
  }

  async sendGetReaction(event: BotEvent): Promise<void> {
    const accessToken = await this.#getAccessToken();
    const body = {
      robotCode: this.#config.robotCode,
      openConversationId: event.conversationId,
      openMsgId: event.messageId,
      emotionName: this.#config.emotionName,
      emotionType: this.#config.emotionType,
      textEmotion: {
        emotionName: this.#config.emotionName,
        text: this.#config.text
      }
    };

    logger.info('dingtalk.reaction.started', {
      messageId: event.messageId,
      conversationId: event.conversationId,
      senderId: event.senderId,
      emotionName: this.#config.emotionName,
      text: this.#config.text
    });

    const response = await this.#fetch(`${this.#config.apiBaseUrl}/v1.0/robot/emotion/reply`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-acs-dingtalk-access-token': accessToken
      },
      body: JSON.stringify(body)
    });

    const responseBody = await response.text();
    if (!response.ok) {
      throw new Error(`DingTalk robot emotion reply failed: ${response.status} ${responseBody}`);
    }

    const parsed = parseJsonOrEmpty(responseBody) as RobotEmotionReplyResponse;
    if (parsed.success === false) {
      throw new Error(`DingTalk robot emotion reply returned unsuccessful response: ${responseBody}`);
    }

    logger.info('dingtalk.reaction.completed', {
      messageId: event.messageId,
      status: response.status
    });
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

function parseJsonOrEmpty(value: string): unknown {
  return value.trim() ? JSON.parse(value) : {};
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, '');
}
