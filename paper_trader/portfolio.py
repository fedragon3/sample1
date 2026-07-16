"""
portfolio.py — 가상 계좌(포트폴리오)

현금, 보유 포지션, 실현/미실현 손익, 자산곡선(equity curve)을 관리한다.
단일 종목 기준으로 단순화되어 있으나 여러 종목으로 확장 가능한 구조.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Dict, List, Optional, Tuple


@dataclass
class Position:
    shares: float = 0.0
    avg_price: float = 0.0  # 평균 매입 단가

    @property
    def is_open(self) -> bool:
        return self.shares != 0


@dataclass
class Trade:
    dt: date
    side: str  # "BUY" | "SELL"
    shares: float
    price: float
    commission: float
    realized_pnl: float = 0.0  # 매도 시 실현 손익


@dataclass
class Portfolio:
    initial_cash: float = 1_000_000.0
    cash: float = field(init=False)
    positions: Dict[str, Position] = field(default_factory=dict)
    trades: List[Trade] = field(default_factory=list)
    equity_curve: List[Tuple[date, float]] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.cash = self.initial_cash

    def position(self, symbol: str) -> Position:
        return self.positions.setdefault(symbol, Position())

    def apply_buy(self, symbol: str, dt: date, shares: float, price: float,
                  commission: float) -> None:
        pos = self.position(symbol)
        cost = shares * price + commission
        self.cash -= cost
        # 평균 단가 갱신
        total_shares = pos.shares + shares
        if total_shares > 0:
            pos.avg_price = (pos.avg_price * pos.shares + price * shares) / total_shares
        pos.shares = total_shares
        self.trades.append(Trade(dt, "BUY", shares, price, commission))

    def apply_sell(self, symbol: str, dt: date, shares: float, price: float,
                   commission: float) -> None:
        pos = self.position(symbol)
        proceeds = shares * price - commission
        self.cash += proceeds
        realized = (price - pos.avg_price) * shares - commission
        pos.shares -= shares
        if pos.shares <= 1e-9:
            pos.shares = 0.0
            pos.avg_price = 0.0
        self.trades.append(Trade(dt, "SELL", shares, price, commission, realized))

    def market_value(self, prices: Dict[str, float]) -> float:
        """보유 포지션의 현재 평가금액."""
        total = 0.0
        for sym, pos in self.positions.items():
            if pos.shares:
                total += pos.shares * prices.get(sym, pos.avg_price)
        return total

    def equity(self, prices: Dict[str, float]) -> float:
        """총 자산 = 현금 + 평가금액."""
        return self.cash + self.market_value(prices)

    def record_equity(self, dt: date, prices: Dict[str, float]) -> None:
        self.equity_curve.append((dt, self.equity(prices)))
