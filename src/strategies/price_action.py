from src.strategies.base import BaseStrategy
from configs import settings

def _range_levels(candles, n=20):
    window = candles[-n:] if len(candles) >= n else candles
    hi = max(x["high"] for x in window) if window else 0.0
    lo = min(x["low"] for x in window) if window else 0.0
    return hi, lo

class PriceActionStrategy(BaseStrategy):
    name = "Price_Action"
    description = "Price action breakout strategy"
    system_prompt = (
        'You are a price action trader. '
        'Use recent range levels, breakout state, and trend to decide. '
        'Portfolio context is provided in "portfolio.equity" and "portfolio.cash"; use equity for sizing decisions. '
        'Rules: The order NOTIONAL after leverage (amount_usd * leverage) must be between 10% and 50% of account equity. NEVER exceed 50%; if your initial sizing would exceed, ADJUST DOWN to comply. Prefer 10–30% for normal conviction, only approach 50% on strong confirmation. Every order must include a stop_loss; take_profit is optional but preferred if you anticipate trend reversal; planned risk_reward must be >= 3; leverage must be between 20 and 50. Ensure amount_usd = equity * position_pct / leverage. '
        'Respond with valid JSON: {"action": "BUY"|"SELL"|"HOLD", "symbol": string, "position_pct": number, "amount_usd": number, "stop_loss": number, "take_profit": number|null, "leverage": number, "risk_reward": number, "entry_signal": boolean, "entry_reason": string, "news_analysis": string, "technical_conditions": string, "risk_assessment": string}. '
    )

    def _compute_features(self, market_context: dict) -> dict:
        multi = market_context.get("multi", {})
        ctx15 = multi.get("15m", {})
        candles = ctx15.get("candles", [])
        candles = [{k: (float(v) if k in ("open","high","low","close","volume") else v) for k, v in c.items()} for c in candles]
        rh, rl = _range_levels(candles)
        last_close = candles[-1]["close"] if candles else 0.0
        breakout_up = last_close > rh if candles else False
        breakout_down = last_close < rl if candles else False
        trend = multi.get("1h", {}).get("current", {}).get("trend", "down")
        return {
            "range_high": rh,
            "range_low": rl,
            "last_close": last_close,
            "breakout_up": breakout_up,
            "breakout_down": breakout_down,
            "trend": trend,
            "candles": candles
        }

    def build_user_content(self, market_context: dict, portfolio_state: dict, news_summary: str) -> str:
        features = self._compute_features(market_context)
        payload = {
            "market": {"features": features, "price": market_context.get("price")},
            "portfolio": portfolio_state,
            "news": news_summary
        }
        return str(payload)

    def inspect_features(self, market_context: dict) -> dict:
        return self._compute_features(market_context)

    def position_size(self, decision: dict, market_context: dict, portfolio_state: dict) -> float:
        equity = float(portfolio_state.get("equity", 0))
        feats = self._compute_features(market_context)
        last_close = float(feats.get("last_close", 0) or 0)
        rh = float(feats.get("range_high", 0) or 0)
        rl = float(feats.get("range_low", 0) or 0)
        breakout_up = bool(feats.get("breakout_up", False))
        breakout_down = bool(feats.get("breakout_down", False))
        trend = str(feats.get("trend", "down"))
        # Pull RSI/vol from 1h current if available
        multi = market_context.get("multi", {})
        c1h = multi.get("1h", {}).get("current", {})
        rsi = float(c1h.get("rsi", 50) or 50)
        vol = float(c1h.get("volatility", 0) or 0)
        price = float(c1h.get("price", last_close) or 0)
        vol_pct = (vol / price) if price else 0
        base_pct = 0.12
        adj = 1.0
        if breakout_up and trend == "up":
            adj += 0.5
        if breakout_down and trend == "down":
            adj += 0.5
        if not breakout_up and not breakout_down:
            adj -= 0.3
        if rsi > 70:
            adj -= 0.3
        if rsi < 30:
            adj -= 0.2
        if vol_pct > 0.03:
            adj -= 0.5
        pct = max(0.0, min(base_pct * adj, settings.risk.get("max_position_pct", 0.2)))
        return equity * pct
