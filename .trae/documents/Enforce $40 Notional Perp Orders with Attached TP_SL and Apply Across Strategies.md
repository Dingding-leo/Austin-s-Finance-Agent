## Immediate Fixes
- Standardize sizing: Treat `amount_usd` as margin and compute notional as `amount_usd * leverage`. Always print both to avoid confusion.
- Enforce deterministic sizing: When `DESIRED_NOTIONAL_USD` is set, override LLM sizing in the agent before validation and placement with:
  - `position_pct = desired_notional_usd / equity`
  - `amount_usd = desired_notional_usd / leverage`
- Use OKX market metadata to compute minimum base qty: `min_base_qty = limits.amount.min * contractSize`. If requested notional qty < min, auto-bump to minimum only if within the 10–50% cap; otherwise reject with a clear message.

## Attach TP/SL On-Exchange
- Entry: Place a clean market order for the perp (no TP/SL in `create_order`).
- After fill: Place separate OKX algo orders for TP and SL using the raw private endpoint via ccxt:
  - Get `instId` from `exchange.market(symbol)['id']` (e.g., `ETH-USDT-SWAP`).
  - For TP: `privatePostTradeOrderAlgo` with `{instId, tdMode: 'cross', posSide, ordType: 'conditional', tpTriggerPx, tpOrdPx: '-1', tpTriggerPxType: 'last', reduceOnly: true}`.
  - For SL: same format with `slTriggerPx`, `slOrdPx: '-1'`.
- Persist algo order IDs in `open_orders.json` for later management/cancellation.

## Apply to SMC and Price Action Strategies
- Pass current `symbol`, `equity`, and holdings into strategy context.
- Allow optional `DESIRED_NOTIONAL_USD` to force fixed notional across strategies.
- Use the same deterministic sizing override and OKX algo TP/SL attachment for both SMC and Price Action decisions.

## Verification & Logging
- Print margin, leverage, notional, computed qty, and the exact OKX request parameters.
- Log entry fill (order id), TP/SL algo order ids, and any exchange errors verbatim.
- Update `trade_journal.md` with entry and exit reflections; include margin vs notional and pnl.

## Handling Rounding Differences
- Display both margin (`amount_usd`) and notional; compute qty as `(amount_usd * leverage) / price` and store it.
- If exchange rounds up to a step that changes margin slightly (fees/precision), print the final accepted qty and back-compute effective notional/margin so the record matches the exchange.

## Safety & Risk Guards
- Keep the after‑leverage 10–50% cap enforced in RiskManager.
- Keep leverage bounds enforced (20–50).
- If minimum contract size requires >50%, skip and print a clear reason.

## Configuration
- Environment flags:
  - `SYMBOL=ETH/USDT` (or BTC/USDT)
  - `DESIRED_NOTIONAL_USD=40`
  - `LIVE_TRADING=true`, `USE_PERP=true`
- Allow per‑run overrides via env without changing code.

## Rollout Plan
1. Implement deterministic sizing override in the agent (already wired; ensure it runs before validation and placement).
2. Implement `place_perp_tp_sl_algo(symbol, posSide, tpPx, slPx)` using OKX raw endpoint and integrate post‑fill.
3. Normalize logging to show margin, notional, qty, and IDs.
4. Extend the same flow to SMC and Price Action strategies.
5. Test on ETH with `$40` notional, then BTC.
6. Validate entries and auto‑exit on TP/SL triggers; confirm journal updates.

Confirm this plan and I will implement it immediately and run a live ETH perp order at exactly $40 notional with attached TP/SL, then apply the same behavior to the other strategies.