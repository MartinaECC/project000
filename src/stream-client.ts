import { DWClient, TOPIC_ROBOT, type DWClientDownStream } from 'dingtalk-stream';
import { logger } from './logger.ts';
import { createRobotStreamHandler, type StreamBotService } from './stream-adapter.ts';

export type StreamConfig = {
  clientId?: string;
  clientSecret?: string;
};

export async function startDingTalkStreamClient(config: StreamConfig, service: StreamBotService): Promise<DWClient> {
  if (!config.clientId || !config.clientSecret) {
    throw new Error('DINGTALK_CLIENT_ID and DINGTALK_CLIENT_SECRET are required for Stream mode.');
  }

  const client = new DWClient({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    keepAlive: true,
    debug: false
  });

  const handler = createRobotStreamHandler(service);
  client.registerCallbackListener(TOPIC_ROBOT, (message: DWClientDownStream) => {
    const ack = handler(message);
    client.socketCallBackResponse(message.headers.messageId, ack);
  });

  logger.info('stream.client.connecting', {
    clientId: config.clientId,
    subscriptions: client.config.subscriptions
  });

  await client.connect();

  logger.info('stream.client.started', {
    connected: client.connected,
    registered: client.registered
  });

  return client;
}
