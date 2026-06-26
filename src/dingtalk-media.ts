import { logger } from './logger.ts';
import type { BotEvent, CustomerLedgerImageResolver } from './types.ts';

export type DingTalkRobotMediaResolverConfig = {
  clientId: string;
  clientSecret: string;
  robotCode: string;
  apiBaseUrl?: string;
};

type AccessTokenResponse = {
  accessToken?: string;
  expireIn?: number;
};

type MessageFileDownloadResponse = {
  downloadUrl?: string;
  downloadURL?: string;
  url?: string;
};

export class DingTalkRobotMediaResolver implements CustomerLedgerImageResolver {
  readonly #config: Required<DingTalkRobotMediaResolverConfig>;
  readonly #fetch: typeof fetch;
  #accessToken?: string;
  #accessTokenExpiresAt = 0;

  constructor(config: DingTalkRobotMediaResolverConfig, fetchImpl: typeof fetch = fetch) {
    this.#config = {
      ...config,
      apiBaseUrl: trimTrailingSlash(config.apiBaseUrl ?? 'https://api.dingtalk.com')
    };
    this.#fetch = fetchImpl;
  }

  async resolveImageUrls(attachments: NonNullable<BotEvent['attachments']>): Promise<string[]> {
    const urls: string[] = [];
    for (const attachment of attachments) {
      if (attachment.url) {
        urls.push(attachment.url);
        continue;
      }

      const downloadCode = attachment.downloadCode ?? attachment.pictureDownloadCode;
      if (!downloadCode) {
        logger.warn('dingtalk.media.image.skipped', {
          reason: 'missing_download_code',
          hasMediaId: Boolean(attachment.mediaId)
        });
        continue;
      }

      urls.push(await this.#downloadUrl(downloadCode));
    }

    return [...new Set(urls)];
  }

  async #downloadUrl(downloadCode: string): Promise<string> {
    const accessToken = await this.#getAccessToken();
    const response = await this.#fetch(`${this.#config.apiBaseUrl}/v1.0/robot/messageFiles/download`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-acs-dingtalk-access-token': accessToken
      },
      body: JSON.stringify({
        robotCode: this.#config.robotCode,
        downloadCode
      })
    });

    const responseBody = await response.text();
    if (!response.ok) {
      throw new Error(`DingTalk message file download URL request failed: ${response.status} ${responseBody}`);
    }

    const parsed = JSON.parse(responseBody) as MessageFileDownloadResponse;
    const downloadUrl = parsed.downloadUrl ?? parsed.downloadURL ?? parsed.url;
    if (!downloadUrl) {
      throw new Error(`DingTalk message file download response missing downloadUrl: ${responseBody}`);
    }
    return downloadUrl;
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

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, '');
}
