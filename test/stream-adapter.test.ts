import test from 'node:test';
import assert from 'node:assert/strict';
import { EventAck } from 'dingtalk-stream';
import { createRobotStreamHandler, parseRobotTextEvent } from '../src/stream-adapter.ts';
import type { BotEvent } from '../src/types.ts';

const streamMessage = {
  specVersion: '1.0',
  type: 'EVENT',
  headers: {
    appId: 'app-1',
    connectionId: 'conn-1',
    contentType: 'application/json',
    messageId: 'stream-message-1',
    time: '2026-06-19T00:00:00Z',
    topic: '/v1.0/im/bot/messages/get'
  },
  data: JSON.stringify({
    conversationId: 'conversation-1',
    msgId: 'ding-msg-1',
    senderStaffId: 'staff-1',
    senderId: 'sender-open-id-1',
    msgtype: 'text',
    text: { content: '你好' },
    robotCode: 'robot-1'
  })
};

test('parses DingTalk stream robot text message into BotEvent', () => {
  const event = parseRobotTextEvent(streamMessage);

  assert.deepEqual(event, {
    messageId: 'ding-msg-1',
    conversationId: 'conversation-1',
    senderId: 'staff-1',
    text: '你好',
    raw: JSON.parse(streamMessage.data)
  });
});

test('stream handler acknowledges immediately and processes the message asynchronously', async () => {
  const handled: BotEvent[] = [];
  const handler = createRobotStreamHandler({
    async handleEvent(event) {
      handled.push(event);
      return { status: 'handled' };
    }
  });

  const ack = handler(streamMessage);
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(ack, { status: EventAck.SUCCESS });
  assert.equal(handled.length, 1);
  assert.equal(handled[0].text, '你好');
});

test('stream handler ignores non-text robot messages after acking success', async () => {
  const handled: BotEvent[] = [];
  const handler = createRobotStreamHandler({
    async handleEvent(event) {
      handled.push(event);
      return { status: 'handled' };
    }
  });

  const ack = handler({
    ...streamMessage,
    data: JSON.stringify({
      conversationId: 'conversation-1',
      msgId: 'ding-msg-2',
      senderStaffId: 'staff-1',
      msgtype: 'image'
    })
  });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(ack, { status: EventAck.SUCCESS });
  assert.equal(handled.length, 0);
});
