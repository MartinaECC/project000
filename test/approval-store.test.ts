import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryApprovalStore } from '../src/approval-store.ts';

test('stores and returns latest pending approval for the same user and conversation', () => {
  const store = new InMemoryApprovalStore(() => new Date('2026-06-19T10:00:00.000Z'));

  const approval = store.create({
    actionType: 'submit_weekly_report',
    conversationId: 'cid-1',
    userId: 'user-1',
    summary: '提交周报',
    payload: { content: '本周完成 A' }
  });

  assert.equal(approval.status, 'pending');
  assert.equal(store.latestPending('user-1', 'cid-1')?.id, approval.id);
});

test('marks an approval as confirmed once and prevents a second confirmation', () => {
  const store = new InMemoryApprovalStore(() => new Date('2026-06-19T10:00:00.000Z'));
  const approval = store.create({
    actionType: 'submit_weekly_report',
    conversationId: 'cid-1',
    userId: 'user-1',
    summary: '提交周报',
    payload: { content: '本周完成 A' }
  });

  assert.equal(store.confirm(approval.id)?.status, 'confirmed');
  assert.equal(store.confirm(approval.id), undefined);
});
