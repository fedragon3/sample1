"""
indicators.py — 기술적 지표 (순수 파이썬)

pandas/numpy 없이도 동작하도록 표준 라이브러리만 사용한다.
모든 함수는 입력 길이와 동일한 길이의 리스트를 반환하며,
값이 아직 정의되지 않는 앞부분은 None 으로 채운다.
"""

from __future__ import annotations

from typing import List, Optional


def sma(values: List[float], period: int) -> List[Optional[float]]:
    """단순 이동평균(Simple Moving Average)."""
    out: List[Optional[float]] = [None] * len(values)
    if period <= 0:
        return out
    running = 0.0
    for i, v in enumerate(values):
        running += v
        if i >= period:
            running -= values[i - period]
        if i >= period - 1:
            out[i] = running / period
    return out


def ema(values: List[float], period: int) -> List[Optional[float]]:
    """지수 이동평균(Exponential Moving Average)."""
    out: List[Optional[float]] = [None] * len(values)
    if period <= 0 or not values:
        return out
    k = 2.0 / (period + 1.0)
    prev: Optional[float] = None
    for i, v in enumerate(values):
        if i < period - 1:
            continue
        if prev is None:
            # 시드: 첫 period 구간의 단순평균
            prev = sum(values[i - period + 1 : i + 1]) / period
        else:
            prev = v * k + prev * (1 - k)
        out[i] = prev
    return out


def rsi(values: List[float], period: int = 14) -> List[Optional[float]]:
    """상대강도지수(Relative Strength Index), Wilder 방식."""
    out: List[Optional[float]] = [None] * len(values)
    if len(values) <= period:
        return out

    gains = 0.0
    losses = 0.0
    for i in range(1, period + 1):
        change = values[i] - values[i - 1]
        if change >= 0:
            gains += change
        else:
            losses -= change
    avg_gain = gains / period
    avg_loss = losses / period
    out[period] = _rsi_from(avg_gain, avg_loss)

    for i in range(period + 1, len(values)):
        change = values[i] - values[i - 1]
        gain = max(change, 0.0)
        loss = max(-change, 0.0)
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        out[i] = _rsi_from(avg_gain, avg_loss)
    return out


def _rsi_from(avg_gain: float, avg_loss: float) -> float:
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100.0 - (100.0 / (1.0 + rs))
