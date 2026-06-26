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

test('parses DingTalk stream robot richText message into BotEvent text', () => {
  const event = parseRobotTextEvent({
    ...streamMessage,
    data: JSON.stringify({
      conversationId: 'conversation-1',
      msgId: 'ding-msg-rich-1',
      senderStaffId: 'staff-1',
      senderId: 'sender-open-id-1',
      msgtype: 'richText',
      content: {
        richText: [
          { type: 'at', text: '@小灰龙-运营助手' },
          { type: 'text', text: ' 登记台账：宜享花 今日 客户提出退费率要求' },
          { type: 'text', text: '\n下一步计划输出分析文档' },
          { type: 'image', url: 'https://example.test/screenshot.png', name: 'screenshot.png' }
        ]
      },
      robotCode: 'robot-1'
    })
  });

  assert.equal(event?.text, '@小灰龙-运营助手 登记台账：宜享花 今日 客户提出退费率要求 下一步计划输出分析文档');
  assert.deepEqual(event?.attachments, [
    {
      type: 'image',
      url: 'https://example.test/screenshot.png',
      mediaId: undefined,
      downloadCode: undefined,
      pictureDownloadCode: undefined,
      name: 'screenshot.png'
    }
  ]);
});

test('parses DingTalk richText picture download codes without adding them to text', () => {
  const event = parseRobotTextEvent({
    ...streamMessage,
    data: JSON.stringify({
      conversationId: 'conversation-1',
      msgId: 'ding-msg-picture-1',
      senderStaffId: 'staff-1',
      senderId: 'sender-open-id-1',
      msgtype: 'richText',
      content: {
        richText: [
          { text: '@小灰龙-运营助手' },
          { text: ' 登记台账：宜享花 今日 客户提出退费率要求' },
          {
            type: 'picture',
            content: 'content-token-should-not-be-text',
            downloadCode: 'download-code-1',
            pictureDownloadCode: 'picture-code-1'
          }
        ]
      },
      robotCode: 'robot-1'
    })
  });

  assert.equal(event?.text, '@小灰龙-运营助手 登记台账：宜享花 今日 客户提出退费率要求');
  assert.deepEqual(event?.attachments, [
    {
      type: 'image',
      url: undefined,
      mediaId: undefined,
      downloadCode: 'download-code-1',
      pictureDownloadCode: 'picture-code-1',
      name: undefined
    }
  ]);
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
