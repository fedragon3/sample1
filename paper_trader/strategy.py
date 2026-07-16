"""
strategy.py — 매매 전략

Strategy 를 상속해 on_bar() 에서 Signal(BUY/SELL/HOLD)을 반환하면 된다.
기본 제공: SMACrossStrategy (단기/장기 이동평균 골든/데드 크로스).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional

from .data import Bar
from . import indicators


class Signal(Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


@dataclass
class StrategyContext:
    """전략에 전달되는 현재 시점의 정보."""

    index: int
    bar: Bar
    history: List[Bar]  # 현재 바까지의 전체 히스토리(현재 바 포함)
    position_shares: float  # 현재 보유 수량 (0 이면 미보유)


class Strategy:
    """모든 전략의 베이스 클래스."""

    name: str = "base"

    def on_bar(self, ctx: StrategyContext) -> Signal:  # pragma: no cover - 추상
        raise NotImplementedError

    def warmup(self) -> int:
        """전략이 신호를 내기 위해 필요한 최소 봉 개수."""
        return 0


@dataclass
class SMACrossStrategy(Strategy):
    """이동평균 교차 전략.

    - 단기선이 장기선을 상향 돌파(골든크로스) → BUY
    - 단기선이 장기선을 하향 돌파(데드크로스) → SELL
    """

    fast: int = 20
    slow: int = 60
    name: str = field(default="SMA_Cross", init=False)

    def warmup(self) -> int:
        return self.slow + 1

    def on_bar(self, ctx: StrategyContext) -> Signal:
        closes = [b.close for b in ctx.history]
        if len(closes) < self.slow + 1:
            return Signal.HOLD

        fast_sma = indicators.sma(closes, self.fast)
        slow_sma = indicators.sma(closes, self.slow)

        f_now, f_prev = fast_sma[-1], fast_sma[-2]
        s_now, s_prev = slow_sma[-1], slow_sma[-2]
        if None in (f_now, f_prev, s_now, s_prev):
            return Signal.HOLD

        crossed_up = f_prev <= s_prev and f_now > s_now
        crossed_down = f_prev >= s_prev and f_now < s_now

        if crossed_up and ctx.position_shares == 0:
            return Signal.BUY
        if crossed_down and ctx.position_shares > 0:
            return Signal.SELL
        return Signal.HOLD
