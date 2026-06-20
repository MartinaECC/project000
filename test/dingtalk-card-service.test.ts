import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRefundReportCardBody,
  buildStandardCardData,
  DingTalkInteractiveCardSender
} from '../src/dingtalk-card-service.ts';

const title = '\u9000\u8d39\u7387\u64ad\u62a5';
const markdown = '# \u9000\u8d39\u7387\u64ad\u62a5\n\n#### \u5b9c\u4fe1\n\u9000\u8d39\u7387\uff1a1.00%';

test('builds StandardCard body with complete markdown content', () => {
  const body = buildRefundReportCardBody({
    userId: 'user-1',
    title,
    markdown,
    cardBizId: 'track-1',
    cardTemplateId: 'StandardCard',
    callbackRouteKey: 'refund-report',
    robotCode: 'robot-1'
  });

  assert.equal(body.cardTemplateId, 'StandardCard');
  assert.equal(body.cardBizId, 'track-1');
  assert.equal(body.singleChatReceiver, JSON.stringify({ userId: 'user-1' }));
  assert.equal(body.robotCode, 'robot-1');

  const cardData = JSON.parse(String(body.cardData));
  assert.deepEqual(cardData, buildStandardCardData(title, markdown));
  assert.equal(cardData.contents[0].type, 'markdown');
  assert.equal(cardData.contents[0].text, markdown);
});

test('DingTalk interactive card sender posts access token and robot card requests', async () => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    requests.push({ url: String(url), init: init ?? {} });
    if (String(url).endsWith('/v1.0/oauth2/accessToken')) {
      return new Response(JSON.stringify({ accessToken: 'token-1', expireIn: 7200 }), { status: 200 });
    }
    return new Response(JSON.stringify({ processQueryKey: 'process-1' }), { status: 200 });
  };
  const sender = new DingTalkInteractiveCardSender(
    {
      clientId: 'client-1',
      clientSecret: 'secret-1',
      robotCode: 'robot-1',
      cardTemplateId: 'StandardCard',
      callbackRouteKey: 'refund-report',
      apiBaseUrl: 'https://api.example.test/'
    },
    fetchImpl
  );

  await sender.sendRefundReportCard(['user-1'], title, markdown);

  assert.equal(requests.length, 2);
  assert.equal(requests[0].url, 'https://api.example.test/v1.0/oauth2/accessToken');
  assert.deepEqual(JSON.parse(String(requests[0].init.body)), {
    appKey: 'client-1',
    appSecret: 'secret-1'
  });
  assert.equal(requests[1].url, 'https://api.example.test/v1.0/im/v1.0/robot/interactiveCards/send');
  assert.equal((requests[1].init.headers as Record<string, string>)['x-acs-dingtalk-access-token'], 'token-1');
  const body = JSON.parse(String(requests[1].init.body));
  assert.equal(body.cardTemplateId, 'StandardCard');
  assert.equal(body.robotCode, 'robot-1');
  assert.equal(body.singleChatReceiver, JSON.stringify({ userId: 'user-1' }));
  assert.equal(JSON.parse(body.cardData).contents[0].text, markdown);
});

test('DingTalk interactive card sender uploads image and embeds it in card markdown', async () => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    requests.push({ url: String(url), init: init ?? {} });
    if (String(url).endsWith('/v1.0/oauth2/accessToken')) {
      return new Response(JSON.stringify({ accessToken: 'token-1', expireIn: 7200 }), { status: 200 });
    }
    if (String(url).includes('/media/upload')) {
      return new Response(JSON.stringify({ errcode: 0, media_id: '@media-1' }), { status: 200 });
    }
    return new Response(JSON.stringify({ processQueryKey: 'process-1' }), { status: 200 });
  };
  const sender = new DingTalkInteractiveCardSender(
    {
      clientId: 'client-1',
      clientSecret: 'secret-1',
      robotCode: 'robot-1',
      cardTemplateId: 'StandardCard',
      apiBaseUrl: 'https://api.example.test/'
    },
    fetchImpl
  );

  await sender.sendRefundReportImageCard(['user-1'], title, markdown, Buffer.from('png'));

  assert.equal(requests.length, 3);
  assert.equal(requests[1].url, 'https://api.example.test/media/upload?access_token=token-1&type=image');
  assert.ok(requests[1].init.body instanceof FormData);
  const body = JSON.parse(String(requests[2].init.body));
  const cardMarkdown = JSON.parse(body.cardData).contents[0].text;
  assert.match(cardMarkdown, /!\[退费率播报\]\(@media-1\)/);
});

test('DingTalk image card sender sends only image markdown when text body is empty', async () => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (url, init) => {
    requests.push({ url: String(url), init: init ?? {} });
    if (String(url).endsWith('/v1.0/oauth2/accessToken')) {
      return new Response(JSON.stringify({ accessToken: 'token-1', expireIn: 7200 }), { status: 200 });
    }
    if (String(url).includes('/media/upload')) {
      return new Response(JSON.stringify({ errcode: 0, media_id: '@media-1' }), { status: 200 });
    }
    return new Response(JSON.stringify({ processQueryKey: 'process-1' }), { status: 200 });
  };
  const sender = new DingTalkInteractiveCardSender(
    {
      clientId: 'client-1',
      clientSecret: 'secret-1',
      robotCode: 'robot-1',
      cardTemplateId: 'StandardCard',
      apiBaseUrl: 'https://api.example.test/'
    },
    fetchImpl
  );

  await sender.sendRefundReportImageCard(['user-1'], title, '', Buffer.from('png'));

  const body = JSON.parse(String(requests[2].init.body));
  assert.equal(JSON.parse(body.cardData).contents[0].text, '![退费率播报](@media-1)');
});

test('DingTalk image card sender fails clearly when image upload fails', async () => {
  const requests: string[] = [];
  const fetchImpl: typeof fetch = async (url) => {
    requests.push(String(url));
    if (String(url).endsWith('/v1.0/oauth2/accessToken')) {
      return new Response(JSON.stringify({ accessToken: 'token-1', expireIn: 7200 }), { status: 200 });
    }
    return new Response('bad upload', { status: 400 });
  };
  const sender = new DingTalkInteractiveCardSender(
    {
      clientId: 'client-1',
      clientSecret: 'secret-1',
      cardTemplateId: 'StandardCard'
    },
    fetchImpl
  );

  await assert.rejects(
    () => sender.sendRefundReportImageCard(['user-1'], title, markdown, Buffer.from('png')),
    /DingTalk media upload failed: 400 bad upload/
  );
  assert.equal(requests.length, 2);
});

test('DingTalk interactive card sender does not fall back to text on card failure', async () => {
  const fetchImpl: typeof fetch = async (url) => {
    if (String(url).endsWith('/v1.0/oauth2/accessToken')) {
      return new Response(JSON.stringify({ accessToken: 'token-1', expireIn: 7200 }), { status: 200 });
    }
    return new Response('bad card request', { status: 400 });
  };
  const sender = new DingTalkInteractiveCardSender(
    {
      clientId: 'client-1',
      clientSecret: 'secret-1',
      cardTemplateId: 'StandardCard'
    },
    fetchImpl
  );

  await assert.rejects(
    () => sender.sendRefundReportCard(['user-1'], title, markdown),
    /DingTalk interactive card send failed: 400 bad card request/
  );
});
