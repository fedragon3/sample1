"""
risk.py — 리스크 관리

포지션 사이징과 손절(stop-loss)을 담당한다.
간단하지만 실거래 전 반드시 있어야 하는 안전장치.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .portfolio import Portfolio


@dataclass
class RiskManager:
    """리스크 규칙.

    max_position_pct : 총자산 대비 한 종목 최대 투자 비중 (예: 0.95 = 95%)
    stop_loss_pct    : 평균단가 대비 손절 비율 (예: 0.08 = -8%). None 이면 미사용.
    """

    max_position_pct: float = 0.95
    stop_loss_pct: Optional[float] = 0.08

    def size_position(self, portfolio: Portfolio, price: float) -> float:
        """이번 매수에 투입할 수량을 계산한다(정수 주).

        총자산의 max_position_pct 만큼을 목표로, 보유 현금 한도 내에서 매수.
        """
        equity = portfolio.cash + sum(
            p.shares * price for p in portfolio.positions.values() if p.shares
        )
        budget = min(portfolio.cash, equity * self.max_position_pct)
        if price <= 0:
            return 0.0
        shares = int(budget // price)
        return float(max(shares, 0))

    def should_stop_out(self, avg_price: float, current_price: float) -> bool:
        """손절 조건 도달 여부."""
        if self.stop_loss_pct is None or avg_price <= 0:
            return False
        return current_price <= avg_price * (1.0 - self.stop_loss_pct)
