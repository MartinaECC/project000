import test from 'node:test';
import assert from 'node:assert/strict';
import { DingTalkRobotMediaResolver } from '../src/dingtalk-media.ts';

test('DingTalk media resolver converts download codes to download URLs', async () => {
  const requests: Array<{ url: string; body?: unknown; token?: string }> = [];
  const resolver = new DingTalkRobotMediaResolver(
    {
      clientId: 'client-1',
      clientSecret: 'secret-1',
      robotCode: 'robot-1'
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
      if (String(url).endsWith('/v1.0/robot/messageFiles/download')) {
        return new Response(JSON.stringify({ downloadUrl: 'https://ding.example/file.png' }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }) as typeof fetch
  );

  const urls = await resolver.resolveImageUrls([{ type: 'image', downloadCode: 'download-code-1' }]);

  assert.deepEqual(urls, ['https://ding.example/file.png']);
  assert.deepEqual(requests, [
    {
      url: 'https://api.dingtalk.com/v1.0/oauth2/accessToken',
      body: { appKey: 'client-1', appSecret: 'secret-1' },
      token: undefined
    },
    {
      url: 'https://api.dingtalk.com/v1.0/robot/messageFiles/download',
      body: { robotCode: 'robot-1', downloadCode: 'download-code-1' },
      token: 'token-1'
    }
  ]);
});
