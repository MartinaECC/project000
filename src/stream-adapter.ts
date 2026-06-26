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
          textLength: event.text.length,
          imageAttachmentCount: event.attachments?.length ?? 0
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

  const robotMessage = JSON.parse(message.data) as RobotMessage & Record<string, unknown>;
  const text = extractRobotMessageText(robotMessage);
  const attachments = extractRobotMessageAttachments(robotMessage);
  if (!text) {
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
    text,
    ...(attachments ? { attachments } : {}),
    raw: robotMessage
  };
}

function extractRobotMessageText(robotMessage: RobotMessage & Record<string, unknown>): string | undefined {
  if (robotMessage.msgtype === 'text') {
    return normalizeText((robotMessage.text as { content?: unknown } | undefined)?.content);
  }

  if (robotMessage.msgtype !== 'richText') {
    return undefined;
  }

  const parts = [
    ...collectTextParts(robotMessage.text),
    ...collectTextParts(robotMessage.content),
    ...collectTextParts(robotMessage.richText),
    ...collectTextParts(robotMessage.msgContent)
  ];
  return normalizeText(parts.join(' '));
}

function collectTextParts(value: unknown): string[] {
  if (!value) {
    return [];
  }
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTextParts(item));
  }
  if (typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;
  if (isImageLikeRecord(record)) {
    return Object.entries(record)
      .filter(([key]) => !new Set(['text', 'content', 'type', ...IMAGE_RESOURCE_KEYS]).has(key))
      .flatMap(([, child]) => collectTextParts(child));
  }

  const direct = [record.text, record.content]
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);

  return [
    ...direct,
    ...Object.entries(record)
      .filter(
        ([key]) =>
          !new Set(['text', 'content', 'type', ...IMAGE_RESOURCE_KEYS]).has(key)
      )
      .flatMap(([, child]) => collectTextParts(child))
  ];
}

function normalizeText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.replace(/\s+/gu, ' ').trim() : undefined;
}

function extractRobotMessageAttachments(
  robotMessage: RobotMessage & Record<string, unknown>
): BotEvent['attachments'] | undefined {
  const attachments = [
    ...collectImageAttachments(robotMessage.image),
    ...collectImageAttachments(robotMessage.text),
    ...collectImageAttachments(robotMessage.content),
    ...collectImageAttachments(robotMessage.richText),
    ...collectImageAttachments(robotMessage.msgContent)
  ];
  const unique = dedupeImageAttachments(attachments);
  return unique.length ? unique : undefined;
}

function collectImageAttachments(value: unknown): NonNullable<BotEvent['attachments']> {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectImageAttachments(item));
  }
  if (typeof value !== 'object') {
    return [];
  }

  const record = value as Record<string, unknown>;
  const looksLikeImage = isImageLikeRecord(record);
  const url = firstString(record, [
    'url',
    'href',
    'downloadUrl',
    'download_url',
    'mediaUrl',
    'media_url',
    'imageUrl',
    'image_url',
    'picUrl',
    'pic_url'
  ]);
  const mediaId = firstString(record, ['mediaId', 'media_id']);
  const downloadCode =
    firstString(record, ['downloadCode', 'download_code']) ??
    (looksLikeImage ? firstString(record, ['content', 'text']) : undefined);
  const pictureDownloadCode = firstString(record, ['pictureDownloadCode', 'picture_download_code']);
  const name = firstString(record, ['name', 'fileName', 'file_name']);

  const current =
    looksLikeImage && (url || mediaId || downloadCode || pictureDownloadCode)
      ? [{ type: 'image' as const, url, mediaId, downloadCode, pictureDownloadCode, name }]
      : [];

  return [
    ...current,
    ...Object.entries(record)
      .filter(
        ([key]) =>
          !IMAGE_RESOURCE_KEYS.has(key)
      )
      .flatMap(([, child]) => collectImageAttachments(child))
  ];
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function dedupeImageAttachments(
  attachments: NonNullable<BotEvent['attachments']>
): NonNullable<BotEvent['attachments']> {
  const seen = new Set<string>();
  const result: NonNullable<BotEvent['attachments']> = [];
  for (const attachment of attachments) {
    const key = attachment.url ?? attachment.mediaId ?? attachment.downloadCode ?? attachment.pictureDownloadCode;
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(attachment);
  }
  return result;
}

const IMAGE_RESOURCE_KEYS = new Set([
  'url',
  'href',
  'downloadUrl',
  'download_url',
  'mediaUrl',
  'media_url',
  'imageUrl',
  'image_url',
  'picUrl',
  'pic_url',
  'mediaId',
  'media_id',
  'downloadCode',
  'download_code',
  'pictureDownloadCode',
  'picture_download_code',
  'name',
  'fileName',
  'file_name'
]);

function isImageLikeRecord(record: Record<string, unknown>): boolean {
  const kind = String(record.type ?? record.msgtype ?? record.mimeType ?? record.contentType ?? '').toLowerCase();
  return (
    kind.includes('image') ||
    kind.includes('picture') ||
    Boolean(
      record.image ||
        record.pic ||
        record.picture ||
        record.mediaId ||
        record.media_id ||
        record.downloadCode ||
        record.download_code ||
        record.pictureDownloadCode ||
        record.picture_download_code
    )
  );
}
