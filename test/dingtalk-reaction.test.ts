import test from 'node:test';
import assert from 'node:assert/strict';
import { DingTalkRobotReactionService } from '../src/dingtalk-reaction.ts';

test('DingTalk reaction service sends get emotion to the original message', async () => {
  const requests: Array<{ url: string; body?: unknown; token?: string }> = [];
  const service = new DingTalkRobotReactionService(
    {
      clientId: 'client-1',
      clientSecret: 'secret-1',
      robotCode: 'robot-1',
      emotionName: 'get',
      emotionType: 2,
      text: 'get'
    },
    (async (url, init) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      requests.push({
        url: String(url),
        body,
        token: init?.headers ? new Headers(init.headers).get('x-acs-dingtalk-access-token') ?? undefined : undefined
      });
      if (String(url).endsWith('/v1.0/oauth2/accessToken')) {
        return new Response(JSON.stringify({ accessToken: 'token-1', expireIn: 7200 }), { status: 200 });
      }
      if (String(url).endsWith('/v1.0/robot/emotion/reply')) {
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch
  );

  await service.sendGetReaction({
    messageId: 'msg-1',
    conversationId: 'cid-1',
    senderId: 'user-1',
    text: 'hello',
    raw: {}
  });

  assert.deepEqual(requests, [
    {
      url: 'https://api.dingtalk.com/v1.0/oauth2/accessToken',
      body: { appKey: 'client-1', appSecret: 'secret-1' },
      token: undefined
    },
    {
      url: 'https://api.dingtalk.com/v1.0/robot/emotion/reply',
      body: {
        robotCode: 'robot-1',
        openConversationId: 'cid-1',
        openMsgId: 'msg-1',
        emotionName: 'get',
        emotionType: 2,
        textEmotion: {
          emotionName: 'get',
          text: 'get'
        }
      },
      token: 'token-1'
    }
  ]);
});
