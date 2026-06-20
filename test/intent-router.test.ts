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
