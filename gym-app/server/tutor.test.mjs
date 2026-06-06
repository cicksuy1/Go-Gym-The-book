// Tests for the tutor envelope parser. No live SDK session is opened here —
// importing tutor.mjs only registers routes and exports; the conversation host
// is lazy and never started unless askTutor/POST /input is called.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseEnvelope } from './tutor.mjs';

test('parses a bare say envelope', () => {
  const env = parseEnvelope('{"type":"say","text":"hello"}');
  assert.deepEqual(env, { type: 'say', text: 'hello' });
});

test('parses a fenced say envelope', () => {
  const text = '```json\n{"type":"say","text":"fenced"}\n```';
  const env = parseEnvelope(text);
  assert.equal(env.type, 'say');
  assert.equal(env.text, 'fenced');
});

test('parses an envelope surrounded by prose', () => {
  const text =
    'Here is my reply for you.\n{"type":"hint","level":1,"text":"look at the return"}\nThanks!';
  const env = parseEnvelope(text);
  assert.equal(env.type, 'hint');
  assert.equal(env.level, 1);
});

test('parses a multiline / pretty-printed envelope', () => {
  const text = `{
    "type": "grade",
    "question": 2,
    "verdict": "partial",
    "feedback": "close",
    "reteach": "the timing matters"
  }`;
  const env = parseEnvelope(text);
  assert.equal(env.type, 'grade');
  assert.equal(env.question, 2);
  assert.equal(env.verdict, 'partial');
  assert.equal(env.reteach, 'the timing matters');
});

test('grade envelope is valid without reteach (correct verdict)', () => {
  const env = parseEnvelope('{"type":"grade","question":1,"verdict":"correct","feedback":"nailed it"}');
  assert.equal(env.verdict, 'correct');
  assert.equal(env.reteach, undefined);
});

test('handles braces inside JSON string values', () => {
  const env = parseEnvelope('{"type":"say","text":"use {} for an empty block"}');
  assert.equal(env.type, 'say');
  assert.equal(env.text, 'use {} for an empty block');
});

test('picks the LAST valid object when several are present', () => {
  const text =
    '{"type":"say","text":"first"}\nsome reasoning\n{"type":"say","text":"final"}';
  const env = parseEnvelope(text);
  assert.equal(env.text, 'final');
});

test('skips a trailing malformed object and finds the prior valid one', () => {
  const text = '{"type":"say","text":"good"}\n{"type":"say","text": oops}';
  const env = parseEnvelope(text);
  assert.equal(env.text, 'good');
});

test('rejects an unknown type', () => {
  assert.equal(parseEnvelope('{"type":"spike","skills_seen":true}'), null);
});

test('rejects a say envelope missing text', () => {
  assert.equal(parseEnvelope('{"type":"say"}'), null);
});

test('rejects a grade envelope missing required fields', () => {
  assert.equal(parseEnvelope('{"type":"grade","question":1}'), null);
});

test('rejects a grade envelope with an invalid verdict', () => {
  assert.equal(
    parseEnvelope('{"type":"grade","question":1,"verdict":"maybe","feedback":"x"}'),
    null,
  );
});

test('rejects a grade envelope with a non-integer question', () => {
  assert.equal(
    parseEnvelope('{"type":"grade","question":"one","verdict":"correct","feedback":"x"}'),
    null,
  );
});

test('rejects a hint envelope with an out-of-range level', () => {
  assert.equal(parseEnvelope('{"type":"hint","level":5,"text":"too far"}'), null);
});

test('rejects a hint envelope missing text', () => {
  assert.equal(parseEnvelope('{"type":"hint","level":2}'), null);
});

test('returns null when there is no JSON object at all', () => {
  assert.equal(parseEnvelope('I have no idea, sorry.'), null);
});

test('returns null for non-string input', () => {
  assert.equal(parseEnvelope(null), null);
  assert.equal(parseEnvelope(undefined), null);
  assert.equal(parseEnvelope(42), null);
});

test('recovers the inner envelope object even when wrapped in an array', () => {
  // The scanner extracts balanced {...} objects, so a valid envelope nested in
  // an array is still found — a useful recovery rather than a hard reject.
  const env = parseEnvelope('[{"type":"say","text":"x"}]');
  assert.deepEqual(env, { type: 'say', text: 'x' });
});

test('rejects a bare JSON array with no envelope object inside', () => {
  assert.equal(parseEnvelope('["just","strings"]'), null);
});
