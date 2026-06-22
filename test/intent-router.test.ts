import test from 'node:test';
import assert from 'node:assert/strict';
import { routeIntent } from '../src/intent-router.ts';

const zh = String.raw;

test('routes today group summary requests', () => {
  assert.deepEqual(routeIntent('\u603b\u7ed3\u4eca\u5929\u7fa4\u6d88\u606f'), {
    type: 'summarize_group',
    range: 'today'
  });
  assert.deepEqual(routeIntent('\u5e2e\u6211\u6982\u62ec\u4e00\u4e0b\u4eca\u5929\u7fa4\u804a\u8ba8\u8bba'), {
    type: 'summarize_group',
    range: 'today'
  });
});

test('routes this week group summary requests', () => {
  assert.deepEqual(routeIntent('\u603b\u7ed3\u672c\u5468\u7fa4\u6d88\u606f'), {
    type: 'summarize_group',
    range: 'this_week'
  });
  assert.deepEqual(routeIntent('\u590d\u76d8\u8fd9\u5468\u7fa4\u91cc\u8ba8\u8bba\u7684\u4e8b\u60c5'), {
    type: 'summarize_group',
    range: 'this_week'
  });
  assert.deepEqual(routeIntent('\u603b\u7ed3\u4ea7\u54c1\u8fd0\u8425\u4e2d\u5fc3\u7fa4\u8fd1\u4e00\u5468\u804a\u5929\u8bb0\u5f55'), {
    type: 'summarize_group',
    range: 'this_week'
  });
  assert.deepEqual(routeIntent('\u4ea7\u54c1\u8fd0\u8425\u4e2d\u5fc3\u7fa4\u8fd1\u4e00\u5468\u804a\u5929\u8bb0\u5f55'), {
    type: 'summarize_group',
    range: 'this_week'
  });
});

test('routes normal chat requests as unknown', () => {
  assert.deepEqual(routeIntent('\u4f60\u662f\u8c01'), { type: 'unknown' });
});

test('routes tagged intake messages', () => {
  assert.deepEqual(routeIntent('[\u5f85\u529e] \u660e\u5929\u8ddf\u8fdb EcoCC \u767d\u540d\u5355'), {
    type: 'capture_intake',
    itemType: '\u5f85\u529e',
    label: '\u5f85\u529e',
    text: '\u660e\u5929\u8ddf\u8fdb EcoCC \u767d\u540d\u5355',
    rawText: '[\u5f85\u529e] \u660e\u5929\u8ddf\u8fdb EcoCC \u767d\u540d\u5355'
  });
  assert.deepEqual(routeIntent('\uff3b\u8fdb\u5ea6\uff3d EcoCC Stream \u5df2\u8fde\u901a'), {
    type: 'capture_intake',
    itemType: '\u8fdb\u5ea6',
    label: '\u8fdb\u5ea6',
    text: 'EcoCC Stream \u5df2\u8fde\u901a',
    rawText: '\uff3b\u8fdb\u5ea6\uff3d EcoCC Stream \u5df2\u8fde\u901a'
  });
});

test('does not route unsupported labels as intake', () => {
  assert.deepEqual(routeIntent('[\u968f\u624b\u8bb0] \u666e\u901a\u804a\u5929'), { type: 'unknown' });
});

test('routes recent todo list requests', () => {
  assert.deepEqual(routeIntent('\u628a\u6700\u8fd1\u7684\u5f85\u529e\u6574\u7406\u51fa\u6765\u53d1\u7ed9\u6211'), {
    type: 'list_recent_todos',
    days: 7,
    limit: 10
  });
  assert.deepEqual(routeIntent('\u6211\u6709\u54ea\u4e9b\u5f85\u529e'), {
    type: 'list_recent_todos',
    days: 7,
    limit: 10
  });
});

test('routes natural-language todo capture requests', () => {
  assert.deepEqual(routeIntent('\u8bb0\u4e2a\u5f85\u529e \u660e\u5929\u8ddf\u8fdb EcoCC \u4f53\u9a8c'), {
    type: 'capture_intake',
    itemType: '\u5f85\u529e',
    label: '\u5f85\u529e',
    text: '\u660e\u5929\u8ddf\u8fdb EcoCC \u4f53\u9a8c',
    rawText: '\u8bb0\u4e2a\u5f85\u529e \u660e\u5929\u8ddf\u8fdb EcoCC \u4f53\u9a8c'
  });
  assert.deepEqual(routeIntent('\u63d0\u9192\u6211\u4e0b\u5348\u770b\u5ba2\u6237\u65b9\u6848'), {
    type: 'capture_intake',
    itemType: '\u5f85\u529e',
    label: '\u5f85\u529e',
    text: '\u4e0b\u5348\u770b\u5ba2\u6237\u65b9\u6848',
    rawText: '\u63d0\u9192\u6211\u4e0b\u5348\u770b\u5ba2\u6237\u65b9\u6848'
  });
});
