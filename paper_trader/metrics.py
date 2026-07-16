"""
metrics.py — 성과 지표 계산 (순수 파이썬)

자산곡선과 체결 내역으로부터 수익률/샤프/MDD/승률 등을 계산한다.
"""

from __future__ import annotations

import math
from datetime import date
from typing import Dict, List, Tuple

from .portfolio import Trade


def _returns(equity_curve: List[Tuple[date, float]]) -> List[float]:
    rets: List[float] = []
    for i in range(1, len(equity_curve)):
        prev = equity_curve[i - 1][1]
        cur = equity_curve[i][1]
        if prev > 0:
            rets.append(cur / prev - 1.0)
    return rets


def total_return(equity_curve: List[Tuple[date, float]]) -> float:
    if len(equity_curve) < 2 or equity_curve[0][1] == 0:
        return 0.0
    return equity_curve[-1][1] / equity_curve[0][1] - 1.0


def cagr(equity_curve: List[Tuple[date, float]]) -> float:
    if len(equity_curve) < 2 or equity_curve[0][1] <= 0:
        return 0.0
    days = (equity_curve[-1][0] - equity_curve[0][0]).days
    years = days / 365.25 if days > 0 else 0
    if years <= 0:
        return 0.0
    growth = equity_curve[-1][1] / equity_curve[0][1]
    return growth ** (1.0 / years) - 1.0


def sharpe(equity_curve: List[Tuple[date, float]], rf: float = 0.0,
           periods_per_year: int = 252) -> float:
    """연율화 샤프비율 (무위험수익률 rf 기본 0)."""
    rets = _returns(equity_curve)
    if len(rets) < 2:
        return 0.0
    mean = sum(rets) / len(rets)
    var = sum((r - mean) ** 2 for r in rets) / (len(rets) - 1)
    std = math.sqrt(var)
    if std == 0:
        return 0.0
    daily_rf = rf / periods_per_year
    return (mean - daily_rf) / std * math.sqrt(periods_per_year)


def max_drawdown(equity_curve: List[Tuple[date, float]]) -> float:
    """최대 낙폭(MDD). 음수 비율로 반환 (예: -0.23 = -23%)."""
    peak = float("-inf")
    mdd = 0.0
    for _, eq in equity_curve:
        peak = max(peak, eq)
        if peak > 0:
            dd = eq / peak - 1.0
            mdd = min(mdd, dd)
    return mdd


def win_rate(trades: List[Trade]) -> Tuple[float, int, int]:
    """매도 체결 기준 승률. (승률, 승, 패)."""
    wins = sum(1 for t in trades if t.side == "SELL" and t.realized_pnl > 0)
    losses = sum(1 for t in trades if t.side == "SELL" and t.realized_pnl <= 0)
    closed = wins + losses
    rate = wins / closed if closed else 0.0
    return rate, wins, losses


def summary(equity_curve: List[Tuple[date, float]], trades: List[Trade],
            initial_cash: float) -> Dict[str, float]:
    wr, wins, losses = win_rate(trades)
    final_eq = equity_curve[-1][1] if equity_curve else initial_cash
    return {
        "initial_equity": initial_cash,
        "final_equity": final_eq,
        "total_return": total_return(equity_curve),
        "cagr": cagr(equity_curve),
        "sharpe": sharpe(equity_curve),
        "max_drawdown": max_drawdown(equity_curve),
        "win_rate": wr,
        "wins": wins,
        "losses": losses,
        "num_trades": len(trades),
    }
