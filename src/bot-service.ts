import { InMemoryApprovalStore } from './approval-store.ts';
import { InMemoryIdempotencyStore } from './idempotency-store.ts';
import { routeIntent } from './intent-router.ts';
import { errorFields, logger } from './logger.ts';
import type { BotConfig, BotEvent, HandleResult, LlmAgent, ReplyService, ToolRegistry } from './types.ts';

export class BotService {
  readonly #config: BotConfig;
  readonly #tools: ToolRegistry;
  readonly #llm: LlmAgent;
  readonly #reply: ReplyService;
  readonly #approvals: InMemoryApprovalStore;
  readonly #idempotency: InMemoryIdempotencyStore;

  constructor(
    config: BotConfig,
    tools: ToolRegistry,
    llm: LlmAgent,
    reply: ReplyService,
    approvals = new InMemoryApprovalStore(),
    idempotency = new InMemoryIdempotencyStore()
  ) {
    this.#config = config;
    this.#tools = tools;
    this.#llm = llm;
    this.#reply = reply;
    this.#approvals = approvals;
    this.#idempotency = idempotency;
  }

  async handleEvent(event: BotEvent): Promise<HandleResult> {
    if (!this.#isAllowed(event)) {
      logger.warn('bot.event.denied', eventLogFields(event));
      await this.#reply.sendText(event, '当前会话未授权使用此机器人。');
      return { status: 'denied' };
    }

    if (!this.#idempotency.claim(event.messageId)) {
      logger.info('bot.event.duplicate', eventLogFields(event));
      return { status: 'duplicate' };
    }

    const intent = routeIntent(event.text);
    logger.info('bot.intent.routed', {
      ...eventLogFields(event),
      intentType: intent.type,
      range: intent.type === 'summarize_group' ? intent.range : undefined
    });

    if (intent.type === 'summarize_group') {
      return this.#summarizeAllGroups(event, intent.range);
    }

    logger.info('bot.chat.started', {
      ...eventLogFields(event),
      textLength: event.text.length
    });
    const answer = await this.#llm.chat(event.text);
    logger.info('bot.chat.completed', {
      messageId: event.messageId,
      answerLength: answer.length
    });

    await this.#reply.sendText(event, answer);
    logger.info('bot.reply.sent', eventLogFields(event));

    return { status: 'handled' };
  }

  async confirmLatest(event: BotEvent): Promise<HandleResult> {
    return this.handleEvent(event);
  }

  async #summarizeAllGroups(event: BotEvent, range: 'today' | 'this_week'): Promise<HandleResult> {
    logger.info('group.summary.started', {
      ...eventLogFields(event),
      target: 'all_groups',
      range
    });

    try {
      const messages = await this.#tools.searchAllGroupMessages(range);
      logger.info('dws.group.messages.loaded', {
        ...eventLogFields(event),
        target: 'all_groups',
        range,
        messageCount: messages.length
      });

      const answer = messages.length > 0 ? await this.#llm.summarizeGroup(messages) : '这个时间范围内没有查到可总结的群消息。';
      logger.info('group.summary.completed', {
        ...eventLogFields(event),
        target: 'all_groups',
        range,
        answerLength: answer.length
      });

      await this.#reply.sendText(event, answer);
      logger.info('bot.reply.sent', eventLogFields(event));
      return { status: 'handled' };
    } catch (error) {
      logger.error('group.summary.failed', {
        ...eventLogFields(event),
        target: 'all_groups',
        range,
        ...errorFields(error)
      });
      await this.#reply.sendText(event, `群消息总结失败：${String(error)}`);
      return { status: 'handled' };
    }
  }

  #isAllowed(event: BotEvent): boolean {
    const conversationAllowed =
      this.#config.allowedConversationIds.length === 0 ||
      this.#config.allowedConversationIds.includes(event.conversationId);
    const userAllowed =
      !this.#config.allowedUserIds?.length || this.#config.allowedUserIds.includes(event.senderId);
    return conversationAllowed && userAllowed;
  }
}

function eventLogFields(event: BotEvent): Record<string, unknown> {
  return {
    messageId: event.messageId,
    conversationId: event.conversationId,
    senderId: event.senderId
  };
}
