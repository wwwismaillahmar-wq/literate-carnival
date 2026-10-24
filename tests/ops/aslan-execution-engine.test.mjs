import test from 'node:test';
import assert from 'node:assert/strict';
import { routeCommand } from '../../scripts/ops/aslan-execution-engine.mjs';

const valid = {
  version: 1, team: 'academy', kind: 'test',
  title: 'Validate academy tests', description: 'Run the existing academy test suite in development.',
  target: 'development', approved: false
};

test('routes approved class of development checks to an allowlisted tool', () => {
  assert.deepEqual(routeCommand(valid), { allowed: true, tool: 'academy-tests' });
});

test('rejects unsupported command types and unknown teams', () => {
  assert.equal(routeCommand({ ...valid, kind: 'repair' }).allowed, false);
  assert.equal(routeCommand({ ...valid, team: 'external' }).allowed, false);
});

test('rejects production and privileged requests', () => {
  assert.equal(routeCommand({ ...valid, target: 'production' }).allowed, false);
  assert.equal(routeCommand({ ...valid, description: 'Deploy production application now' }).allowed, false);
});

test('requires new requests to be unapproved', () => {
  assert.equal(routeCommand({ ...valid, approved: true }).allowed, false);
});
