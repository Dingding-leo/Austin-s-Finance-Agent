from typing import Dict
from src.core.llm import DeepSeekClient
from src.strategies.base import BaseStrategy

class Agent:
    def __init__(self, strategy: BaseStrategy, model: str = "deepseek-chat"):
        self.strategy = strategy
        self.client = DeepSeekClient(system_prompt=strategy.system_prompt, model=model)

    def decide(self, market_context: Dict, portfolio_state: Dict, news_summary: str) -> Dict:
        user = self.strategy.build_user_content(market_context, portfolio_state, news_summary)
        decision = self.client.complete_json(user)
        action = str(decision.get("action", "HOLD")).upper()
        symbol = decision.get("symbol") or market_context.get("symbol") or "BTC/USDT"
        equity = float(portfolio_state.get("equity", 0) or 0)
        desired_notional = market_context.get("desired_notional_usd")
        pos_pct = decision.get("position_pct")
        amount = float(decision.get("amount_usd", 0))
        lev_for_calc = decision.get("leverage")
        # If caller provided desired_notional_usd, enforce sizing deterministically
        if desired_notional is not None and equity > 0:
            try:
                lev_val = float(lev_for_calc or 1)
                if lev_val <= 0:
                    lev_val = 1.0
                enforced_pos_pct = float(desired_notional) / equity
                amount = float(desired_notional) / lev_val
                decision["position_pct"] = enforced_pos_pct
                pos_pct = enforced_pos_pct
            except Exception:
                pass
        elif pos_pct is not None and equity > 0:
            try:
                lev_val = float(lev_for_calc or 1)
                if lev_val <= 0:
                    lev_val = 1.0
                amount = (equity * float(pos_pct)) / lev_val
            except Exception:
                pass
        news_analysis = decision.get("news_analysis", decision.get("reasoning", ""))
        technical_conditions = decision.get("technical_conditions", "")
        risk_assessment = decision.get("risk_assessment", "")
        stop_loss = decision.get("stop_loss")
        take_profit = decision.get("take_profit")
        leverage = decision.get("leverage")
        risk_reward = decision.get("risk_reward")
        entry_signal = decision.get("entry_signal")
        entry_reason = decision.get("entry_reason")
        try:
            computed = float(self.strategy.position_size(decision, market_context, portfolio_state))
            if computed >= 0 and pos_pct is None:
                amount = computed
        except Exception:
            pass
        return {
            "action": action,
            "symbol": symbol,
            "amount_usd": amount,
            "stop_loss": stop_loss,
            "take_profit": take_profit,
            "leverage": leverage,
            "risk_reward": risk_reward,
            "entry_signal": entry_signal,
            "entry_reason": entry_reason,
            "news_analysis": news_analysis,
            "technical_conditions": technical_conditions,
            "risk_assessment": risk_assessment
        }

    def set_strategy(self, strategy: BaseStrategy):
        self.strategy = strategy
        self.client = DeepSeekClient(system_prompt=strategy.system_prompt)
