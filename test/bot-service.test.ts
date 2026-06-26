import test from 'node:test';
import assert from 'node:assert/strict';
import { BotService } from '../src/bot-service.ts';
import { CustomerLedgerMatchError } from '../src/customer-ledger.ts';
import type {
  BotEvent,
  CustomerLedgerImageResolver,
  CustomerLedgerRecord,
  CustomerLedgerStore,
  CustomerLedgerWriter,
  IntakeRecord,
  IntakeStore,
  LlmAgent,
  ReplyService,
  ToolRegistry
} from '../src/types.ts';

function event(overrides: Partial<BotEvent> = {}): BotEvent {
  return {
    messageId: 'msg-1',
    conversationId: 'single-cid',
    senderId: 'user-1',
    text: 'hello bot',
    raw: {},
    ...overrides
  };
}

function fakes() {
  const replies: string[] = [];
  const chatPrompts: string[] = [];
  const groupSummaryInputs: string[][] = [];
  const toolCalls: string[] = [];
  const tools: ToolRegistry = {
    async readDocument(url) {
      toolCalls.push(`readDocument:${url}`);
      return '';
    },
    async searchGroupMessages(conversationId, range) {
      toolCalls.push(`searchGroupMessages:${conversationId}:${range}`);
      return ['[2026-06-19 09:00] 张三: 今天推进机器人联调', '[2026-06-19 10:00] 李四: dws 权限已确认'];
    },
    async searchAllGroupMessages(range) {
      toolCalls.push(`searchAllGroupMessages:${range}`);
      return ['[产品群][2026-06-19 09:00] 张三: 今天推进机器人联调', '[研发群][2026-06-19 10:00] 李四: dws 权限已确认'];
    },
    async collectWeeklyContext(userId, conversationId) {
      toolCalls.push(`collectWeeklyContext:${userId}:${conversationId}`);
      return { groupSummary: '', documents: [], todos: [], meetings: [] };
    },
    async submitWeeklyReport(userId, content) {
      toolCalls.push(`submitWeeklyReport:${userId}:${content}`);
      return { ok: true };
    }
  };
  const llm: LlmAgent = {
    async chat(input) {
      chatPrompts.push(input);
      return `LLM says: ${input}`;
    },
    async summarizeDocument() {
      throw new Error('summarizeDocument should not be used');
    },
    async summarizeGroup(messages) {
      groupSummaryInputs.push(messages);
      return `群总结：${messages.length} 条消息`;
    },
    async draftWeeklyReport() {
      throw new Error('draftWeeklyReport should not be used');
    }
  };
  const reply: ReplyService = {
    async sendText(_event, text) {
      replies.push(text);
    }
  };

  return { tools, llm, reply, replies, chatPrompts, groupSummaryInputs, toolCalls };
}

function intakeFake() {
  const records: IntakeRecord[] = [];
  const store: IntakeStore = {
    async append(record) {
      const saved: IntakeRecord = {
        id: `#DT-20260622-${String(records.length + 1).padStart(3, '0')}`,
        createdAt: '2026-06-22T10:00:00.000Z',
        source: 'dingtalk',
        status: '已收集',
        ...record
      };
      records.push(saved);
      return saved;
    },
    async listRecent(options) {
      return records
        .filter((record) => !options.type || record.type === options.type)
        .slice(0, options.limit);
    }
  };
  return { store, records };
}

