import test from 'node:test';
import assert from 'node:assert/strict';
import { StreamWebhookReplyService } from '../src/stream-reply-service.ts';
import type { BotEvent } from '../src/types.ts';

const event: BotEvent = {
  messageId: 'msg-1',
  conversationId: 'conversation-1',
  senderId: 'staff-1',
  text: 'hello',
  raw: {
    sessionWebhook: 'https://example.com/webhook',
    senderStaffId: 'staff-1'
  }
};

test('stream webhook reply service posts a text reply to DingTalk sessionWebhook', async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const reply = new StreamWebhookReplyService(
    async () => 'access-token-1',
    async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
  );

  await reply.sendText(event, '你好');

  assert.equal(calls[0].url, 'https://example.com/webhook');
  assert.deepEqual(calls[0].init.headers, {
    'content-type': 'application/json',
    'x-acs-dingtalk-access-token': 'access-token-1'
  });
  assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
    msgtype: 'text',
    text: { content: '你好' },
    at: { atUserIds: ['staff-1'], isAtAll: false }
  });
});

test('stream webhook reply service fails clearly when sessionWebhook is missing', async () => {
  const reply = new StreamWebhookReplyService(async () => 'access-token-1');

  await assert.rejects(
    () => reply.sendText({ ...event, raw: {} }, '你好'),
    /sessionWebhook is missing/
  );
});
