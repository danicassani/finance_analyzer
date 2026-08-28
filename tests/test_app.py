import unittest

from app import TIMEFRAMES, aggregate


class CandleAggregationTests(unittest.TestCase):
    def test_aggregate_builds_ohlc_candle(self):
        source = [
            {"time": 1, "open": 10, "high": 13, "low": 9, "close": 12},
            {"time": 2, "open": 12, "high": 15, "low": 11, "close": 14},
        ]
        self.assertEqual(aggregate(source, 2), [{"time": 1, "open": 10, "high": 15, "low": 9, "close": 14}])

    def test_all_exposed_timeframes_are_configured(self):
        self.assertEqual(set(TIMEFRAMES), {"1m", "5m", "15m", "30m", "1h", "4h", "1d"})


if __name__ == "__main__":
    unittest.main()
