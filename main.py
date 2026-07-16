#!/usr/bin/env python3
"""
main.py — 모의 트레이딩 CLI

토큰 없이 바로 실행 가능:
    python3 main.py                         # 합성 데이터로 SMA 교차 백테스트
    python3 main.py --fast 10 --slow 40     # 파라미터 변경
    python3 main.py --source csv --csv data.csv
    python3 main.py --source yfinance --symbol AAPL --period 2y   # (yfinance 설치 시)
    python3 main.py --verbose               # 체결 로그 출력
"""

from __future__ import annotations

import argparse
import sys

from paper_trader import (
    Engine,
    Portfolio,
    SimulatedBroker,
    RiskManager,
    SMACrossStrategy,
    data as data_mod,
    metrics,
)


def parse_args(argv=None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="토큰 없이 동작하는 주식 모의 트레이딩 툴")
    p.add_argument("--source", choices=["synthetic", "csv", "yfinance"],
                   default="synthetic", help="데이터 소스 (기본: synthetic)")
    p.add_argument("--symbol", default="SYNTH", help="종목 심볼")
    p.add_argument("--csv", help="--source csv 일 때 CSV 경로")
    p.add_argument("--period", default="1y", help="yfinance 조회 기간 (예: 1y, 2y)")
    p.add_argument("--days", type=int, default=500, help="합성 데이터 일수")
    p.add_argument("--seed", type=int, default=42, help="합성 데이터 시드")

    p.add_argument("--fast", type=int, default=20, help="단기 이동평균 기간")
    p.add_argument("--slow", type=int, default=60, help="장기 이동평균 기간")

    p.add_argument("--cash", type=float, default=1_000_000.0, help="초기 자본금")
    p.add_argument("--commission", type=float, default=0.00015, help="수수료율")
    p.add_argument("--slippage-bps", type=float, default=5.0, help="슬리피지(bp)")
    p.add_argument("--max-position-pct", type=float, default=0.95,
                   help="종목당 최대 투자 비중")
    p.add_argument("--stop-loss-pct", type=float, default=0.08,
                   help="손절 비율 (0 이면 미사용)")

    p.add_argument("--verbose", action="store_true", help="체결 로그 출력")
    return p.parse_args(argv)


def load_bars(args: argparse.Namespace):
    if args.source == "synthetic":
        return data_mod.generate_synthetic(
            symbol=args.symbol, days=args.days, seed=args.seed
        )
    if args.source == "csv":
        if not args.csv:
            sys.exit("오류: --source csv 는 --csv <경로> 가 필요합니다.")
        return data_mod.load_csv(args.csv)
    if args.source == "yfinance":
        return data_mod.fetch_yfinance(args.symbol, period=args.period)
    raise ValueError(args.source)


def fmt_pct(x: float) -> str:
    return f"{x * 100:+.2f}%"


def print_report(args, stats, num_bars) -> None:
    line = "=" * 52
    print(line)
    print(f" 모의 트레이딩 결과  ({args.source} / {args.symbol})")
    print(line)
    print(f" 전략              : SMA {args.fast}/{args.slow} 교차")
    print(f" 데이터            : {num_bars} 봉")
    print(f" 초기 자본         : {stats['initial_equity']:,.0f}")
    print(f" 최종 자산         : {stats['final_equity']:,.0f}")
    print(f" 총 수익률         : {fmt_pct(stats['total_return'])}")
    print(f" 연복리(CAGR)      : {fmt_pct(stats['cagr'])}")
    print(f" 샤프비율          : {stats['sharpe']:.2f}")
    print(f" 최대낙폭(MDD)     : {fmt_pct(stats['max_drawdown'])}")
    print(f" 승률              : {fmt_pct(stats['win_rate'])} "
          f"({stats['wins']}승 {stats['losses']}패)")
    print(f" 총 체결 수        : {int(stats['num_trades'])}")
    print(line)


def main(argv=None) -> int:
    args = parse_args(argv)
    bars = load_bars(args)
    if len(bars) < args.slow + 2:
        sys.exit(f"오류: 데이터가 너무 적습니다({len(bars)}봉). "
                 f"slow({args.slow})보다 충분히 길어야 합니다.")

    engine = Engine(
        symbol=args.symbol,
        bars=bars,
        strategy=SMACrossStrategy(fast=args.fast, slow=args.slow),
        portfolio=Portfolio(initial_cash=args.cash),
        broker=SimulatedBroker(commission_rate=args.commission,
                               slippage_bps=args.slippage_bps),
        risk=RiskManager(
            max_position_pct=args.max_position_pct,
            stop_loss_pct=(args.stop_loss_pct if args.stop_loss_pct > 0 else None),
        ),
        verbose=args.verbose,
    )
    result = engine.run()
    print_report(args, result.stats, len(bars))

    # 매수 후 보유(Buy & Hold) 대비 비교
    bh = bars[-1].close / bars[0].close - 1.0
    print(f" 참고) 단순 보유(Buy&Hold) 수익률: {fmt_pct(bh)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
