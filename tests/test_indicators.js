const test = require('node:test');
const assert = require('node:assert/strict');
const {simpleMovingAverage, exponentialMovingAverage, averageTrueRange, relativeStrengthIndex, normalizePeriod, normalizeLineWidth, findRelativeExtrema} = require('../static/indicators.js');

test('SMA starts after a complete period and keeps a rolling average', () => {
  assert.deepEqual(simpleMovingAverage([1, 2, 3, 4, 5], 3), [null, null, 2, 3, 4]);
});

test('EMA uses an SMA seed and applies exponential weighting', () => {
  assert.deepEqual(exponentialMovingAverage([1, 2, 3, 4, 5], 3), [null, null, 2, 3, 4]);
  assert.deepEqual(exponentialMovingAverage([2, 4, 8, 16], 2), [null, 3, 19 / 3, 115 / 9]);
});

test('ATR includes gaps and uses Wilder smoothing', () => {
  const candles = [
    {high: 12, low: 10, close: 11},
    {high: 15, low: 13, close: 14},
    {high: 14, low: 10, close: 11},
  ];
  assert.deepEqual(averageTrueRange(candles, 2), [null, 3, 3.5]);
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

test('line widths support half steps and stay within the drawing limits', () => {
  assert.equal(normalizeLineWidth('2.5'), 2.5);
  assert.equal(normalizeLineWidth(0), 1);
  assert.equal(normalizeLineWidth(8), 5);
  assert.equal(normalizeLineWidth('invalid'), 2);
});

test('relative extrema use candle highs and lows and ignore endpoints', () => {
  const candles = [
    {high: 10, low: 7},
    {high: 15, low: 8},
    {high: 12, low: 4},
    {high: 14, low: 6},
  ];
  assert.deepEqual(findRelativeExtrema(candles), [
    {index: 1, type: 'maximum', value: 15},
    {index: 2, type: 'minimum', value: 4},
  ]);
  assert.deepEqual(findRelativeExtrema(candles.slice(0, 2)), []);
});
