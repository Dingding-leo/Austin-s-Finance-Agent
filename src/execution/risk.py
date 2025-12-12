import time

class RiskManager:
    def __init__(self, min_position_pct: float, max_position_pct: float, max_daily_drawdown_pct: float, cooldown_minutes: int, min_cash_buffer_pct: float, leverage_min: int, leverage_max: int, min_rrr: float):
        self.min_position_pct = min_position_pct
        self.max_position_pct = max_position_pct
        self.max_daily_drawdown_pct = max_daily_drawdown_pct
        self.cooldown_seconds = cooldown_minutes * 60
        self.min_cash_buffer_pct = min_cash_buffer_pct
        self.leverage_min = leverage_min
        self.leverage_max = leverage_max
        self.min_rrr = min_rrr
        self.last_loss_time = 0

    def can_trade(self) -> bool:
        if self.last_loss_time == 0:
            return True
        return time.time() - self.last_loss_time > self.cooldown_seconds

    def record_loss(self):
        self.last_loss_time = time.time()

    def validate(self, decision: dict, equity: float, cash: float) -> (bool, str):
        action = str(decision.get("action", "HOLD")).upper()
        amount_usd = float(decision.get("amount_usd", 0))
        if action not in ["BUY", "SELL", "HOLD"]:
            return False, "invalid_action"
        if action == "HOLD":
            return True, "ok"
        if amount_usd <= 0:
            return False, "invalid_amount"
        if not self.can_trade():
            return False, "cooldown"
        lev = float(decision.get("leverage", 0) or 0)
        if lev < self.leverage_min or lev > self.leverage_max:
            return False, "leverage_out_of_bounds"
        notional = amount_usd * lev
        pos_pct = notional / equity if equity > 0 else 0
        if pos_pct < self.min_position_pct:
            return False, "position_below_min"
        if pos_pct > self.max_position_pct:
            return False, "position_above_max"
        sl = decision.get("stop_loss")
        if sl is None:
            return False, "stop_loss_required"
        rr = float(decision.get("risk_reward", 0) or 0)
        if rr < self.min_rrr:
            return False, "risk_reward_too_low"
        if cash - amount_usd < equity * self.min_cash_buffer_pct and action == "BUY":
            return False, "cash_buffer"
        return True, "ok"
