import test from 'node:test';
import assert from 'node:assert/strict';
import { assessApproval } from '../../scripts/ops/aslan-result-approval.mjs';

const id = '00000000-0000-4000-8000-000000000001';
const verified = [{ id, status: 'verified', evidence: { exitCode: 0, signal: null, error: null } }];

test('accepts reviewed verified result', () => {
  assert.equal(assessApproval(verified, id, 'qa-reviewer', 'Checked the task output and acceptance criteria.').accepted, true);
});
test('rejects unverified or failed result', () => {
  assert.equal(assessApproval([], id, 'qa-reviewer', 'Checked the task output and acceptance criteria.').accepted, false);
  assert.equal(assessApproval([{ id, status: 'failed' }], id, 'qa-reviewer', 'Checked the task output and acceptance criteria.').accepted, false);
});
test('rejects weak review evidence', () => {
  assert.equal(assessApproval(verified, id, 'qa-reviewer', 'ok').accepted, false);
});
test('rejects repeated approval', () => {
  assert.equal(assessApproval([...verified, { id, status: 'accepted' }], id, 'qa-reviewer', 'Checked the task output and acceptance criteria.').accepted, false);
});
