import test from 'node:test';
import assert from 'node:assert/strict';
import { DwsReplyService } from '../src/reply-service.ts';
import { DwsToolRegistry, shouldUseShellForDwsBin } from '../src/tool-registry.ts';
import type { BotEvent } from '../src/types.ts';

const event: BotEvent = {
  messageId: 'msg-1',
  conversationId: 'cid-1',
  senderId: 'user-1',
  text: 'hello',
  raw: {}
};

test('DWS group message lookup uses limit 50 for today', async () => {
  const calls: string[][] = [];
  const registry = new DwsToolRegistry('dws', async (_bin, args) => {
    calls.push(args);
    return JSON.stringify({ items: ['a', 'b'] });
  });

  const messages = await registry.searchGroupMessages('cid-1', 'today');

  assert.deepEqual(messages, ['a', 'b']);
  assert.deepEqual(calls[0], ['chat', 'message', 'list', '--group', 'cid-1', '--limit', '50', '--format', 'json']);
});

test('DWS group message lookup uses limit 100 for this week', async () => {
  const calls: string[][] = [];
  const registry = new DwsToolRegistry('dws', async (_bin, args) => {
    calls.push(args);
    return JSON.stringify([]);
  });

  await registry.searchGroupMessages('cid-1', 'this_week');

  assert.deepEqual(calls[0], ['chat', 'message', 'list', '--group', 'cid-1', '--limit', '100', '--format', 'json']);
});

test('DWS group message lookup formats structured message items for LLM input', async () => {
  const registry = new DwsToolRegistry('dws', async () =>
    JSON.stringify({
      items: [
        {
          createAt: '2026-06-19 09:00:00',
          senderNick: '张三',
          text: { content: '今天推进机器人联调' }
        },
        {
          sendTime: '2026-06-19 09:05:00',
          senderName: '李四',
          content: 'dws 权限已确认'
        }
      ]
    })
  );

  const messages = await registry.searchGroupMessages('cid-1', 'today');

  assert.deepEqual(messages, [
    '[2026-06-19 09:00:00] 张三: 今天推进机器人联调',
    '[2026-06-19 09:05:00] 李四: dws 权限已确认'
  ]);
});

test('DWS all-group message lookup uses list-all with today range', async () => {
  const calls: string[][] = [];
  const registry = new DwsToolRegistry(
    'dws',
    async (_bin, args) => {
      calls.push(args);
      return JSON.stringify({ items: [] });
    },
    { today: 50, this_week: 100 },
    () => new Date('2026-06-19T14:30:00+08:00')
  );

  await registry.searchAllGroupMessages('today');

  assert.deepEqual(calls[0], [
    'chat',
    'message',
    'list-all',
    '--start',
    '2026-06-19 00:00:00',
    '--end',
    '2026-06-19 23:59:59',
    '--limit',
    '50',
    '--format',
    'json'
  ]);
});

test('DWS all-group message lookup filters direct chats and includes group names', async () => {
  const registry = new DwsToolRegistry(
    'dws',
    async () =>
      JSON.stringify({
        items: [
          {
            singleChat: false,
            conversationTitle: '产品群',
            createAt: '2026-06-19 09:00:00',
            senderNick: '张三',
            text: { content: '今天推进机器人联调' }
          },
          {
            singleChat: true,
            conversationTitle: '和王五的单聊',
            createAt: '2026-06-19 09:05:00',
            senderNick: '王五',
            text: { content: '这条不应该出现' }
          },
          {
            singleChat: false,
            chatName: '研发群',
            sendTime: '2026-06-19 10:00:00',
            senderName: '李四',
            content: 'dws 权限已确认'
          }
        ]
      }),
    { today: 50, this_week: 100 },
    () => new Date('2026-06-19T14:30:00+08:00')
  );

  const messages = await registry.searchAllGroupMessages('today');

  assert.deepEqual(messages, [
    '[产品群][2026-06-19 09:00:00] 张三: 今天推进机器人联调',
    '[研发群][2026-06-19 10:00:00] 李四: dws 权限已确认'
  ]);
});

test('DWS reply service sends markdown to a group conversation by default', async () => {
  const calls: string[][] = [];
  const reply = new DwsReplyService('dws', 'robot-1', async (_bin, args) => {
    calls.push(args);
    return '{}';
  });

  await reply.sendText(event, '处理完成');

  assert.deepEqual(calls[0], [
    'chat',
    'message',
    'send-by-bot',
    '--robot-code',
    'robot-1',
    '--group',
    'cid-1',
    '--title',
    '智能助手回复',
    '--text',
    '处理完成',
    '--format',
    'json'
  ]);
});

test('DWS reply service sends markdown to the sender in single-chat mode', async () => {
  const calls: string[][] = [];
  const reply = new DwsReplyService('dws', 'robot-1', async (_bin, args) => {
    calls.push(args);
    return '{}';
  }, 'single');

  await reply.sendText(event, 'hello back');

  assert.deepEqual(calls[0], [
    'chat',
    'message',
    'send-by-bot',
    '--robot-code',
    'robot-1',
    '--users',
    'user-1',
    '--title',
    '智能助手回复',
    '--text',
    'hello back',
    '--format',
    'json'
  ]);
});

test('DWS reply service sends scheduled markdown to configured users', async () => {
  const calls: string[][] = [];
  const reply = new DwsReplyService('dws', 'robot-1', async (_bin, args) => {
    calls.push(args);
    return '{}';
  });

  await reply.sendToUsers(['user-1', 'user-2'], '退费率报表', 'report markdown');

  assert.deepEqual(calls[0], [
    'chat',
    'message',
    'send-by-bot',
    '--robot-code',
    'robot-1',
    '--users',
    'user-1,user-2',
    '--title',
    '退费率报表',
    '--text',
    'report markdown',
    '--format',
    'json'
  ]);
});

test('DWS reply service sends scheduled markdown to a configured group', async () => {
  const calls: string[][] = [];
  const reply = new DwsReplyService('dws', 'robot-1', async (_bin, args) => {
    calls.push(args);
    return '{}';
  });

  await reply.sendToGroup('cid-1', '退费率播报', 'report markdown');

  assert.deepEqual(calls[0], [
    'chat',
    'message',
    'send-by-bot',
    '--robot-code',
    'robot-1',
    '--group',
    'cid-1',
    '--title',
    '退费率播报',
    '--text',
    'report markdown',
    '--format',
    'json'
  ]);
});

test('DWS runner uses a shell for Windows command shims', () => {
  assert.equal(shouldUseShellForDwsBin('C:\\Users\\Administrator\\AppData\\Roaming\\npm\\dws.cmd'), true);
  assert.equal(shouldUseShellForDwsBin('C:\\tools\\dws.bat'), true);
  assert.equal(shouldUseShellForDwsBin('dws'), false);
});
