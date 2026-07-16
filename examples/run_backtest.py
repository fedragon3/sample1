#!/usr/bin/env python3
"""
examples/run_backtest.py — 라이브러리로서 직접 사용하는 예제

여러 파라미터 조합을 훑어 최적의 SMA 조합을 찾는(간단한 파라미터 스윕) 예시.
프로젝트 루트에서 실행:  python3 examples/run_backtest.py
"""

from __future__ import annotations

import os
import sys

# 프로젝트 루트를 import 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from paper_trader import (
    Engine,
    Portfolio,
    SimulatedBroker,
    RiskManager,
    SMACrossStrategy,
    generate_synthetic,
)


def main() -> None:
    bars = generate_synthetic(symbol="DEMO", days=750, seed=7)
    print(f"합성 데이터 {len(bars)}봉 생성 "
          f"({bars[0].date_str} ~ {bars[-1].date_str})\n")

    combos = [(5, 20), (10, 40), (20, 60), (20, 120)]
    print(f"{'fast/slow':>10} | {'수익률':>9} | {'샤프':>6} | {'MDD':>8} | {'체결':>4}")
    print("-" * 50)

    for fast, slow in combos:
        engine = Engine(
            symbol="DEMO",
            bars=bars,
            strategy=SMACrossStrategy(fast=fast, slow=slow),
            portfolio=Portfolio(initial_cash=1_000_000),
            broker=SimulatedBroker(),
            risk=RiskManager(stop_loss_pct=0.08),
        )
        s = engine.run().stats
        print(f"{fast:>4}/{slow:<5} | {s['total_return']*100:>8.2f}% | "
              f"{s['sharpe']:>6.2f} | {s['max_drawdown']*100:>7.2f}% | "
              f"{int(s['num_trades']):>4}")


if __name__ == "__main__":
    main()
