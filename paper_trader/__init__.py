"""
paper_trader
============

토큰(API 키) 없이 동작하는 주식 모의 트레이딩(Paper Trading) 툴킷.

표준 라이브러리만으로 구현되어 별도 설치나 네트워크 없이 바로 실행됩니다.
실데이터가 필요하면 yfinance(무료, 토큰 불필요)를 선택적으로 사용할 수 있습니다.
"""

from .data import Bar, generate_synthetic, load_csv, fetch_yfinance
from .strategy import Strategy, SMACrossStrategy, Signal
from .portfolio import Portfolio
from .broker import SimulatedBroker
from .engine import Engine, EngineResult
from .risk import RiskManager
from . import indicators, metrics

__all__ = [
    "Bar",
    "generate_synthetic",
    "load_csv",
    "fetch_yfinance",
    "Strategy",
    "SMACrossStrategy",
    "Signal",
    "Portfolio",
    "SimulatedBroker",
    "Engine",
    "EngineResult",
    "RiskManager",
    "indicators",
    "metrics",
]

__version__ = "0.1.0"
