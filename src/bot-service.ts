import { InMemoryApprovalStore } from './approval-store.ts';
import { InMemoryIdempotencyStore } from './idempotency-store.ts';
import { routeIntent } from './intent-router.ts';
import { errorFields, logger } from './logger.ts';
import type { BotConfig, BotEvent, HandleResult, IntakeStore, LlmAgent, ReplyService, ToolRegistry } from './types.ts';

export class BotService {
  readonly #config: BotConfig;
  readonly #tools: ToolRegistry;
  readonly #llm: LlmAgent;
  readonly #reply: ReplyService;
  readonly #approvals: InMemoryApprovalStore;
  readonly #idempotency: InMemoryIdempotencyStore;
  readonly #intakeStore?: IntakeStore;

  constructor(
    config: BotConfig,
    tools: ToolRegistry,
    llm: LlmAgent,
    reply: ReplyService,
    approvals = new InMemoryApprovalStore(),
    idempotency = new InMemoryIdempotencyStore(),
    intakeStore?: IntakeStore
  ) {
    this.#config = config;
    this.#tools = tools;
    this.#llm = llm;
    this.#reply = reply;
    this.#approvals = approvals;
    this.#idempotency = idempotency;
    this.#intakeStore = intakeStore;
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

    if (intent.type === 'capture_intake' && this.#config.intake?.enabled) {
      return this.#captureIntake(event, intent);
    }

    if (intent.type === 'list_recent_todos' && this.#config.intake?.enabled) {
      return this.#listRecentTodos(event, intent.days, intent.limit);
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

  async #captureIntake(
    event: BotEvent,
    intent: Extract<ReturnType<typeof routeIntent>, { type: 'capture_intake' }>
  ): Promise<HandleResult> {
    if (!this.#intakeStore) {
      logger.warn('intake.capture.disabled', {
        ...eventLogFields(event),
        reason: 'missing_intake_store',
        intakeType: intent.itemType
      });
      await this.#reply.sendText(event, '收集失败：信息收集服务未启用。');
      return { status: 'handled' };
    }

    try {
      const record = await this.#intakeStore.append({
        appRole: this.#config.intake?.appRole ?? this.#config.appRole ?? 'ecocc_intake',
        type: intent.itemType,
        conversationId: event.conversationId,
        senderId: event.senderId,
        messageId: event.messageId,
        text: intent.text || intent.rawText,
        rawText: intent.rawText
      });
      logger.info('intake.capture.saved', {
        ...eventLogFields(event),
        id: record.id,
        intakeType: record.type,
        textLength: record.text.length
      });
      const suffix = record.type === '风险' ? '，已标记需人工确认' : '';
      await this.#reply.sendText(event, `已收集：${record.type} ${record.id}${suffix}`);
      logger.info('bot.reply.sent', eventLogFields(event));
      return { status: 'handled' };
    } catch (error) {
      logger.error('intake.capture.failed', {
        ...eventLogFields(event),
        intakeType: intent.itemType,
        ...errorFields(error)
      });
      await this.#reply.sendText(event, `收集失败：${error instanceof Error ? error.message : String(error)}`);
      return { status: 'handled' };
    }
  }

  async #listRecentTodos(event: BotEvent, days: number, limit: number): Promise<HandleResult> {
    if (!this.#intakeStore) {
      logger.warn('intake.todo_list.disabled', {
        ...eventLogFields(event),
        reason: 'missing_intake_store'
      });
      await this.#reply.sendText(event, '待办整理失败：信息收集服务未启用。');
      return { status: 'handled' };
    }

    try {
      const todos = await this.#intakeStore.listRecent({ type: '待办', days, limit });
      logger.info('intake.todo_list.loaded', {
        ...eventLogFields(event),
        days,
        limit,
        itemCount: todos.length
      });
      await this.#reply.sendText(event, formatTodoList(todos, days));
      logger.info('bot.reply.sent', eventLogFields(event));
      return { status: 'handled' };
    } catch (error) {
      logger.error('intake.todo_list.failed', {
        ...eventLogFields(event),
        days,
        limit,
        ...errorFields(error)
      });
      await this.#reply.sendText(event, `待办整理失败：${error instanceof Error ? error.message : String(error)}`);
      return { status: 'handled' };
    }
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

function formatTodoList(todos: Awaited<ReturnType<IntakeStore['listRecent']>>, days: number): string {
  if (todos.length === 0) {
    return `最近 ${days} 天没有收集到待办。`;
  }

  const lines = todos.map((todo, index) => {
    const date = formatDateTime(todo.createdAt);
    return `${index + 1}. ${todo.text}（${todo.id}，${date}）`;
  });
  return [`最近 ${days} 天待办：`, ...lines].join('\n');
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

function eventLogFields(event: BotEvent): Record<string, unknown> {
  return {
    messageId: event.messageId,
    conversationId: event.conversationId,
    senderId: event.senderId
  };
}
