## Overview
Build a Python-based, modular trading system where a single LLM agent (DeepSeek) trades crypto via OKX, using multi-timeframe market data and live news research. Strategies are fully pluggable via prompts and can be added without impacting existing ones. Start with a safe simulator, then enable live trading behind strict guardrails.

## Tech Stack
- Runtime: Python 3.10+
- LLM: DeepSeek (OpenAI-compatible API)
- Exchange: OKX via `ccxt` (REST/WebSocket)
- Research: `duckduckgo-search` (upgrade path: Tavily/SerpApi)
- Data/Indicators: `pandas`, optional `ta` for technicals
- Config/Secrets: `.env`, `python-dotenv`
- Logging/Storage: JSON logs (upgrade: SQLite)

## Project Structure
- `src/core/` LLM client, agent orchestrator, context builder
- `src/data/` OKX client, multi-timeframe aggregator, news engine
- `src/strategies/` base class, registry of prompt-driven strategies
- `src/execution/` simulator wallet, OKX live adapter, risk manager
- `configs/` settings (symbols, timeframes, risk limits)
- `logs/` trades, decisions, reasoning traces
- `main.py` CLI entrypoint

## Core Components
### Agent & Prompt System
- Single Agent class wrapping DeepSeek with JSON-only outputs
- Strategy Registry Pattern: each strategy is a class/config with `name`, `description`, `system_prompt`
- Context Builder merges: portfolio state, multi-timeframe signals, and summarized news
- Hot-swap strategies at runtime; version and log all prompts used

### Market Data (OKX)
- OKX client with `ccxt` for candles and tickers
- Multi-timeframe aggregator (15m, 1h, 4h) with indicators: SMA/EMA, RSI, MACD, ATR
- Trend state per timeframe: up/down/sideways + momentum/volatility descriptors
- WebSocket readiness for real-time updates (phase 2)

### News & Research
- News Engine using `duckduckgo-search` for latest crypto headlines
- Deduplication, recency filter, and basic sentiment tagging (bullish/bearish/neutral)
- Optional DeepSeek summarization of headlines into compact, token-efficient context
- Source whitelist support (CoinDesk, Bloomberg, Reuters, OKX blog, etc.)

### Risk Manager & Execution
- Risk guardrails: max position size (% of equity), max daily drawdown, cooldown after loss, min cash buffer
- Order Validator: validate LLM JSON decisions; reject unsafe/invalid orders
- Execution adapters:
  - Simulator: paper wallet, deterministic fills
  - OKX Live Adapter: authenticated trading via `ccxt` (enable only after tests)
- Kill-switch and dry-run mode; all live trading behind an explicit flag

### State & Logging
- Portfolio state: balances, positions, PnL, equity curve
- Decision logs: market snapshot, news summary, strategy ID, model output JSON, final executed order
- Reasoning trace storage for later analysis and audits

## Configuration & Secrets
- `.env`: `DEEPSEEK_API_KEY`, `OKX_API_KEY`, `OKX_SECRET`, `OKX_PASSPHRASE`
- `configs/settings.py` (or YAML): symbols, timeframes, risk limits, news sources, simulation/live toggle
- Strict separation of config from code; never log secrets

## Implementation Phases
### Phase 1 — Foundations (Simulator-Only)
- Scaffold project directories and files
- Implement Strategy base + registry with two example prompts (Conservative, Aggressive)
- Build DeepSeek client enforcing JSON schema responses
- Implement OKX data fetch (public OHLCV) + aggregator for 15m/1h/4h
- Add News Engine with headline fetch + basic sentiment
- Create Simulator wallet and Risk Manager with guardrails
- `main.py` CLI loop: select strategy → build context (market + news) → LLM decision → validate → simulate trade → log

### Phase 2 — Verification & Backtesting
- Unit tests: aggregator outputs, validator behavior, JSON parsing robustness
- Backtest module: run strategies over historical OHLCV, log PnL and Sharpe
- Stress tests: malformed LLM outputs, network failures, high-vol regimes

### Phase 3 — Live OKX Integration (Safe Launch)
- Implement OKX Live Adapter (ccxt authenticated)
- Add dry-run toggle and explicit confirmation before enabling live trading
- Start with read-only account fetch; then place tiny, capped test orders
- Monitor rate limits, error handling, and reconciliation against OKX account

### Phase 4 — Observability & UX
- Enrich logs with equity curve and per-trade metrics
- Optional lightweight web dashboard (Flask/FastAPI) showing positions, PnL, decisions, and logs
- Prompt versioning and strategy A/B toggles

## Safety & Compliance
- Hard risk guardrails enforced in code (cannot be overridden by LLM)
- Kill-switch and daily stop-loss (system halts after threshold breach)
- Dry-run default; explicit toggle required for live trading
- Comprehensive logging for audit and post-mortem

## Acceptance Criteria
- Strategies can be added/modified without affecting existing ones
- Agent consumes multi-timeframe signals + news, outputs valid JSON decisions
- Risk Manager blocks unsafe actions; simulator reflects trades accurately
- Backtests run and produce metrics; live trading only activates behind a flag

## Next Steps on Approval
- Scaffold project structure and stub modules
- Implement Phase 1 components end-to-end
- Deliver a runnable simulator with two strategies and decision logs
- Share instructions to set `.env` and run
