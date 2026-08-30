(function exposeIndicators(global) {
  function simpleMovingAverage(values, period) {
    const result = Array(values.length).fill(null);
    if (!Number.isInteger(period) || period <= 0) return result;
    let sum = 0;
    for (let index = 0; index < values.length; index += 1) {
      sum += values[index];
      if (index >= period) sum -= values[index - period];
      if (index >= period - 1) result[index] = sum / period;
    }
    return result;
  }

  function exponentialMovingAverage(values, period) {
    const result = Array(values.length).fill(null);
    if (!Number.isInteger(period) || period <= 0 || values.length < period) return result;
    const seed = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
    const multiplier = 2 / (period + 1);
    result[period - 1] = seed;
    for (let index = period; index < values.length; index += 1) {
      result[index] = (values[index] - result[index - 1]) * multiplier + result[index - 1];
    }
    return result;
  }

  function averageTrueRange(candles, period = 14) {
    const result = Array(candles.length).fill(null);
    if (!Number.isInteger(period) || period <= 0 || candles.length < period) return result;
    const trueRanges = candles.map((candle, index) => {
      if (index === 0) return candle.high - candle.low;
      const previousClose = candles[index - 1].close;
      return Math.max(candle.high - candle.low, Math.abs(candle.high - previousClose), Math.abs(candle.low - previousClose));
    });
    let atr = trueRanges.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
    result[period - 1] = atr;
    for (let index = period; index < candles.length; index += 1) {
      atr = (atr * (period - 1) + trueRanges[index]) / period;
      result[index] = atr;
    }
    return result;
  }

  function relativeStrengthIndex(values, period = 14) {
    const result = Array(values.length).fill(null);
    if (!Number.isInteger(period) || period <= 0 || values.length <= period) return result;
    let gains = 0, losses = 0;
    for (let index = 1; index <= period; index += 1) {
      const change = values[index] - values[index - 1];
      gains += Math.max(change, 0); losses += Math.max(-change, 0);
    }
    let averageGain = gains / period, averageLoss = losses / period;
    result[period] = rsiValue(averageGain, averageLoss);
    for (let index = period + 1; index < values.length; index += 1) {
      const change = values[index] - values[index - 1];
      averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
      averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
      result[index] = rsiValue(averageGain, averageLoss);
    }
    return result;
  }

  function rsiValue(averageGain, averageLoss) {
    if (averageLoss === 0) return averageGain === 0 ? 50 : 100;
    return 100 - (100 / (1 + averageGain / averageLoss));
  }

  function normalizePeriod(value, fallback = 20, minimum = 2, maximum = 200) {
    const period = Math.round(Number(value));
    return Math.max(minimum, Math.min(maximum, Number.isFinite(period) ? period : fallback));
  }

  function normalizeLineWidth(value, fallback = 2) {
    const width = Number(value);
    return Math.max(1, Math.min(5, Number.isFinite(width) ? width : fallback));
  }

  function findRelativeExtrema(candles) {
    const extrema = [];
    if (!Array.isArray(candles) || candles.length < 3) return extrema;
    for (let index = 1; index < candles.length - 1; index += 1) {
      const previous = candles[index - 1], current = candles[index], next = candles[index + 1];
      if (current.high > previous.high && current.high > next.high) {
        extrema.push({index, type: 'maximum', value: current.high});
      }
      if (current.low < previous.low && current.low < next.low) {
        extrema.push({index, type: 'minimum', value: current.low});
      }
    }
    return extrema;
  }

  const api = {simpleMovingAverage, exponentialMovingAverage, averageTrueRange, relativeStrengthIndex, normalizePeriod, normalizeLineWidth, findRelativeExtrema};
  global.AurumIndicators = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof globalThis === 'undefined' ? this : globalThis));
