import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanAnalyticsProperties, referralOrigin, safeAnalyticsUrl } from '../src/lib/posthog-privacy';
import { createSolverMeasurement } from '../src/lib/product-analytics';

test('PostHog payloads exclude private data, default person properties, and URL secrets', () => {
  const clean = cleanAnalyticsProperties({
    token: 'phc_publicprojecttoken', distinct_id: 'f0e3d460-2222-4444-aaaa-222222222222',
    $current_url: 'https://solveplot.com/history/private-question?token=secret#answer',
    $referrer: 'https://www.google.com/search?q=private-question',
    $set: { email: 'private@example.com' }, $set_once: { $initial_current_url: 'secret' },
    question: 'private question', image: 'data:image/png;base64,private', password: 'secret',
    $title: 'private question title', method_selected: 'desmos', duration_ms: 1200.7,
  });
  assert.equal(clean.$current_url, 'https://solveplot.com/history');
  assert.equal(clean.$referrer, 'https://www.google.com');
  assert.equal(clean.duration_ms, 1201);
  assert.equal(clean.method_selected, 'desmos');
  for (const value of ['secret', 'private', 'base64', '@']) assert.ok(!JSON.stringify(clean).includes(value));
  assert.equal(safeAnalyticsUrl('https://solveplot.com/auth/callback?code=secret'), undefined);
  assert.equal(safeAnalyticsUrl('https://solveplot.com/question-bank?question=private'), 'https://solveplot.com/question-bank');
  assert.equal(referralOrigin('javascript:alert(1)'), '$direct');
});

test('PostHog enums and duration are bounded even when a caller supplies arbitrary data', () => {
  assert.deepEqual(cleanAnalyticsProperties({ method_selected: 'secret', source: 'private', duration_ms: Infinity, failure_stage: 'private error', email: 'private' }), { $ip: '0.0.0.0', $geoip_disable: true });
});

test('a successful solve emits one submission and one timed outcome through repeated validation', () => {
  const events: { name: string; props: unknown }[] = [];
  let time = 10;
  const tracker = createSolverMeasurement({ input: 'image', source: 'google' }, () => {}, (name, props) => { events.push({ name, props }); }, () => time);
  tracker.mark('solver_started'); tracker.mark('solver_started');
  tracker.method('desmos'); time = 2010;
  tracker.mark('solver_method_ready'); tracker.mark('solver_solution_ready'); tracker.mark('solver_solution_ready'); tracker.fail('validation');
  assert.deepEqual(events.map(e => e.name), ['question_submitted', 'solution_generated']);
  assert.deepEqual(events[1].props, { input_type: 'image', source: 'google', method_selected: 'desmos', duration_ms: 2000, success: true });
});

test('failure is terminal and telemetry exceptions never interrupt a solve', () => {
  const names: string[] = [];
  const tracker = createSolverMeasurement({ input: 'text', source: 'direct_or_unknown' }, () => {}, name => { names.push(name); }, () => 0);
  tracker.fail('request'); tracker.mark('solver_started'); tracker.fail('timeout'); tracker.fail('validation'); tracker.mark('solver_solution_ready');
  assert.deepEqual(names, ['question_submitted', 'solution_failed']);
  const broken = createSolverMeasurement({ input: 'text', source: 'google' }, () => { throw Error('offline'); }, () => { throw Error('blocked'); });
  assert.doesNotThrow(() => { broken.mark('solver_started'); broken.fail('request'); });
});
