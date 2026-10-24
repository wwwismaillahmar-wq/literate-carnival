#!/usr/bin/env node
/**
 * ASLAN result acceptance gate. A successful tool exit is NOT task completion.
 * Explicit human review is mandatory; this is a local audit receipt, not authentication.
 * Usage: node scripts/ops/aslan-result-approval.mjs <task-uuid> <reviewer-id> <evidence-note>
 */
import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const journal = resolve(process.env.ASLAN_OPS_JOURNAL || '.aslan-ops/commands.jsonl');
export function assessApproval(events, id, reviewer, note) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return { accepted: false, reason: 'Invalid task id' };
  const relevant = events.filter(e => e.id === id);
  const last = relevant.at(-1);
  if (!last || last.status !== 'verified') return { accepted: false, reason: 'Task has no successful verified result or was already reviewed' };
  if (last.evidence?.exitCode !== 0 || last.evidence?.error || last.evidence?.signal) return { accepted: false, reason: 'Invalid execution evidence' };
  if (typeof reviewer !== 'string' || !/^[a-zA-Z0-9_.-]{3,80}$/.test(reviewer)) return { accepted: false, reason: 'Reviewer id required' };
  if (typeof note !== 'string' || note.trim().length < 20 || note.length > 1000) return { accepted: false, reason: 'Specific acceptance evidence note required' };
  return { accepted: true, status: 'accepted', reviewer, note: note.trim() };
}
if (process.argv[1]?.endsWith('aslan-result-approval.mjs')) {
  const [id, reviewer, note] = process.argv.slice(2);
  try {
    const events = existsSync(journal) ? readFileSync(journal, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : [];
    const result = assessApproval(events, id, reviewer, note);
    if (result.accepted) {
      appendFileSync(journal, JSON.stringify({ id, status: 'accepted', reviewer: result.reviewer, note: result.note, at: new Date().toISOString() }) + '\n', { mode: 0o600 });
    } else process.exitCode = 2;
    process.stdout.write(JSON.stringify(result) + '\n');
  } catch (error) {
    process.stderr.write(String(error.message) + '\n');
    process.exitCode = 1;
  }
}
