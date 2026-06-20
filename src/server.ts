import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { parseDingTalkEvent } from './event-parser.ts';
import { errorFields, logger } from './logger.ts';
import { BotService } from './bot-service.ts';

export function createBotHttpServer(service: BotService) {
  return createServer(async (request, response) => {
    try {
      if (request.method === 'GET' && request.url === '/healthz') {
        sendJson(response, 200, { ok: true });
        return;
      }

      if (request.method === 'POST' && request.url === '/dingtalk/events') {
        const body = await readJson(request);
        const event = parseDingTalkEvent(body);
        logger.info('http.event.received', {
          path: request.url,
          messageId: event.messageId,
          conversationId: event.conversationId,
          senderId: event.senderId,
          textLength: event.text.length
        });
        const result = await service.handleEvent(event);
        logger.info('http.event.handled', {
          path: request.url,
          messageId: event.messageId,
          status: result.status
        });
        sendJson(response, 200, result);
        return;
      }

      if (request.method === 'POST' && request.url === '/dingtalk/actions/confirm') {
        const event = parseDingTalkEvent(await readJson(request));
        logger.info('http.confirm.received', {
          messageId: event.messageId,
          conversationId: event.conversationId,
          senderId: event.senderId,
          textLength: event.text.length
        });
        const result = await service.confirmLatest(event);
        logger.info('http.confirm.handled', {
          messageId: event.messageId,
          status: result.status
        });
        sendJson(response, 200, result);
        return;
      }

      sendJson(response, 404, { error: 'not_found' });
    } catch (error) {
      logger.error('http.request.failed', {
        method: request.method,
        url: request.url,
        ...errorFields(error)
      });
      sendJson(response, 500, { error: String(error) });
    }
  });
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}
