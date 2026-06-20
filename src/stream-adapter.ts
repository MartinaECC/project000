import { EventAck, TOPIC_ROBOT, type DWClientDownStream, type EventAckData, type RobotMessage } from 'dingtalk-stream';
import { errorFields, logger } from './logger.ts';
import type { BotEvent, HandleResult } from './types.ts';

export type StreamBotService = {
  handleEvent(event: BotEvent): Promise<HandleResult>;
};

export function createRobotStreamHandler(service: StreamBotService) {
  return (message: DWClientDownStream): EventAckData => {
    queueMicrotask(async () => {
      try {
        const event = parseRobotTextEvent(message);
        if (!event) {
          return;
        }

        logger.info('stream.robot.message.received', {
          messageId: event.messageId,
          conversationId: event.conversationId,
          senderId: event.senderId,
          textLength: event.text.length
        });
        await service.handleEvent(event);
      } catch (error) {
        logger.error('stream.robot.message.failed', {
          streamMessageId: message.headers.messageId,
          topic: message.headers.topic,
          ...errorFields(error)
        });
      }
    });

    return { status: EventAck.SUCCESS };
  };
}

export function parseRobotTextEvent(message: DWClientDownStream): BotEvent | undefined {
  if (message.headers.topic !== TOPIC_ROBOT) {
    logger.info('stream.message.ignored', {
      reason: 'unsupported_topic',
      topic: message.headers.topic,
      streamMessageId: message.headers.messageId
    });
    return undefined;
  }

  const robotMessage = JSON.parse(message.data) as RobotMessage;
  if (robotMessage.msgtype !== 'text') {
    logger.info('stream.message.ignored', {
      reason: 'unsupported_msgtype',
      msgtype: robotMessage.msgtype,
      streamMessageId: message.headers.messageId
    });
    return undefined;
  }

  return {
    messageId: robotMessage.msgId || message.headers.messageId,
    conversationId: robotMessage.conversationId,
    senderId: robotMessage.senderStaffId || robotMessage.senderId,
    text: robotMessage.text.content,
    raw: robotMessage
  };
}
