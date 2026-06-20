import test from 'node:test';
import assert from 'node:assert/strict';
import { BotService } from '../src/bot-service.ts';
import type { BotEvent, LlmAgent, ReplyService, ToolRegistry } from '../src/types.ts';

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
