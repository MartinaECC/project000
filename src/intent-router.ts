import type { Intent } from './types.ts';

const summaryWords = [
  '\u603b\u7ed3',
  '\u6982\u62ec',
  '\u590d\u76d8',
  '\u6574\u7406',
  '\u6c47\u603b',
  'summary'
];
const groupWords = ['\u7fa4', '\u7fa4\u804a'];
const messageWords = [
  '\u6d88\u606f',
  '\u8ba8\u8bba',
  '\u804a\u5929',
  '\u804a\u5929\u8bb0\u5f55',
  '\u8bb0\u5f55'
];
const weekWords = [
  '\u672c\u5468',
  '\u8fd9\u5468',
  '\u4e00\u5468',
  '\u8fd1\u4e00\u5468',
  '\u6700\u8fd1\u4e00\u5468',
  'week'
];
const todayWords = ['\u4eca\u5929', '\u4eca\u65e5', 'today'];
const intakeLabels = ['\u5f85\u529e', '\u77e5\u8bc6', '\u8fdb\u5ea6', '\u98ce\u9669'] as const;
const todoWords = ['\u5f85\u529e', 'todo', 'todos'];
const listWords = [
  '\u6574\u7406',
  '\u5217\u51fa',
  '\u5217\u4e00\u4e0b',
  '\u53d1\u7ed9\u6211',
  '\u770b\u4e0b',
  '\u770b\u770b',
  '\u6709\u54ea\u4e9b',
  '\u6e05\u5355',
  '\u5217\u8868',
  '\u6700\u8fd1',
  'list'
];
const todoCapturePatterns = [
  /^[\s]*\u5f85\u529e[\uff1a:]\s*([\s\S]+)$/u,
  /^[\s]*(?:\u8bb0\u4e2a|\u8bb0\u4e00\u4e2a|\u5e2e\u6211\u8bb0\u4e2a|\u5e2e\u6211\u8bb0\u4e00\u4e2a)\u5f85\u529e[\uff1a:]?\s*([\s\S]+)$/u,
  /^[\s]*(?:\u63d0\u9192\u6211|\u5e2e\u6211\u63d0\u9192)\s*([\s\S]+)$/u
];

export function routeIntent(text: string): Intent {
  const normalized = text.trim();

  if (isGroupSummaryRequest(normalized)) {
    return {
      type: 'summarize_group',
      range: includesAny(normalized, weekWords) ? 'this_week' : 'today'
    };
  }

  if (isRecentTodoListRequest(normalized)) {
    return {
      type: 'list_recent_todos',
      days: 7,
      limit: 10
    };
  }

  const intake = parseIntakeLabel(normalized);
  if (intake) {
    return intake;
  }

  const todoCapture = parseTodoCapture(normalized);
  if (todoCapture) {
    return todoCapture;
  }

  return { type: 'unknown' };
}

function parseIntakeLabel(text: string): Intent | undefined {
  const match = text.match(/^[\s]*[\[\uff3b]\s*([^\]\uff3d]+?)\s*[\]\uff3d]\s*([\s\S]*)$/u);
  if (!match) {
    return undefined;
  }

  const label = match[1].trim();
  if (!isIntakeLabel(label)) {
    return undefined;
  }

  return {
    type: 'capture_intake',
    itemType: label,
    label,
    text: match[2].trim(),
    rawText: text
  };
}

function isIntakeLabel(label: string): label is (typeof intakeLabels)[number] {
  return intakeLabels.some((candidate) => candidate === label);
}

function parseTodoCapture(text: string): Intent | undefined {
  for (const pattern of todoCapturePatterns) {
    const match = text.match(pattern);
    const body = match?.[1]?.trim();
    if (body) {
      return {
        type: 'capture_intake',
        itemType: '\u5f85\u529e',
        label: '\u5f85\u529e',
        text: body,
        rawText: text
      };
    }
  }

  return undefined;
}

function isGroupSummaryRequest(text: string): boolean {
  if (!includesAny(text, groupWords)) {
    return false;
  }

  if (includesAny(text, summaryWords)) {
    return true;
  }

  return includesAny(text, messageWords) && (includesAny(text, weekWords) || includesAny(text, todayWords));
}

function isRecentTodoListRequest(text: string): boolean {
  return includesAny(text, todoWords) && includesAny(text, listWords);
}

function includesAny(text: string, candidates: string[]): boolean {
  return candidates.some((candidate) => text.toLowerCase().includes(candidate.toLowerCase()));
}
