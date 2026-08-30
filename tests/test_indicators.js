const test = require('node:test');
const assert = require('node:assert/strict');
const {simpleMovingAverage, relativeStrengthIndex} = require('../static/indicators.js');

test('SMA starts after a complete period and keeps a rolling average', () => {
  assert.deepEqual(simpleMovingAverage([1, 2, 3, 4, 5], 3), [null, null, 2, 3, 4]);
});

test('RSI reports the expected limits for trends and neutral flat prices', () => {
  assert.equal(relativeStrengthIndex([1, 2, 3, 4, 5], 3)[4], 100);
  assert.equal(relativeStrengthIndex([5, 4, 3, 2, 1], 3)[4], 0);
  assert.equal(relativeStrengthIndex([2, 2, 2, 2, 2], 3)[4], 50);
});
