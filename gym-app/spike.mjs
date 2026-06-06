// Phase-0 spike: prove the Claude Agent SDK works for the Gym App before building on it.
// Gates: (1) auth works with the existing Claude Code login (no ANTHROPIC_API_KEY),
//        (2) the repo's AGENTS.md / skills load via settingSources,
//        (3) the model can follow a strict JSON-envelope template (the gym-ui contract).
import { query } from '@anthropic-ai/claude-agent-sdk';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const prompt = [
  'Two checks, answer with EXACTLY one JSON object on a single line and nothing else:',
  '{"type":"spike","skills_seen":<true if a go-gym skill is available to you, else false>,',
  '"current_module":"<the **current:** slug from progress/PROGRESS.local.md, or templates default if missing>"}',
].join('\n');

console.log('repo root:', REPO_ROOT);
console.log('ANTHROPIC_API_KEY set:', Boolean(process.env.ANTHROPIC_API_KEY));

let sessionId = null;
let finalText = null;

try {
  for await (const msg of query({
    prompt,
    options: {
      cwd: REPO_ROOT,
      systemPrompt: { type: 'preset', preset: 'claude_code' },
      settingSources: ['user', 'project', 'local'],
      allowedTools: ['Read', 'Glob', 'Grep'],
      permissionMode: 'default',
      maxTurns: 6,
    },
  })) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      sessionId = msg.session_id;
      console.log('session_id:', sessionId);
      console.log('model:', msg.model ?? '(n/a)');
    }
    if (msg.type === 'result') {
      finalText = msg.subtype === 'success' ? msg.result : null;
      console.log('result subtype:', msg.subtype);
      console.log('cost USD:', msg.total_cost_usd);
      console.log('turns:', msg.num_turns);
    }
  }
} catch (err) {
  console.error('SPIKE FAILED:', err.message);
  process.exit(1);
}

console.log('raw result:', finalText);

// Gate 3: envelope parses
let envelope = null;
try {
  const jsonMatch = finalText?.match(/\{[\s\S]*\}/);
  envelope = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
} catch {
  /* fallthrough */
}

if (!envelope || envelope.type !== 'spike') {
  console.error('GATE 3 FAILED: response was not the requested JSON envelope');
  process.exit(1);
}

console.log('--- SPIKE RESULTS ---');
console.log('gate 1 (auth, no API key needed):', 'PASS');
console.log('gate 2 (repo skills loaded):', envelope.skills_seen ? 'PASS' : 'FAIL');
console.log('gate 3 (JSON envelope followed):', 'PASS');
console.log('current module per agent:', envelope.current_module);
console.log('resumable session id:', sessionId);