function customerLedgerFake(writer: CustomerLedgerWriter) {
  const records: CustomerLedgerRecord[] = [];
  const store: CustomerLedgerStore = {
    async appendPending(record) {
      const saved: CustomerLedgerRecord = {
        id: `#CL-20260622-${String(records.length + 1).padStart(3, '0')}`,
        createdAt: '2026-06-22T10:00:00.000Z',
        updatedAt: '2026-06-22T10:00:00.000Z',
        source: 'dingtalk',
        status: 'pending',
        ...record
      };
      records.push(saved);
      return saved;
    },
    async markSynced(id, result) {
      const saved: CustomerLedgerRecord = {
        id,
        createdAt: '2026-06-22T10:00:00.000Z',
        updatedAt: '2026-06-22T10:00:01.000Z',
        source: 'dingtalk',
        status: 'synced',
        appRole: 'customer_ledger',
        customerName: '',
        occurredAt: '',
        ledgerDate: '',
        action: '',
        conversationId: '',
        senderId: '',
        messageId: '',
        rawText: '',
        ...result
      };
      records.push(saved);
      return saved;
    },
    async markFailed(id, error) {
      const saved: CustomerLedgerRecord = {
        id,
        createdAt: '2026-06-22T10:00:00.000Z',
        updatedAt: '2026-06-22T10:00:01.000Z',
        source: 'dingtalk',
        status: 'failed',
        appRole: 'customer_ledger',
        customerName: '',
        occurredAt: '',
        ledgerDate: '',
        action: '',
        conversationId: '',
        senderId: '',
        messageId: '',
        rawText: '',
        error
      };
      records.push(saved);
      return saved;
    },
    async markNeedsCustomerConfirmation(id, error) {
      const saved: CustomerLedgerRecord = {
        id,
        createdAt: '2026-06-22T10:00:00.000Z',
        updatedAt: '2026-06-22T10:00:01.000Z',
        source: 'dingtalk',
        status: 'needs_customer_confirmation',
        appRole: 'customer_ledger',
        customerName: '',
        occurredAt: '',
        ledgerDate: '',
        action: '',
        conversationId: '',
        senderId: '',
        messageId: '',
        rawText: '',
        error
      };
      records.push(saved);
      return saved;
    }
  };
  return { store, writer, records };
}

test('denies events from conversations outside the allow list', async () => {
  const { tools, llm, reply, replies, chatPrompts } = fakes();
  const service = new BotService({ allowedConversationIds: ['cid-allowed'] }, tools, llm, reply);

  const result = await service.handleEvent(event());

  assert.equal(result.status, 'denied');
  assert.equal(replies[0], '当前会话未授权使用此机器人。');
  assert.deepEqual(chatPrompts, []);
});

test('sends normal messages to the LLM and replies with the answer', async () => {
  const { tools, llm, reply, replies, chatPrompts, toolCalls } = fakes();
  const service = new BotService({ allowedConversationIds: ['single-cid'] }, tools, llm, reply);

  const result = await service.handleEvent(event({ text: '你是谁' }));

  assert.equal(result.status, 'handled');
  assert.deepEqual(chatPrompts, ['你是谁']);
  assert.deepEqual(toolCalls, []);
  assert.equal(replies[0], 'LLM says: 你是谁');
});

test('summarizes all group messages from single chat', async () => {
  const { tools, llm, reply, replies, chatPrompts, groupSummaryInputs, toolCalls } = fakes();
  const service = new BotService(
    {
      allowedConversationIds: ['single-cid'],
      groupSummaryLimits: { today: 50, this_week: 100 }
    },
    tools,
    llm,
    reply
  );

  const result = await service.handleEvent(event({ text: '总结今天群消息' }));

  assert.equal(result.status, 'handled');
  assert.deepEqual(toolCalls, ['searchAllGroupMessages:today']);
  assert.deepEqual(chatPrompts, []);
  assert.deepEqual(groupSummaryInputs, [
    ['[产品群][2026-06-19 09:00] 张三: 今天推进机器人联调', '[研发群][2026-06-19 10:00] 李四: dws 权限已确认']
  ]);
  assert.equal(replies[0], '群总结：2 条消息');
});

test('summarizes all group messages without default group configuration', async () => {
  const { tools, llm, reply, replies, groupSummaryInputs, toolCalls } = fakes();
  const service = new BotService({ allowedConversationIds: ['single-cid'] }, tools, llm, reply);

  const result = await service.handleEvent(event({ text: '总结本周群消息' }));

  assert.equal(result.status, 'handled');
  assert.deepEqual(toolCalls, ['searchAllGroupMessages:this_week']);
  assert.deepEqual(groupSummaryInputs, [
    ['[产品群][2026-06-19 09:00] 张三: 今天推进机器人联调', '[研发群][2026-06-19 10:00] 李四: dws 权限已确认']
  ]);
  assert.equal(replies[0], '群总结：2 条消息');
});

