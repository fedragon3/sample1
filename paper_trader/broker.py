"""
broker.py — 시뮬레이션 브로커(모의 체결 엔진)

실제 주문 전송 대신 가상 계좌에서 시장가 주문을 체결한다.
현실성을 위해 수수료(commission)와 슬리피지(slippage)를 반영한다.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from .portfolio import Portfolio


@dataclass
class SimulatedBroker:
    """모의 체결기.

    commission_rate : 거래대금 대비 수수료율 (예: 0.00015 = 0.015%)
    slippage_bps    : 체결 슬리피지 (basis point, 1bp = 0.01%).
                      매수는 불리하게 +, 매도는 불리하게 - 적용.
    """

    commission_rate: float = 0.00015
    slippage_bps: float = 5.0

    def _commission(self, notional: float) -> float:
        return abs(notional) * self.commission_rate

    def _fill_price(self, price: float, side: str) -> float:
        slip = price * (self.slippage_bps / 10_000.0)
        return price + slip if side == "BUY" else price - slip

    def buy(self, portfolio: Portfolio, symbol: str, dt: date, shares: float,
            price: float) -> bool:
        """시장가 매수. 현금 부족 시 False."""
        if shares <= 0:
            return False
        fill = self._fill_price(price, "BUY")
        notional = shares * fill
        commission = self._commission(notional)
        if portfolio.cash < notional + commission:
            return False
        portfolio.apply_buy(symbol, dt, shares, fill, commission)
        return True

    def sell(self, portfolio: Portfolio, symbol: str, dt: date, shares: float,
             price: float) -> bool:
        """시장가 매도. 보유 수량 부족 시 가능한 만큼 매도, 없으면 False."""
        pos = portfolio.position(symbol)
        shares = min(shares, pos.shares)
        if shares <= 0:
            return False
        fill = self._fill_price(price, "SELL")
        notional = shares * fill
        commission = self._commission(notional)
        portfolio.apply_sell(symbol, dt, shares, fill, commission)
        return True
