import type { BotEvent, ReplyService } from './types.ts';
import { runDws, type DwsRunner } from './tool-registry.ts';

export type ReplyMode = 'group' | 'single';

const DEFAULT_REPLY_TITLE = '智能助手回复';

export class ConsoleReplyService implements ReplyService {
  async sendText(event: BotEvent, text: string): Promise<void> {
    console.log(JSON.stringify({ conversationId: event.conversationId, messageId: event.messageId, text }));
  }
}

export class DwsReplyService implements ReplyService {
  readonly #bin: string;
  readonly #robotCode: string;
  readonly #runner: DwsRunner;
  readonly #mode: ReplyMode;

  constructor(bin: string, robotCode: string, runner: DwsRunner = runDws, mode: ReplyMode = 'group') {
    this.#bin = bin;
    this.#robotCode = robotCode;
    this.#runner = runner;
    this.#mode = mode;
  }

  async sendText(event: BotEvent, text: string): Promise<void> {
    const targetArgs = this.#mode === 'single' ? ['--users', event.senderId] : ['--group', event.conversationId];
    await this.#send(targetArgs, DEFAULT_REPLY_TITLE, text);
  }

  async sendToUsers(userIds: string[], title: string, markdown: string): Promise<void> {
    if (userIds.length === 0) {
      throw new Error('DingTalk userIds are required for scheduled bot messages.');
    }
    await this.#send(['--users', userIds.join(',')], title, markdown);
  }

  async sendToGroup(conversationId: string, title: string, markdown: string): Promise<void> {
    if (!conversationId) {
      throw new Error('DingTalk group conversationId is required for scheduled bot messages.');
    }
    await this.#send(['--group', conversationId], title, markdown);
  }

  async #send(targetArgs: string[], title: string, text: string): Promise<void> {
    await this.#runner(this.#bin, [
      'chat',
      'message',
      'send-by-bot',
      '--robot-code',
      this.#robotCode,
      ...targetArgs,
      '--title',
      title,
      '--text',
      text,
      '--format',
      'json'
    ]);
  }
}
