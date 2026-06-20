import type { BotEvent } from './types.ts';

type AnyRecord = Record<string, unknown>;

export function parseDingTalkEvent(payload: unknown): BotEvent {
  const body = asRecord(payload);
  const text =
    stringAt(body, ['text', 'content']) ??
    stringAt(body, ['text']) ??
    stringAt(body, ['content']) ??
    stringAt(body, ['message', 'text']) ??
    '';

  return {
    messageId:
      stringAt(body, ['messageId']) ??
      stringAt(body, ['msgId']) ??
      stringAt(body, ['message', 'messageId']) ??
      crypto.randomUUID(),
    conversationId:
      stringAt(body, ['conversationId']) ??
      stringAt(body, ['conversation_id']) ??
      stringAt(body, ['chatId']) ??
      stringAt(body, ['conversation', 'id']) ??
      '',
    senderId:
      stringAt(body, ['senderId']) ??
      stringAt(body, ['senderStaffId']) ??
      stringAt(body, ['sender', 'id']) ??
      stringAt(body, ['userId']) ??
      '',
    text,
    raw: payload
  };
}

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === 'object' ? (value as AnyRecord) : {};
}

function stringAt(record: AnyRecord, path: string[]): string | undefined {
  let current: unknown = record;
  for (const part of path) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = (current as AnyRecord)[part];
  }

  return typeof current === 'string' ? current : undefined;
}