test('routes named group recent-week wording to all-group summary tools', async () => {
  const { tools, llm, reply, chatPrompts, groupSummaryInputs, toolCalls } = fakes();
  const service = new BotService({ allowedConversationIds: ['single-cid'] }, tools, llm, reply);

  const result = await service.handleEvent(
    event({
      text: '\u4ea7\u54c1\u8fd0\u8425\u4e2d\u5fc3\u7fa4\u8fd1\u4e00\u5468\u804a\u5929\u8bb0\u5f55'
    })
  );

  assert.equal(result.status, 'handled');
  assert.deepEqual(toolCalls, ['searchAllGroupMessages:this_week']);
  assert.deepEqual(chatPrompts, []);
  assert.equal(groupSummaryInputs.length, 1);
});

test('ignores duplicate message ids after the first all-group summary', async () => {
  const { tools, llm, reply, replies, groupSummaryInputs, toolCalls } = fakes();
  const service = new BotService(
    {
      allowedConversationIds: ['single-cid'],
      groupSummaryLimits: { today: 50, this_week: 100 }
    },
    tools,
    llm,
    reply
  );

  assert.equal((await service.handleEvent(event({ text: '总结今天群消息' }))).status, 'handled');
  assert.equal((await service.handleEvent(event({ text: '总结今天群消息' }))).status, 'duplicate');

  assert.deepEqual(toolCalls, ['searchAllGroupMessages:today']);
  assert.equal(groupSummaryInputs.length, 1);
  assert.equal(replies.length, 1);
});

test('captures tagged intake messages and replies with the record id', async () => {
  const { tools, llm, reply, replies, chatPrompts, toolCalls } = fakes();
  const { store, records } = intakeFake();
  const service = new BotService(
    {
      allowedConversationIds: ['single-cid'],
      appRole: 'ecocc_intake',
      intake: {
        enabled: true,
        storageDir: 'unused',
        mode: 'tagged',
        appRole: 'ecocc_intake'
      }
    },
    tools,
    llm,
    reply,
    undefined,
    undefined,
    store
  );

  const result = await service.handleEvent(event({ text: '[\u8fdb\u5ea6] EcoCC \u5df2\u8fde\u901a Stream' }));

  assert.equal(result.status, 'handled');
  assert.deepEqual(chatPrompts, []);
  assert.deepEqual(toolCalls, []);
  assert.equal(records.length, 1);
  assert.equal(records[0].type, '\u8fdb\u5ea6');
  assert.equal(records[0].text, 'EcoCC \u5df2\u8fde\u901a Stream');
  assert.equal(records[0].appRole, 'ecocc_intake');
  assert.equal(replies[0], '\u5df2\u6536\u96c6\uff1a\u8fdb\u5ea6 #DT-20260622-001');
});

test('marks risk intake confirmations as requiring manual confirmation', async () => {
  const { tools, llm, reply, replies } = fakes();
  const { store } = intakeFake();
  const service = new BotService(
    {
      allowedConversationIds: ['single-cid'],
      intake: {
        enabled: true,
        storageDir: 'unused',
        mode: 'tagged',
        appRole: 'ecocc_intake'
      }
    },
    tools,
    llm,
    reply,
    undefined,
    undefined,
    store
  );

  await service.handleEvent(event({ text: '[\u98ce\u9669] \u4e0d\u8981\u81ea\u52a8\u7fa4\u53d1\u5ba2\u6237\u8bdd\u672f' }));

  assert.equal(replies[0], '\u5df2\u6536\u96c6\uff1a\u98ce\u9669 #DT-20260622-001\uff0c\u5df2\u6807\u8bb0\u9700\u4eba\u5de5\u786e\u8ba4');
});

