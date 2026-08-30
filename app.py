#!/usr/bin/env python3
"""Servidor web sin dependencias para visualizar XAU/USD en tiempo real."""

from __future__ import annotations

import json
import os
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).parent
STATIC_DIR = ROOT / "static"
YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/GC=F"

# Yahoo limita las consultas de 1 minuto a ventanas inferiores a ocho días. Las
# ventanas explícitas también permiten pedir el bloque anterior al arrastrar.
TIMEFRAMES = {
    "1m": ("1m", 7 * 86400, 1),
    "5m": ("5m", 5 * 86400, 1),
    "15m": ("15m", 5 * 86400, 1),
    "30m": ("30m", 30 * 86400, 1),
    "1h": ("1h", 90 * 86400, 1),
    "4h": ("1h", 90 * 86400, 4),
    "1d": ("1d", 365 * 86400, 1),
}


def aggregate(candles: list[dict], size: int) -> list[dict]:
    """Agrupa velas consecutivas; se usa para construir el timeframe de 4h."""
    if size == 1:
        return candles
    result = []
    for start in range(0, len(candles), size):
        group = candles[start : start + size]
        if not group:
            continue
        result.append(
            {
                "time": group[0]["time"],
                "open": group[0]["open"],
                "high": max(item["high"] for item in group),
                "low": min(item["low"] for item in group),
                "close": group[-1]["close"],
            }
        )
    return result


def fetch_candles(timeframe: str, before: int | None = None) -> dict:
    """Obtiene y normaliza velas de spot gold desde Yahoo Finance."""
    if timeframe not in TIMEFRAMES:
        raise ValueError("Timeframe no válido")
    interval, window, group_size = TIMEFRAMES[timeframe]
    period2 = int(time.time()) if before is None else int(before)
    if period2 <= 0:
        raise ValueError("Fecha no válida")
    params = urlencode({"interval": interval, "period1": period2 - window, "period2": period2})
    request = Request(
        f"{YAHOO_URL}?{params}",
        headers={"User-Agent": "Mozilla/5.0 XAUUSD-dashboard/1.0"},
    )
    with urlopen(request, timeout=10) as response:
        payload = json.load(response)

    chart = payload["chart"]["result"][0]
    quote = chart["indicators"]["quote"][0]
    candles = []
    for index, timestamp in enumerate(chart.get("timestamp", [])):
        values = {name: quote[name][index] for name in ("open", "high", "low", "close")}
        if any(value is None for value in values.values()):
            continue
        candles.append({"time": timestamp, **{key: round(value, 3) for key, value in values.items()}})

    candles = aggregate(candles, group_size)[-400:]
    if not candles:
        raise ValueError("El proveedor no devolvió velas")
    return {
        "symbol": "XAU/USD",
        "timeframe": timeframe,
        "candles": candles,
        "updatedAt": int(time.time()),
    }


class DashboardHandler(SimpleHTTPRequestHandler):
    """Sirve la interfaz y el pequeño proxy de mercado."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def do_GET(self) -> None:  # noqa: N802 (nombre definido por stdlib)
        parsed = urlparse(self.path)
        if parsed.path != "/api/candles":
            return super().do_GET()
        timeframe = parse_qs(parsed.query).get("timeframe", ["5m"])[0]
        try:
            before_value = parse_qs(parsed.query).get("before", [None])[0]
            before = int(before_value) if before_value is not None else None
            self.send_json(fetch_candles(timeframe, before), 200)
        except ValueError as error:
            self.send_json({"error": str(error)}, 400)
        except (HTTPError, URLError, TimeoutError, KeyError, IndexError, json.JSONDecodeError) as error:
            self.send_json({"error": f"No se pudo consultar el mercado: {error}"}, 502)

    def send_json(self, payload: dict, status: int) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), DashboardHandler)
    print(f"XAU/USD Dashboard disponible en http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
