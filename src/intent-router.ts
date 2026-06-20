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

export function routeIntent(text: string): Intent {
  const normalized = text.trim();

  if (isGroupSummaryRequest(normalized)) {
    return {
      type: 'summarize_group',
      range: includesAny(normalized, weekWords) ? 'this_week' : 'today'
    };
  }

  return { type: 'unknown' };
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

function includesAny(text: string, candidates: string[]): boolean {
  return candidates.some((candidate) => text.toLowerCase().includes(candidate.toLowerCase()));
}