test('does not capture tagged messages when intake is disabled', async () => {
  const { tools, llm, reply, replies, chatPrompts } = fakes();
  const { store, records } = intakeFake();
  const service = new BotService({ allowedConversationIds: ['single-cid'] }, tools, llm, reply, undefined, undefined, store);

  const result = await service.handleEvent(event({ text: '[\u5f85\u529e] \u8ddf\u8fdb senderStaffId \u767d\u540d\u5355' }));

  assert.equal(result.status, 'handled');
  assert.deepEqual(records, []);
  assert.deepEqual(chatPrompts, ['[\u5f85\u529e] \u8ddf\u8fdb senderStaffId \u767d\u540d\u5355']);
  assert.equal(replies[0], 'LLM says: [\u5f85\u529e] \u8ddf\u8fdb senderStaffId \u767d\u540d\u5355');
});

test('does not write duplicate intake records for the same message id', async () => {
  const { tools, llm, reply, replies } = fakes();
  const { store, records } = intakeFake();
  const service = new BotService(
    {
      allowedConversationIds: ['single-cid'],
      intake: {
        enabled: true,
        storageDir: 'unused',
        mode: 'tagged',
        appRole: 'ecocc_intake'
      }
    },
    tools,
    llm,
    reply,
    undefined,
    undefined,
    store
  );

  assert.equal((await service.handleEvent(event({ text: '[\u5f85\u529e] \u660e\u5929\u518d\u6d4b\u8bd5' }))).status, 'handled');
  assert.equal((await service.handleEvent(event({ text: '[\u5f85\u529e] \u660e\u5929\u518d\u6d4b\u8bd5' }))).status, 'duplicate');

  assert.equal(records.length, 1);
  assert.equal(replies.length, 1);
});

test('lists recent todo intake records without calling the LLM', async () => {
  const { tools, llm, reply, replies, chatPrompts } = fakes();
  const { store, records } = intakeFake();
  records.push(
    {
      id: '#DT-20260622-001',
      createdAt: '2026-06-22T09:00:00.000Z',
      source: 'dingtalk',
      appRole: 'ecocc_intake',
      type: '\u5f85\u529e',
      status: '\u5df2\u6536\u96c6',
      conversationId: 'single-cid',
      senderId: 'user-1',
      messageId: 'todo-1',
      text: '\u8ddf\u8fdb EcoCC \u767d\u540d\u5355',
      rawText: '[\u5f85\u529e] \u8ddf\u8fdb EcoCC \u767d\u540d\u5355'
    },
    {
      id: '#DT-20260622-002',
      createdAt: '2026-06-22T10:00:00.000Z',
      source: 'dingtalk',
      appRole: 'ecocc_intake',
      type: '\u8fdb\u5ea6',
      status: '\u5df2\u6536\u96c6',
      conversationId: 'single-cid',
      senderId: 'user-1',
      messageId: 'progress-1',
      text: 'EcoCC \u5df2\u8fde\u901a',
      rawText: '[\u8fdb\u5ea6] EcoCC \u5df2\u8fde\u901a'
    }
  );
  const service = new BotService(
    {
      allowedConversationIds: ['single-cid'],
      intake: {
        enabled: true,
        storageDir: 'unused',
        mode: 'tagged',
        appRole: 'ecocc_intake'
      }
    },
    tools,
    llm,
    reply,
    undefined,
    undefined,
    store
  );

  const result = await service.handleEvent(event({ text: '\u628a\u6700\u8fd1\u7684\u5f85\u529e\u6574\u7406\u51fa\u6765\u53d1\u7ed9\u6211' }));

  assert.equal(result.status, 'handled');
  assert.deepEqual(chatPrompts, []);
  assert.match(replies[0], /^\u6700\u8fd1 7 \u5929\u5f85\u529e\uff1a/u);
  assert.match(replies[0], /\u8ddf\u8fdb EcoCC \u767d\u540d\u5355/u);
  assert.doesNotMatch(replies[0], /EcoCC \u5df2\u8fde\u901a/u);
});

test('replies clearly when there are no recent todos', async () => {
  const { tools, llm, reply, replies } = fakes();
  const { store } = intakeFake();
  const service = new BotService(
    {
      allowedConversationIds: ['single-cid'],
      intake: {
        enabled: true,
        storageDir: 'unused',
        mode: 'tagged',
        appRole: 'ecocc_intake'
      }
    },
    tools,
    llm,
    reply,
    undefined,
    undefined,
    store
  );

  await service.handleEvent(event({ text: '\u5f85\u529e\u6e05\u5355' }));

  assert.equal(replies[0], '\u6700\u8fd1 7 \u5929\u6ca1\u6709\u6536\u96c6\u5230\u5f85\u529e\u3002');
});

