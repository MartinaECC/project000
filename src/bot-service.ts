import { InMemoryApprovalStore } from './approval-store.ts';
import { CustomerLedgerMatchError } from './customer-ledger.ts';
import { InMemoryIdempotencyStore } from './idempotency-store.ts';
import { routeIntent } from './intent-router.ts';
import { errorFields, logger } from './logger.ts';
import type {
  BotConfig,
  BotEvent,
  CustomerLedgerImageResolver,
  CustomerLedgerStore,
  CustomerLedgerWriter,
  HandleResult,
  IntakeStore,
  LlmAgent,
  ReactionService,
  ReplyService,
  ToolRegistry
} from './types.ts';

export class BotService {
  readonly #config: BotConfig;
  readonly #tools: ToolRegistry;
  readonly #llm: LlmAgent;
  readonly #reply: ReplyService;
  readonly #approvals: InMemoryApprovalStore;
  readonly #idempotency: InMemoryIdempotencyStore;
  readonly #intakeStore?: IntakeStore;
  readonly #customerLedgerStore?: CustomerLedgerStore;
  readonly #customerLedgerWriter?: CustomerLedgerWriter;
  readonly #customerLedgerImageResolver?: CustomerLedgerImageResolver;
  readonly #reaction?: ReactionService;

  constructor(
    config: BotConfig,
    tools: ToolRegistry,
    llm: LlmAgent,
    reply: ReplyService,
    approvals = new InMemoryApprovalStore(),
    idempotency = new InMemoryIdempotencyStore(),
    intakeStore?: IntakeStore,
    customerLedgerStore?: CustomerLedgerStore,
    customerLedgerWriter?: CustomerLedgerWriter,
    customerLedgerImageResolver?: CustomerLedgerImageResolver,
    reaction?: ReactionService
  ) {
    this.#config = config;
    this.#tools = tools;
    this.#llm = llm;
    this.#reply = reply;
    this.#approvals = approvals;
    this.#idempotency = idempotency;
    this.#intakeStore = intakeStore;
    this.#customerLedgerStore = customerLedgerStore;
    this.#customerLedgerWriter = customerLedgerWriter;
    this.#customerLedgerImageResolver = customerLedgerImageResolver;
    this.#reaction = reaction;
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

    this.#sendGetReaction(event);

    const intent = routeIntent(event.text);
    logger.info('bot.intent.routed', {
      ...eventLogFields(event),
      intentType: intent.type,
      range: intent.type === 'summarize_group' ? intent.range : undefined
    });

    if (intent.type === 'summarize_group') {
      return this.#summarizeAllGroups(event, intent.range);
    }

    if (intent.type === 'capture_customer_ledger' && this.#config.customerLedger?.enabled) {
      return this.#captureCustomerLedger(event, intent);
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

  async #sendGetReaction(event: BotEvent): Promise<void> {
    if (!this.#config.reaction?.enabled || !this.#reaction) {
      return;
    }

    try {
      await this.#reaction.sendGetReaction(event);
    } catch (error) {
      logger.warn('dingtalk.reaction.failed', {
        ...eventLogFields(event),
        ...errorFields(error)
      });
    }
  }

  async #captureCustomerLedger(
    event: BotEvent,
    intent: Extract<ReturnType<typeof routeIntent>, { type: 'capture_customer_ledger' }>
  ): Promise<HandleResult> {
    if (!this.#customerLedgerStore || !this.#customerLedgerWriter) {
      logger.warn('customer_ledger.capture.disabled', {
        ...eventLogFields(event),
        reason: 'missing_store_or_writer',
        customerName: intent.customerName
      });
      await this.#reply.sendText(event, '客户台账记录服务未启用。');
      return { status: 'handled' };
    }

    let imageUrls: string[];
    let imageResolveError: unknown;
    try {
      imageUrls = await this.#customerLedgerImageUrls(event);
    } catch (error) {
      imageUrls = [];
      imageResolveError = error;
    }
    const pending = await this.#customerLedgerStore.appendPending({
      appRole: this.#config.customerLedger?.appRole ?? this.#config.appRole ?? 'customer_ledger',
      customerName: intent.customerName,
      occurredAt: intent.occurredAt,
      ledgerDate: intent.ledgerDate,
      action: intent.action,
      imageUrls,
      conversationId: event.conversationId,
      senderId: event.senderId,
      messageId: event.messageId,
      rawText: intent.rawText
    });

    logger.info('customer_ledger.capture.pending_saved', {
      ...eventLogFields(event),
      id: pending.id,
      customerName: intent.customerName,
      ledgerDate: intent.ledgerDate,
      actionLength: intent.action.length,
      imageAttachmentCount: event.attachments?.length ?? 0,
      imageUrlCount: imageUrls.length
    });

    if (imageResolveError) {
      const message = imageResolveError instanceof Error ? imageResolveError.message : String(imageResolveError);
      await this.#customerLedgerStore.markFailed(pending.id, message);
      logger.error('customer_ledger.image.resolve_failed', {
        ...eventLogFields(event),
        id: pending.id,
        customerName: intent.customerName,
        ...errorFields(imageResolveError)
      });
      await this.#reply.sendText(event, `客户台账已暂存 ${pending.id}，但图片下载失败，暂未写飞书：${message}`);
      logger.info('bot.reply.sent', eventLogFields(event));
      return { status: 'handled' };
    }

    try {
      const result = await this.#customerLedgerWriter.write({
        customerName: intent.customerName,
        occurredAt: intent.occurredAt,
        ledgerDate: intent.ledgerDate,
        action: intent.action,
        imageUrls,
        conversationId: event.conversationId,
        senderId: event.senderId,
        messageId: event.messageId,
        rawText: intent.rawText
      });
      await this.#customerLedgerStore.markSynced(pending.id, result);
      logger.info('customer_ledger.capture.synced', {
        ...eventLogFields(event),
        id: pending.id,
        customerName: intent.customerName,
        customerTitle: result.customerTitle,
        docToken: result.docToken
      });
      try {
        await this.#reply.sendText(
          event,
          `已记录到客户运营台账：${result.customerTitle} / ${intent.ledgerDate} / ${intent.action}${imageUrls.length ? ` / 图片${imageUrls.length}张` : ''}`
        );
        logger.info('bot.reply.sent', eventLogFields(event));
      } catch (replyError) {
        logger.error('customer_ledger.reply.failed_after_sync', {
          ...eventLogFields(event),
          id: pending.id,
          customerName: intent.customerName,
          ...errorFields(replyError)
        });
      }
      return { status: 'handled' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (error instanceof CustomerLedgerMatchError) {
        await this.#customerLedgerStore.markNeedsCustomerConfirmation(pending.id, message);
        logger.warn('customer_ledger.capture.needs_customer_confirmation', {
          ...eventLogFields(event),
          id: pending.id,
          customerName: intent.customerName,
          reason: message
        });
        await this.#reply.sendText(event, `客户未确认，已暂存 ${pending.id}：${message}`);
        logger.info('bot.reply.sent', eventLogFields(event));
        return { status: 'handled' };
      }

      await this.#customerLedgerStore.markFailed(pending.id, message);
      logger.error('customer_ledger.capture.failed', {
        ...eventLogFields(event),
        id: pending.id,
        customerName: intent.customerName,
        ...errorFields(error)
      });
      await this.#reply.sendText(event, `客户台账已暂存 ${pending.id}，但同步飞书失败：${message}`);
      logger.info('bot.reply.sent', eventLogFields(event));
      return { status: 'handled' };
    }
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

  async #customerLedgerImageUrls(event: BotEvent): Promise<string[]> {
    const attachments = event.attachments?.filter((attachment) => attachment.type === 'image') ?? [];
    if (!attachments.length) {
      return [];
    }

    if (this.#customerLedgerImageResolver) {
      return this.#customerLedgerImageResolver.resolveImageUrls(attachments);
    }

    const urls = attachments.flatMap((attachment) => (attachment.url ? [attachment.url] : []));
    const missingResolvableUrlCount = attachments.filter((attachment) => !attachment.url).length;
    if (missingResolvableUrlCount > 0) {
      logger.warn('customer_ledger.image.unresolved', {
        ...eventLogFields(event),
        imageAttachmentCount: attachments.length,
        missingResolvableUrlCount
      });
    }
    return [...new Set(urls)];
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
