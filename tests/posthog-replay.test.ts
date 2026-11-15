import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterPostHogEvent, maskReplayAttribute, maskReplayRequest, replayOptions } from '../src/lib/posthog-replay';

test('replay preserves masked snapshot data while stripping extra envelope properties', () => {
  assert.equal(typeof filterPostHogEvent, 'function');
  if (typeof filterPostHogEvent !== 'function') return;
  const data = [{ type: 3, data: { text: '*****' } }];
  const result = filterPostHogEvent({ uuid: '01a1e149-df41-716c-9667-17e60fbf0aec', event: '$snapshot', properties: {
    $snapshot_data: data, $snapshot_bytes: 50, $session_id: 'session-id-123',
    question: 'private question', $current_url: 'https://solveplot.com/solve?token=secret',
  } });
  assert.equal(result?.properties.$snapshot_data, data);
  assert.equal(result?.properties.$session_id, 'session-id-123');
  assert.ok(!JSON.stringify(result).includes('private question'));
  assert.ok(!JSON.stringify(result).includes('secret'));
  assert.equal(filterPostHogEvent({uuid: '01a1e149-df41-716c-9667-17e60fbf0aec', event: '$autocapture', properties: {text: 'private'}}), null);
});

test('replay redacts private page URLs and drops network metadata and bodies', () => {
  const mask = maskReplayRequest;
  assert.deepEqual(mask({name: 'https://solveplot.com/history/private-id?token=secret#answer'}), {name: 'https://solveplot.com/history', duration:0, startTime:0, entryType:'navigation'});
  assert.equal(mask({name: 'https://solveplot.com/auth/callback?code=secret'}), null);
  assert.equal(mask({name: 'https://solveplot.com/api/solve', method: 'POST'}), null);
  assert.deepEqual(mask({name: 'https://solveplot.com/solve?text=secret', isInitial: true}), {name:'https://solveplot.com/solve', duration:0, startTime:0, entryType:'navigation'});
});

test('replay masks text, inputs, content attributes and calculator media', () => {
  assert.equal(replayOptions.maskAllInputs, true);
  assert.equal(replayOptions.maskTextSelector, '*');
  assert.equal(replayOptions.captureCanvas?.recordCanvas, false);
  assert.equal(maskReplayAttribute('aria-label', 'private question'), '');
  assert.equal(maskReplayAttribute('src', 'blob:private-upload'), '');
  assert.equal(maskReplayAttribute('href', 'https://solveplot.com/auth?token=secret'), '');
  assert.equal(maskReplayAttribute('style', 'background:url(private-image)'), '');
  assert.equal(maskReplayAttribute('class', 'rounded-card'), 'rounded-card');
});