test('captures customer ledger messages and writes them without calling the LLM', async () => {
  const { tools, llm, reply, replies, chatPrompts } = fakes();
  const writerCalls: string[] = [];
  const writer: CustomerLedgerWriter = {
    async write(request) {
      writerCalls.push(`${request.customerName}:${request.ledgerDate}:${request.action}:${request.imageUrls?.join('|') ?? ''}`);
      return {
        docToken: 'doc-jd',
        wikiNodeToken: 'node-jd',
        customerTitle: '001 \u4eac\u4e1c\u91d1\u878d\uff5c\u9879\u76ee\u53f0\u8d26'
      };
    }
  };
  const { store, records } = customerLedgerFake(writer);
  const service = new BotService(
    {
      allowedConversationIds: ['single-cid'],
      customerLedger: {
        enabled: true,
        storageDir: 'unused',
        appRole: 'customer_ledger',
        wikiParentNodeToken: 'parent',
        spaceId: 'space',
        dateFormat: 'yyMMdd'
      }
    },
    tools,
    llm,
    reply,
    undefined,
    undefined,
    undefined,
    store,
    writer
  );

  const result = await service.handleEvent(
    event({
      text: '\u4eac\u4e1c\u91d1\u878d 260626 15:30 \u540c\u6b651503\u6d41\u91cf\u5207\u56de39.9\u5143',
      attachments: [{ type: 'image', url: 'https://example.test/a.png' }]
    })
  );

  assert.equal(result.status, 'handled');
  assert.deepEqual(chatPrompts, []);
  assert.deepEqual(writerCalls, [
    '\u4eac\u4e1c\u91d1\u878d:260626:\u540c\u6b651503\u6d41\u91cf\u5207\u56de39.9\u5143:https://example.test/a.png'
  ]);
  assert.equal(records[0].status, 'pending');
  assert.deepEqual(records[0].imageUrls, ['https://example.test/a.png']);
  assert.equal(records[1].status, 'synced');
  assert.match(replies[0], /\u56fe\u72471\u5f20/u);
});

test('resolves customer ledger image download codes before writing', async () => {
  const { tools, llm, reply, replies } = fakes();
  const writerCalls: Array<{ action: string; imageUrls?: string[] }> = [];
  const writer: CustomerLedgerWriter = {
    async write(request) {
      writerCalls.push({ action: request.action, imageUrls: request.imageUrls });
      return {
        docToken: 'doc-yxh',
        wikiNodeToken: 'node-yxh',
        customerTitle: '005 \u5b9c\u4eab\u82b1\uff5c\u9879\u76ee\u53f0\u8d26'
      };
    }
  };
  const imageResolver: CustomerLedgerImageResolver = {
    async resolveImageUrls(attachments) {
      assert.equal(attachments[0].downloadCode, 'download-code-1');
      return ['https://ding.example/temp-image.png'];
    }
  };
  const { store, records } = customerLedgerFake(writer);
  const service = new BotService(
    {
      allowedConversationIds: ['single-cid'],
      customerLedger: {
        enabled: true,
        storageDir: 'unused',
        appRole: 'customer_ledger',
        wikiParentNodeToken: 'parent',
        spaceId: 'space',
        dateFormat: 'yyMMdd'
      }
    },
    tools,
    llm,
    reply,
    undefined,
    undefined,
    undefined,
    store,
    writer,
    imageResolver
  );

  await service.handleEvent(
    event({
      text: '\u5b9c\u4eab\u82b1 260626 \u5ba2\u6237\u63d0\u51fa\u9000\u8d39\u7387\u8981\u6c42',
      attachments: [{ type: 'image', downloadCode: 'download-code-1' }]
    })
  );

  assert.deepEqual(writerCalls, [
    { action: '\u5ba2\u6237\u63d0\u51fa\u9000\u8d39\u7387\u8981\u6c42', imageUrls: ['https://ding.example/temp-image.png'] }
  ]);
  assert.deepEqual(records[0].imageUrls, ['https://ding.example/temp-image.png']);
  assert.match(replies[0], /\u56fe\u72471\u5f20/u);
});

