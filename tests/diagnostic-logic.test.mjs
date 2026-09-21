import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const D = require('../assets/diagnostic-logic.js');
const routes = require('../assets/routes.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const base = { q1: 'conversations', q2: 'research', q3: 'conversations', q4: 'working', q5: 'weekly', q6: 'month', q7: ['owner', 'access', 'examples'] };
const with_ = (over) => ({ ...base, ...over });
const route = (a) => D.recommend(a).route;

test('seven questions at most, six routes', () => {
  assert.ok(D.QUESTIONS.length <= 7);
  assert.deepEqual([...D.ROUTES], ['outreach', 'goldmine', 'database', 'brief', 'studio', 'architect']);
});

test('every route is reachable through at least one answer path', () => {
  const paths = {
    outreach: with_({}),
    goldmine: with_({ q1: 'crm', q2: 'prioritise', q3: 'queue', q4: 'history' }),
    database: with_({ q1: 'database', q2: 'data', q3: 'database', q4: 'incomplete' }),
    brief: with_({ q1: 'prep', q2: 'context', q3: 'prep' }),
    studio: with_({ q1: 'campaign', q2: 'drafting', q3: 'campaigns' }),
    architect: with_({ q1: 'unknown', q2: 'reporting', q3: 'first', q4: 'unsure' })
  };
  for (const [expected, answers] of Object.entries(paths)) assert.equal(route(answers), expected, expected);
});

test('Goldmine and database stay distinct', () => {
  const crm = with_({ q1: 'crm', q2: 'prioritise', q3: 'queue', q4: 'history' });
  const data = with_({ q1: 'database', q2: 'data', q3: 'database', q4: 'incomplete' });
  assert.equal(route(crm), 'goldmine');
  assert.equal(route(data), 'database');
  const crmScores = D.recommend(crm).scores;
  assert.ok(crmScores.goldmine > crmScores.database);
});

test('two aligned answers can outweigh the Q1 choice', () => {
  assert.equal(route(with_({ q1: 'conversations', q2: 'context', q3: 'prep' })), 'brief');
});

test('base scores follow the brief exactly', () => {
  const r = D.recommend(with_({ q1: 'crm', q2: 'prioritise', q3: 'queue', q4: 'history', q5: 'monthly', q6: 'exploring' }));
  // goldmine: Q1 5 + Q2 4 + Q3 4 + Q4 3 = 16, plus Q5 monthly bonus 1 = 17
  assert.equal(r.scores.goldmine, 17);
});

test('Q6 adds one point to the top explicit route only when the timeline is short', () => {
  const soon = D.recommend(with_({ q1: 'crm', q2: 'prioritise', q3: 'queue', q4: 'history', q5: 'monthly', q6: 'twoweeks' }));
  const later = D.recommend(with_({ q1: 'crm', q2: 'prioritise', q3: 'queue', q4: 'history', q5: 'monthly', q6: 'quarter' }));
  assert.equal(soon.scores.goldmine - later.scores.goldmine, 1);
  const thisMonth = D.recommend(with_({ q1: 'crm', q2: 'prioritise', q3: 'queue', q4: 'history', q5: 'monthly', q6: 'month' }));
  assert.equal(thisMonth.scores.goldmine, soon.scores.goldmine);
  const exploring = D.recommend(with_({ q1: 'crm', q2: 'prioritise', q3: 'queue', q4: 'history', q5: 'monthly', q6: 'exploring' }));
  assert.equal(exploring.scores.goldmine, later.scores.goldmine);
});

test('Q5 frequency bonus goes to the highest non-architect route', () => {
  const answers = with_({ q1: 'crm', q2: 'prioritise', q3: 'queue', q4: 'history', q6: 'quarter' });
  for (const [freq, bonus] of [['daily', 3], ['weekly', 2], ['monthly', 1]]) {
    const r = D.recommend({ ...answers, q5: freq });
    assert.equal(r.q5Target, 'goldmine');
    assert.equal(r.scores.goldmine, 16 + bonus, freq);
  }
});

test('Q5 bonus skips architect even when architect leads', () => {
  const answers = with_({ q1: 'unknown', q2: 'reporting', q3: 'first', q4: 'working', q5: 'daily', q6: 'quarter' });
  const r = D.recommend(answers);
  assert.notEqual(r.q5Target, 'architect');
  assert.equal(r.route, 'architect');
});

test('one-off or changing workflows add two points to architect', () => {
  const daily = D.recommend(with_({ q5: 'daily', q6: 'quarter' }));
  const oneoff = D.recommend(with_({ q5: 'oneoff', q6: 'quarter' }));
  assert.equal(oneoff.scores.architect - daily.scores.architect, 2);
  assert.equal(oneoff.q5Target, null);
});

test('tie is resolved by the route selected in Q1', () => {
  const r = D.recommend({ q1: 'crm', q2: 'drafting', q3: 'campaigns', q4: 'history', q5: 'monthly', q6: 'quarter', q7: ['owner'] });
  // goldmine and studio are level after Q1 to Q4 (8 each); Q1 names goldmine
  assert.equal(r.topExplicit, 'goldmine');
  assert.equal(r.route, 'goldmine');
});

test('when Q1 is not in the tie, Q2 then Q3 decide, then the fixed order', () => {
  const s = { outreach: 0, goldmine: 5, database: 0, brief: 8, studio: 8, architect: 0 };
  assert.equal(D.pickWinner(s, { q1Route: 'goldmine', q2Route: 'brief', q3Route: 'studio' }), 'brief');
  assert.equal(D.pickWinner(s, { q1Route: 'goldmine', q2Route: 'outreach', q3Route: 'studio' }), 'studio');
  assert.equal(D.pickWinner(s, { q1Route: 'goldmine', q2Route: 'outreach', q3Route: 'database' }), 'brief');
});

test('unknown constraint: architect wins when within 2 points of the leader', () => {
  const near = { q1: 'unknown', q2: 'research', q3: 'queue', q4: 'working', q5: 'monthly', q6: 'quarter', q7: ['owner'] };
  const r = D.recommend(near);
  assert.ok(r.scores.outreach - r.scores.architect <= 2 && r.scores.outreach > r.scores.architect);
  assert.equal(r.route, 'architect');
  const far = D.recommend({ ...near, q5: 'daily' });
  assert.ok(far.scores.outreach - far.scores.architect > 2);
  assert.equal(far.route, 'outreach');
});

test('the architect rule applies only when Q1 is the unknown constraint', () => {
  const s = { outreach: 6, goldmine: 0, database: 0, brief: 0, studio: 0, architect: 5 };
  assert.equal(D.pickWinner(s, { q1Route: 'outreach', q2Route: 'outreach', q3Route: 'outreach' }), 'outreach');
  assert.equal(D.pickWinner(s, { q1Route: 'architect', q2Route: 'outreach', q3Route: 'outreach' }), 'architect');
});

test('readiness follows the first four Q7 options', () => {
  const r = (q7) => D.recommend(with_({ q7 })).readiness;
  assert.equal(r(['owner', 'access', 'examples', 'time']), 'ready');
  assert.equal(r(['owner', 'access', 'examples']), 'ready');
  assert.equal(r(['owner', 'access']), 'prepare');
  assert.equal(r(['time']), 'prepare');
  assert.equal(r(['none']), 'early');
  assert.equal(r(['none', 'owner']), 'early');
});

test('readiness changes the next step, never the route', () => {
  const routes3 = ['ready', 'prepare', 'early'].map((level) => {
    const q7 = { ready: ['owner', 'access', 'examples', 'time'], prepare: ['owner'], early: ['none'] }[level];
    return route(with_({ q7 }));
  });
  assert.equal(new Set(routes3).size, 1);
  assert.match(D.recommend(with_({ q7: ['none'] })).readinessCopy, /^Do not buy a build yet/);
});

test('incomplete answers do not produce a result', () => {
  assert.equal(D.recommend({ q1: 'crm' }).complete, false);
  assert.deepEqual(D.recommend({ ...base, q7: [] }).missing, ['q7']);
});

test('sweep: every answer combination is deterministic, valid and reaches all six routes', () => {
  const ids = (q) => D.question(q).options.map((o) => o.id);
  const seen = new Set();
  let runs = 0;
  for (const q1 of ids('q1')) for (const q2 of ids('q2')) for (const q3 of ids('q3')) for (const q4 of ids('q4'))
    for (const q5 of ids('q5')) for (const q6 of ids('q6')) {
      const answers = { q1, q2, q3, q4, q5, q6, q7: ['owner'] };
      const a = D.recommend(answers);
      const b = D.recommend(JSON.parse(JSON.stringify(answers)));
      assert.equal(a.route, b.route);
      assert.ok(D.ROUTES.includes(a.route));
      assert.ok(Object.values(a.scores).every((n) => Number.isInteger(n) && n >= 0));
      seen.add(a.route);
      runs++;
    }
  assert.equal(runs, 6 * 6 * 6 * 6 * 4 * 4);
  assert.deepEqual([...seen].sort(), [...D.ROUTES].sort());
});

test('result CTAs use the specified labels and resolve to live destinations', () => {
  const labels = {
    outreach: 'Scope my outreach infrastructure',
    goldmine: 'Check if my CRM is ready',
    database: 'Scope my data foundation',
    brief: 'See The Brief - £1,000 fixed setup',
    studio: 'See Marketing Studio',
    architect: 'See Revenue Architect - live soon'
  };
  for (const r of D.ROUTES) {
    const cta = D.RESULTS[r].cta;
    assert.equal(cta.label, labels[r]);
    const [kind, key] = cta.target.split(':');
    if (kind === 'external') assert.ok(routes.external[key], key);
    else assert.ok(fs.existsSync(path.join(root, routes.pages[key])), key);
  }
});

test('answers are ids only, so no free text or personal data enters the logic', () => {
  for (const q of D.QUESTIONS) for (const o of q.options) assert.match(o.id, /^[a-z]+$/);
});
