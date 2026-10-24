#!/usr/bin/env node
/**
 * ASLAN execution coordinator (development-only).
 * Local JSONL journal, deterministic routing, allowlisted read-only checks,
 * evidence-based verification. No shell, arbitrary commands, deploys or secrets.
 * Usage: node scripts/ops/aslan-execution-engine.mjs <submit|run|status> [file|id]
 */
import { readFileSync, appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { validateCommand } from './aslan-command-intake.mjs';

const ROUTES = Object.freeze({
  website: { audit: 'typecheck', test: 'typecheck', build: 'typecheck' },
  academy: { audit: 'academy-tests', test: 'academy-tests' },
  market: { audit: 'typecheck', test: 'typecheck' },
  community: { audit: 'typecheck', test: 'typecheck' },
  services: { audit: 'typecheck', test: 'typecheck' },
  administration: { audit: 'typecheck', test: 'typecheck' }
});
const TOOLS = Object.freeze({
  'typecheck': { executable: 'npm', args: ['run', 'typecheck'], timeout: 120000 },
  'academy-tests': { executable: 'npm', args: ['run', 'test:academy'], timeout: 120000 }
});
const JOURNAL = resolve(process.env.ASLAN_OPS_JOURNAL || '.aslan-ops/commands.jsonl');
const ROOT = resolve(import.meta.dirname, '../..');

export function routeCommand(request) {
  const validation = validateCommand(request);
  if (!validation.valid) return { allowed: false, errors: validation.errors };
  const tool = ROUTES[request.team]?.[request.kind];
  if (!tool) return { allowed: false, errors: ['No allowlisted tool for this team and command kind'] };
  return { allowed: true, tool };
}
function history() {
  if (!existsSync(JOURNAL)) return [];
  return readFileSync(JOURNAL, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
}
function record(event) {
  mkdirSync(dirname(JOURNAL), { recursive: true, mode: 0o700 });
  appendFileSync(JOURNAL, JSON.stringify({ ...event, at: new Date().toISOString() }) + '\n', { mode: 0o600 });
}
function latest(id) {
  return history().filter(e => e.id === id).at(-1);
}
function submit(request) {
  const route = routeCommand(request);
  const id = randomUUID();
  if (!route.allowed) return { id, status: 'rejected', errors: route.errors };
  record({ id, status: 'queued', team: request.team, kind: request.kind, tool: route.tool, title: request.title, target: request.target });
  return { id, status: 'queued', tool: route.tool };
}
function verify(result) {
  return result.status === 0 && !result.error && result.signal === null;
}
function run(id) {
  const current = latest(id);
  if (!current) return { status: 'not_found' };
  if (current.status !== 'queued') return { id, status: 'not_runnable', previous: current.status };
  const tool = TOOLS[current.tool];
  if (!tool) return { id, status: 'rejected', reason: 'Tool not allowlisted' };
  record({ id, status: 'running', tool: current.tool });
  const result = spawnSync(tool.executable, tool.args, { cwd: ROOT, shell: false, encoding: 'utf8', timeout: tool.timeout, maxBuffer: 1024 * 1024, env: { ...process.env, CI: 'true' } });
  const passed = verify(result);
  const evidence = {
    exitCode: result.status, signal: result.signal, error: result.error?.code || null,
    stdoutTail: String(result.stdout || '').slice(-2500),
    stderrTail: String(result.stderr || '').slice(-2500)
  };
  record({ id, status: passed ? 'verified' : 'failed', tool: current.tool, evidence });
  return { id, status: passed ? 'verified' : 'failed', evidence };
}
export function main(argv) {
  const [action, arg] = argv;
  if (action === 'submit' && arg) return submit(JSON.parse(readFileSync(arg, 'utf8')));
  if (action === 'run' && arg && /^[0-9a-f-]{36}$/i.test(arg)) return run(arg);
  if (action === 'status') return arg ? history().filter(e => e.id === arg) : history();
  return { status: 'error', message: 'Usage: submit <request.json> | run <uuid> | status [uuid]' };
}
if (process.argv[1]?.endsWith('aslan-execution-engine.mjs')) {
  try {
    const response = main(process.argv.slice(2));
    process.stdout.write(JSON.stringify(response, null, 2) + '\n');
    if (['error', 'failed', 'rejected', 'not_found'].includes(response.status)) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(JSON.stringify({ status: 'error', message: error.message }) + '\n');
    process.exitCode = 1;
  }
}
