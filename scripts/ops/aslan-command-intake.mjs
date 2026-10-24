#!/usr/bin/env node
/**
 * ASLAN execution intake — safe, dependency-free validation.
 * This tool NEVER executes commands or changes infrastructure.
 * Usage: node scripts/ops/aslan-command-intake.mjs <request.json>
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const allowedTeams = new Set(['website', 'academy', 'market', 'community', 'services', 'administration']);
const allowedKinds = new Set(['audit', 'test', 'build', 'repair', 'documentation']);
const blockedWords = /\b(deploy|production|billing|payment|purchase|delete|drop|truncate|secret|credential|ssh|sudo|restart)\b/i;

export function validateCommand(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { valid: false, errors: ['Request must be an object'] };
  if (input.version !== 1) errors.push('version must be 1');
  if (!allowedTeams.has(input.team)) errors.push('Unsupported team');
  if (!allowedKinds.has(input.kind)) errors.push('Unsupported command kind');
  if (typeof input.title !== 'string' || input.title.trim().length < 5 || input.title.length > 160) errors.push('title must be 5–160 characters');
  if (typeof input.description !== 'string' || input.description.trim().length < 10 || input.description.length > 4000) errors.push('description must be 10–4000 characters');
  if (input.target !== 'development') errors.push('Only development target is permitted');
  if (input.approved !== false) errors.push('New requests must be unapproved');
  if (blockedWords.test(String(input.title ?? '') + ' ' + String(input.description ?? ''))) errors.push('Sensitive action requires a separate explicit authorization workflow');
  return { valid: errors.length === 0, errors };
}

if (process.argv[1]?.endsWith('aslan-command-intake.mjs')) {
  try {
    if (process.argv.length !== 3) throw new Error('Usage: node scripts/ops/aslan-command-intake.mjs <request.json>');
    const request = JSON.parse(readFileSync(process.argv[2], 'utf8'));
    const result = validateCommand(request);
    const output = result.valid
      ? { status: 'queued_for_review', id: randomUUID(), team: request.team, kind: request.kind, target: request.target, note: 'Validated only; no command was executed or persisted.' }
      : { status: 'rejected', errors: result.errors };
    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    if (!result.valid) process.exitCode = 2;
  } catch (error) {
    process.stderr.write(String(error.message) + '\n');
    process.exitCode = 1;
  }
}
