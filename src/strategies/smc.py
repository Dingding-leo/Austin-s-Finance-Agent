from src.strategies.base import BaseStrategy
from configs import settings

def _swing_points(candles, n=3):
    highs = []
    lows = []
    for i in range(n, len(candles) - n):
        window = candles[i - n:i + n + 1]
        h = max(x["high"] for x in window)
        l = min(x["low"] for x in window)
        if candles[i]["high"] == h:
            highs.append(candles[i]["high"])
        if candles[i]["low"] == l:
            lows.append(candles[i]["low"])
    return highs[-3:], lows[-3:]

def _structure(highs, lows):
    if len(highs) < 2 or len(lows) < 2:
        return "Neutral"
    lh, ph = highs[-1], highs[-2]
    ll, pl = lows[-1], lows[-2]
    if lh > ph and ll > pl:
        return "Bullish"
    if lh < ph and ll < pl:
        return "Bearish"
    return "Neutral"

def _fvgs(candles):
    out = []
    for i in range(2, len(candles)):
        if candles[i]["low"] > candles[i - 2]["high"]:
            out.append({"type": "bullish", "top": float(candles[i]["low"]), "bottom": float(candles[i - 2]["high"])})
        elif candles[i]["high"] < candles[i - 2]["low"]:
            out.append({"type": "bearish", "top": float(candles[i - 2]["low"]), "bottom": float(candles[i]["high"])})
    return out[-3:]

class SMCStrategy(BaseStrategy):
    name = "SMC_Price_Action"
    description = "Smart Money Concepts strategy"
    system_prompt = (
        'You are an expert SMC trader. '
        'Use provided features: structure, swing points, and FVGs across 15m and 1h. '
        'Portfolio context is provided in "portfolio.equity" and "portfolio.cash"; use equity for sizing decisions. '
        'Rules: The order NOTIONAL after leverage (amount_usd * leverage) must be between 10% and 50% of account equity. NEVER exceed 50%; if your initial sizing would exceed, ADJUST DOWN to comply. Prefer 10–30% for normal conviction, only approach 50% on strong confirmation. Every order must include a stop_loss; take_profit is optional but preferred if you anticipate trend reversal; planned risk_reward must be >= 3; leverage must be between 20 and 50. Ensure amount_usd = equity * position_pct / leverage. '
        'Respond with valid JSON: {"action": "BUY"|"SELL"|"HOLD", "symbol": string, "position_pct": number, "amount_usd": number, "stop_loss": number, "take_profit": number|null, "leverage": number, "risk_reward": number, "entry_signal": boolean, "entry_reason": string, "news_analysis": string, "technical_conditions": string, "risk_assessment": string}. '
    )

    def _compute_features(self, market_context: dict) -> dict:
        multi = market_context.get("multi", {})
        def tf_features(tf):
            ctx = multi.get(tf, {})
            candles = ctx.get("candles", [])
            candles = [{k: (float(v) if k in ("open","high","low","close","volume") else v) for k, v in c.items()} for c in candles]
            highs, lows = _swing_points(candles)
            struct = _structure(highs, lows)
            gaps = _fvgs(candles)
            current = ctx.get("current", {})
            return {"structure": struct, "swing_highs": highs, "swing_lows": lows, "fvgs": gaps, "current": current, "candles": candles}
        return {"15m": tf_features("15m"), "1h": tf_features("1h")}

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
        f15 = feats.get("15m", {})
        current = f15.get("current", {})
        price = float(current.get("price", 0) or 0)
        rsi = float(current.get("rsi", 50) or 50)
        vol = float(current.get("volatility", 0) or 0)
        vol_pct = (vol / price) if price else 0
        structure = f15.get("structure", "Neutral")
        base_pct = 0.15
        adj = 1.0
        if structure == "Bullish":
            adj += 0.25
        elif structure == "Bearish":
            adj -= 0.5
        if rsi > 70:
            adj -= 0.3
        if rsi < 30:
            adj -= 0.2
        if vol_pct > 0.03:
            adj -= 0.5
        pct = max(0.0, min(base_pct * adj, settings.risk.get("max_position_pct", 0.2)))
        return equity * pct
