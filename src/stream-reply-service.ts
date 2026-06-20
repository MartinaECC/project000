import { errorFields, logger } from './logger.ts';
import type { BotEvent, ReplyService } from './types.ts';

export type AccessTokenProvider = () => Promise<string>;
export type FetchLike = typeof fetch;

type StreamRobotRaw = {
  sessionWebhook?: string;
  senderStaffId?: string;
};

export class StreamWebhookReplyService implements ReplyService {
  readonly #getAccessToken: AccessTokenProvider;
  readonly #fetch: FetchLike;

  constructor(getAccessToken: AccessTokenProvider, fetchImpl: FetchLike = fetch) {
    this.#getAccessToken = getAccessToken;
    this.#fetch = fetchImpl;
  }

  async sendText(event: BotEvent, text: string): Promise<void> {
    const raw = event.raw as StreamRobotRaw;
    if (!raw.sessionWebhook) {
      throw new Error('DingTalk stream sessionWebhook is missing from robot message.');
    }

    const accessToken = await this.#getAccessToken();
    logger.info('stream.reply.started', {
      messageId: event.messageId,
      conversationId: event.conversationId,
      senderId: event.senderId,
      textLength: text.length
    });

    const response = await this.#fetch(raw.sessionWebhook, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-acs-dingtalk-access-token': accessToken
      },
      body: JSON.stringify({
        msgtype: 'text',
        text: { content: text },
        at: {
          atUserIds: [raw.senderStaffId || event.senderId],
          isAtAll: false
        }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error('stream.reply.failed', {
        messageId: event.messageId,
        status: response.status,
        responseBody: body
      });
      throw new Error(`DingTalk stream webhook reply failed: ${response.status} ${body}`);
    }

    logger.info('stream.reply.completed', {
      messageId: event.messageId,
      status: response.status
    });
  }
}

export function logStreamReplyError(error: unknown, messageId: string): void {
  logger.error('stream.reply.unhandled_failed', {
    messageId,
    ...errorFields(error)
  });
}