test('keeps customer ledger record pending when image download code resolution fails', async () => {
  const { tools, llm, reply, replies } = fakes();
  let writerCalled = false;
  const writer: CustomerLedgerWriter = {
    async write() {
      writerCalled = true;
      throw new Error('writer should not be called');
    }
  };
  const imageResolver: CustomerLedgerImageResolver = {
    async resolveImageUrls() {
      throw new Error('downloadCode expired');
    }
  };
  const { store, records } = customerLedgerFake(writer);
  const service = new BotService(
    {
      allowedConversationIds: ['single-cid'],
      customerLedger: {
        enabled: true,
        storageDir: 'unused',
        appRole: 'customer_ledger',
        wikiParentNodeToken: 'parent',
        spaceId: 'space',
        dateFormat: 'yyMMdd'
      }
    },
    tools,
    llm,
    reply,
    undefined,
    undefined,
    undefined,
    store,
    writer,
    imageResolver
  );

  await service.handleEvent(
    event({
      text: '\u5b9c\u4eab\u82b1 260626 \u5ba2\u6237\u63d0\u51fa\u9000\u8d39\u7387\u8981\u6c42',
      attachments: [{ type: 'image', downloadCode: 'download-code-1' }]
    })
  );

  assert.equal(writerCalled, false);
  assert.equal(records[0].status, 'pending');
  assert.equal(records[1].status, 'failed');
  assert.match(replies[0], /\u56fe\u7247\u4e0b\u8f7d\u5931\u8d25/u);
});

test('keeps customer ledger record pending when customer match is ambiguous', async () => {
  const { tools, llm, reply, replies } = fakes();
  const writer: CustomerLedgerWriter = {
    async write() {
      throw new CustomerLedgerMatchError('\u5ba2\u6237\u540d\u4e0d\u552f\u4e00\uff1a\u5c0f\u8d62');
    }
  };
  const { store, records } = customerLedgerFake(writer);
  const service = new BotService(
    {
      allowedConversationIds: ['single-cid'],
      customerLedger: {
        enabled: true,
        storageDir: 'unused',
        appRole: 'customer_ledger',
        wikiParentNodeToken: 'parent',
        spaceId: 'space',
        dateFormat: 'yyMMdd'
      }
    },
    tools,
    llm,
    reply,
    undefined,
    undefined,
    undefined,
    store,
    writer
  );

  await service.handleEvent(event({ text: '\u5c0f\u8d62 260626 \u8ddf\u8fdb\u8fd0\u8425\u65b9\u6848' }));

  assert.equal(records[1].status, 'needs_customer_confirmation');
  assert.match(replies[0], /^\u5ba2\u6237\u672a\u786e\u8ba4\uff0c\u5df2\u6682\u5b58/u);
});

test('keeps customer ledger record pending when Lark sync fails', async () => {
  const { tools, llm, reply, replies } = fakes();
  const writer: CustomerLedgerWriter = {
    async write() {
      throw new Error('lark update failed');
    }
  };
  const { store, records } = customerLedgerFake(writer);
  const service = new BotService(
    {
      allowedConversationIds: ['single-cid'],
      customerLedger: {
        enabled: true,
        storageDir: 'unused',
        appRole: 'customer_ledger',
        wikiParentNodeToken: 'parent',
        spaceId: 'space',
        dateFormat: 'yyMMdd'
      }
    },
    tools,
    llm,
    reply,
    undefined,
    undefined,
    undefined,
    store,
    writer
  );

  await service.handleEvent(event({ text: '\u4eac\u4e1c\u91d1\u878d 260626 \u8ddf\u8fdb\u8fd0\u8425\u65b9\u6848' }));

  assert.equal(records[1].status, 'failed');
  assert.match(replies[0], /^\u5ba2\u6237\u53f0\u8d26\u5df2\u6682\u5b58/u);
});
