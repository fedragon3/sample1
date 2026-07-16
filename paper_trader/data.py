"""
data.py — 시세 데이터 공급(Data Feed)

세 가지 소스를 지원합니다.
  1) generate_synthetic : 랜덤워크 기반 합성 데이터 (네트워크/토큰 불필요, 항상 동작)
  2) load_csv           : 로컬 CSV 파일 로드
  3) fetch_yfinance     : yfinance 로 실데이터 조회 (선택, 토큰 불필요)
"""

from __future__ import annotations

import csv
import math
import random
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import List, Optional


@dataclass(frozen=True)
class Bar:
    """하나의 캔들(OHLCV)."""

    dt: date
    open: float
    high: float
    low: float
    close: float
    volume: int

    @property
    def date_str(self) -> str:
        return self.dt.isoformat()


def generate_synthetic(
    symbol: str = "SYNTH",
    days: int = 365,
    start_price: float = 100.0,
    annual_drift: float = 0.08,
    annual_vol: float = 0.25,
    seed: Optional[int] = 42,
    start_date: Optional[date] = None,
) -> List[Bar]:
    """기하 브라운 운동(GBM) 기반 합성 일봉 데이터를 생성한다.

    실데이터가 없어도 전략/엔진을 검증할 수 있게 해주는 기본 데이터 소스.
    seed 를 고정하면 재현 가능한 결과를 얻는다.
    """
    rng = random.Random(seed)
    if start_date is None:
        start_date = date.today() - timedelta(days=days)

    dt_step = 1.0 / 252.0  # 연간 거래일 ~252일
    mu = annual_drift
    sigma = annual_vol

    bars: List[Bar] = []
    price = start_price
    d = start_date
    generated = 0
    while generated < days:
        # 주말 제외(대략적인 거래일 근사)
        if d.weekday() >= 5:
            d += timedelta(days=1)
            continue

        z = rng.gauss(0.0, 1.0)
        # GBM: S_{t+1} = S_t * exp((mu - 0.5*sigma^2)*dt + sigma*sqrt(dt)*z)
        ret = (mu - 0.5 * sigma * sigma) * dt_step + sigma * math.sqrt(dt_step) * z
        new_price = max(0.01, price * math.exp(ret))

        o = price
        c = new_price
        hi = max(o, c) * (1.0 + abs(rng.gauss(0, 0.003)))
        lo = min(o, c) * (1.0 - abs(rng.gauss(0, 0.003)))
        vol = int(abs(rng.gauss(1_000_000, 300_000)))

        bars.append(Bar(dt=d, open=round(o, 2), high=round(hi, 2),
                        low=round(lo, 2), close=round(c, 2), volume=vol))
        price = new_price
        d += timedelta(days=1)
        generated += 1

    return bars


def load_csv(path: str) -> List[Bar]:
    """CSV 파일에서 일봉 데이터를 로드한다.

    기대 컬럼(대소문자 무시): date, open, high, low, close, volume
    date 형식: YYYY-MM-DD
    """
    bars: List[Bar] = []
    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        # 컬럼명을 소문자로 정규화
        for row in reader:
            r = {k.strip().lower(): v for k, v in row.items()}
            bars.append(
                Bar(
                    dt=datetime.strptime(r["date"][:10], "%Y-%m-%d").date(),
                    open=float(r["open"]),
                    high=float(r["high"]),
                    low=float(r["low"]),
                    close=float(r["close"]),
                    volume=int(float(r.get("volume", 0) or 0)),
                )
            )
    bars.sort(key=lambda b: b.dt)
    return bars


def fetch_yfinance(symbol: str, period: str = "1y", interval: str = "1d") -> List[Bar]:
    """yfinance 로 실데이터를 조회한다 (선택 기능, 토큰 불필요).

    yfinance 미설치 시 안내 메시지와 함께 예외를 발생시킨다.
    """
    try:
        import yfinance as yf  # type: ignore
    except ImportError as e:
        raise ImportError(
            "yfinance 가 설치되어 있지 않습니다. `pip install yfinance` 후 사용하세요. "
            "(합성 데이터 소스는 설치 없이 바로 사용 가능합니다.)"
        ) from e

    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period, interval=interval)
    bars: List[Bar] = []
    for idx, row in df.iterrows():
        bars.append(
            Bar(
                dt=idx.date(),
                open=float(row["Open"]),
                high=float(row["High"]),
                low=float(row["Low"]),
                close=float(row["Close"]),
                volume=int(row["Volume"]),
            )
        )
    return bars


def save_csv(bars: List[Bar], path: str) -> None:
    """Bar 리스트를 CSV 로 저장한다(재현/공유용)."""
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["date", "open", "high", "low", "close", "volume"])
        for b in bars:
            writer.writerow([b.date_str, b.open, b.high, b.low, b.close, b.volume])
