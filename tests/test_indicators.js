const test = require('node:test');
const assert = require('node:assert/strict');
const {simpleMovingAverage, relativeStrengthIndex, normalizePeriod} = require('../static/indicators.js');

test('SMA starts after a complete period and keeps a rolling average', () => {
  assert.deepEqual(simpleMovingAverage([1, 2, 3, 4, 5], 3), [null, null, 2, 3, 4]);
});

test('RSI reports the expected limits for trends and neutral flat prices', () => {
  assert.equal(relativeStrengthIndex([1, 2, 3, 4, 5], 3)[4], 100);
  assert.equal(relativeStrengthIndex([5, 4, 3, 2, 1], 3)[4], 0);
  assert.equal(relativeStrengthIndex([2, 2, 2, 2, 2], 3)[4], 50);
});

test('indicator periods are rounded, bounded and recover from invalid values', () => {
  assert.equal(normalizePeriod('35.7'), 36);
  assert.equal(normalizePeriod(1), 2);
  assert.equal(normalizePeriod(300), 200);
  assert.equal(normalizePeriod('invalid'), 20);
});
