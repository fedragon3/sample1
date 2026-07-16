# paper_trader — 토큰 없이 동작하는 주식 모의 트레이딩 툴

API 키(토큰) · 별도 설치 · 네트워크 **없이** 바로 실행되는 주식 알고리즘
모의 트레이딩(Paper Trading) 툴킷입니다. 파이썬 **표준 라이브러리만**으로
구현되어 있어 `python3 main.py` 한 줄로 백테스트가 돌아갑니다.

실데이터가 필요하면 무료·무토큰인 `yfinance`를 선택적으로 붙일 수 있습니다.

## 빠른 시작

```bash
# 합성 데이터로 SMA 20/60 교차 전략 백테스트 (설치 불필요)
python3 main.py

# 파라미터 변경 + 체결 로그 출력
python3 main.py --fast 10 --slow 40 --verbose

# 파라미터 스윕 예제
python3 examples/run_backtest.py

# 테스트
python3 -m unittest discover -s tests -v
```

### 실데이터 사용 (선택)

```bash
pip install yfinance          # 토큰 불필요
python3 main.py --source yfinance --symbol AAPL --period 2y
```

### CSV 사용

`date,open,high,low,close,volume` 컬럼을 가진 CSV를 넣으면 됩니다.

```bash
python3 main.py --source csv --csv mydata.csv
```

## 구조

```
paper_trader/
├── data.py         # 데이터 공급: 합성 / CSV / yfinance(선택)
├── indicators.py   # 기술적 지표 (SMA, EMA, RSI) — 순수 파이썬
├── strategy.py     # 전략 베이스 + SMA 교차 전략
├── portfolio.py    # 가상 계좌: 현금·포지션·손익·자산곡선
├── broker.py       # 모의 체결기: 수수료·슬리피지 반영
├── risk.py         # 리스크 관리: 포지션 사이징·손절
├── metrics.py      # 성과 지표: 수익률·CAGR·샤프·MDD·승률
└── engine.py       # 백테스트/모의매매 실행 루프
main.py             # CLI 진입점
examples/           # 사용 예제
tests/              # 단위 테스트
```

## 나만의 전략 추가하기

`Strategy`를 상속해 `on_bar()`에서 신호만 반환하면 엔진이 나머지(체결·리스크·
기록)를 처리합니다.

```python
from paper_trader.strategy import Strategy, Signal
from paper_trader import indicators

class RSIStrategy(Strategy):
    name = "RSI"
    def warmup(self):
        return 15
    def on_bar(self, ctx):
        closes = [b.close for b in ctx.history]
        r = indicators.rsi(closes, 14)[-1]
        if r is None:
            return Signal.HOLD
        if r < 30 and ctx.position_shares == 0:
            return Signal.BUY
        if r > 70 and ctx.position_shares > 0:
            return Signal.SELL
        return Signal.HOLD
```

## 로드맵 (다음 단계)

- [ ] 다중 종목 포트폴리오 백테스트
- [ ] EMA/RSI/볼린저밴드 기반 전략 추가
- [ ] 자산곡선 시각화 (matplotlib, 선택 의존성)
- [ ] 실시간 모의매매 루프 (yfinance 폴링 + 스케줄러)
- [ ] 거래 로그 CSV/DB 저장

## ⚠️ 면책

교육·연구용 모의 트레이딩 툴입니다. 실거래 투자 판단의 근거로 사용하지
마세요. 백테스트 성과가 미래 수익을 보장하지 않습니다.
