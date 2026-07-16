"""
engine.py — 백테스트 / 모의매매 실행 엔진

바(bar)를 시간순으로 전략에 흘려보내고, 신호에 따라 브로커로 주문을 체결한다.
룩어헤드 편향을 피하기 위해 신호는 '해당 봉 종가'로 체결한다(단순화).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from .broker import SimulatedBroker
from .data import Bar
from .metrics import summary
from .portfolio import Portfolio
from .risk import RiskManager
from .strategy import Signal, Strategy, StrategyContext


@dataclass
class EngineResult:
    portfolio: Portfolio
    stats: Dict[str, float]
    log: List[str] = field(default_factory=list)


class Engine:
    def __init__(
        self,
        symbol: str,
        bars: List[Bar],
        strategy: Strategy,
        portfolio: Optional[Portfolio] = None,
        broker: Optional[SimulatedBroker] = None,
        risk: Optional[RiskManager] = None,
        verbose: bool = False,
    ) -> None:
        self.symbol = symbol
        self.bars = bars
        self.strategy = strategy
        self.portfolio = portfolio or Portfolio()
        self.broker = broker or SimulatedBroker()
        self.risk = risk or RiskManager()
        self.verbose = verbose
        self.log: List[str] = []

    def _record(self, msg: str) -> None:
        self.log.append(msg)
        if self.verbose:
            print(msg)

    def run(self) -> EngineResult:
        history: List[Bar] = []
        for i, bar in enumerate(self.bars):
            history.append(bar)
            pos = self.portfolio.position(self.symbol)
            prices = {self.symbol: bar.close}

            # 1) 리스크: 손절 우선 체크
            if pos.shares > 0 and self.risk.should_stop_out(pos.avg_price, bar.close):
                qty = pos.shares
                if self.broker.sell(self.portfolio, self.symbol, bar.dt,
                                    qty, bar.close):
                    self._record(
                        f"{bar.date_str}  STOP-LOSS 매도 {qty:.0f}주 @ {bar.close:.2f}"
                    )
                self.portfolio.record_equity(bar.dt, prices)
                continue

            # 2) 전략 신호
            ctx = StrategyContext(index=i, bar=bar, history=history,
                                  position_shares=pos.shares)
            signal = self.strategy.on_bar(ctx)

            if signal == Signal.BUY and pos.shares == 0:
                shares = self.risk.size_position(self.portfolio, bar.close)
                if shares > 0 and self.broker.buy(self.portfolio, self.symbol,
                                                  bar.dt, shares, bar.close):
                    self._record(
                        f"{bar.date_str}  BUY  {shares:.0f}주 @ {bar.close:.2f}"
                    )
            elif signal == Signal.SELL and pos.shares > 0:
                qty = pos.shares
                if self.broker.sell(self.portfolio, self.symbol, bar.dt,
                                    qty, bar.close):
                    self._record(
                        f"{bar.date_str}  SELL {qty:.0f}주 @ {bar.close:.2f}"
                    )

            # 3) 자산곡선 기록
            self.portfolio.record_equity(bar.dt, prices)

        stats = summary(self.portfolio.equity_curve, self.portfolio.trades,
                        self.portfolio.initial_cash)
        return EngineResult(portfolio=self.portfolio, stats=stats, log=self.log)
