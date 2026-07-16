"""
tests/test_basic.py — 핵심 로직 회귀 테스트 (표준 unittest)

실행:  python3 -m unittest discover -s tests -v
"""

import os
import sys
import unittest
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from paper_trader import (
    Engine,
    Portfolio,
    SimulatedBroker,
    RiskManager,
    SMACrossStrategy,
    generate_synthetic,
    indicators,
    metrics,
)


class TestIndicators(unittest.TestCase):
    def test_sma(self):
        vals = [1, 2, 3, 4, 5]
        out = indicators.sma(vals, 3)
        self.assertEqual(out[:2], [None, None])
        self.assertAlmostEqual(out[2], 2.0)
        self.assertAlmostEqual(out[4], 4.0)

    def test_rsi_bounds(self):
        vals = [i for i in range(1, 60)]  # 지속 상승 → RSI 100 근접
        out = indicators.rsi(vals, 14)
        self.assertTrue(90 <= out[-1] <= 100)


class TestPortfolio(unittest.TestCase):
    def test_buy_sell_accounting(self):
        pf = Portfolio(initial_cash=100_000)
        broker = SimulatedBroker(commission_rate=0.0, slippage_bps=0.0)
        d = date(2024, 1, 1)

        self.assertTrue(broker.buy(pf, "X", d, 100, 50.0))  # 5,000 매수
        self.assertAlmostEqual(pf.cash, 95_000.0)
        self.assertEqual(pf.position("X").shares, 100)

        self.assertTrue(broker.sell(pf, "X", d, 100, 60.0))  # 6,000 매도
        self.assertAlmostEqual(pf.cash, 101_000.0)
        self.assertEqual(pf.position("X").shares, 0)
        self.assertAlmostEqual(pf.trades[-1].realized_pnl, 1000.0)

    def test_insufficient_cash(self):
        pf = Portfolio(initial_cash=100)
        broker = SimulatedBroker(commission_rate=0.0, slippage_bps=0.0)
        self.assertFalse(broker.buy(pf, "X", date(2024, 1, 1), 100, 50.0))


class TestEngine(unittest.TestCase):
    def test_run_is_deterministic_and_consistent(self):
        bars = generate_synthetic(days=400, seed=1)
        engine = Engine(
            symbol="SYNTH",
            bars=bars,
            strategy=SMACrossStrategy(fast=10, slow=30),
            portfolio=Portfolio(initial_cash=1_000_000),
            broker=SimulatedBroker(),
            risk=RiskManager(),
        )
        result = engine.run()
        # 자산곡선 길이 = 봉 개수
        self.assertEqual(len(result.portfolio.equity_curve), len(bars))
        # 통계 키 존재
        for key in ("total_return", "sharpe", "max_drawdown", "num_trades"):
            self.assertIn(key, result.stats)
        # 최종 자산은 양수
        self.assertGreater(result.stats["final_equity"], 0)

    def test_no_negative_cash(self):
        bars = generate_synthetic(days=500, seed=3)
        engine = Engine("SYNTH", bars, SMACrossStrategy(20, 60),
                        Portfolio(initial_cash=500_000))
        result = engine.run()
        self.assertGreaterEqual(result.portfolio.cash, -1e-6)


class TestMetrics(unittest.TestCase):
    def test_max_drawdown(self):
        curve = [(date(2024, 1, i + 1), v) for i, v in enumerate([100, 120, 90, 110])]
        mdd = metrics.max_drawdown(curve)
        self.assertAlmostEqual(mdd, 90 / 120 - 1.0)  # -25%


if __name__ == "__main__":
    unittest.main()
