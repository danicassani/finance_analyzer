import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from app import TIMEFRAMES, aggregate, fetch_candles


class CandleAggregationTests(unittest.TestCase):
    def test_aggregate_builds_ohlc_candle(self):
        source = [
            {"time": 1, "open": 10, "high": 13, "low": 9, "close": 12},
            {"time": 2, "open": 12, "high": 15, "low": 11, "close": 14},
        ]
        self.assertEqual(aggregate(source, 2), [{"time": 1, "open": 10, "high": 15, "low": 9, "close": 14}])

    def test_all_exposed_timeframes_are_configured(self):
        self.assertEqual(set(TIMEFRAMES), {"1m", "5m", "15m", "30m", "1h", "4h", "1d"})

    @patch("app.urlopen")
    def test_one_minute_request_uses_safe_seven_day_window(self, urlopen):
        response = urlopen.return_value.__enter__.return_value
        response.read.return_value = (
            b'{"chart":{"result":[{"timestamp":[99],"indicators":{"quote":['
            b'{"open":[1],"high":[2],"low":[0.5],"close":[1.5]}]}}]}}'
        )

        result = fetch_candles("1m", before=1_000_000)

        query = parse_qs(urlparse(urlopen.call_args.args[0].full_url).query)
        self.assertEqual(query["interval"], ["1m"])
        self.assertEqual(int(query["period2"][0]) - int(query["period1"][0]), 7 * 86400)
        self.assertEqual(result["candles"][0]["close"], 1.5)

    def test_rejects_invalid_history_date(self):
        with self.assertRaisesRegex(ValueError, "Fecha no válida"):
            fetch_candles("1m", before=-1)
        with self.assertRaisesRegex(ValueError, "Fecha no válida"):
            fetch_candles("1m", before=0)


if __name__ == "__main__":
    unittest.main()
