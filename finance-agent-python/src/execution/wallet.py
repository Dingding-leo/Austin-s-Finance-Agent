class Wallet:
    def __init__(self, base_currency: str = "USDT", initial_balance: float = 10000.0):
        self.base = base_currency
        self.balance = {self.base: float(initial_balance)}
        self.positions = {}

    def equity(self, prices: dict) -> float:
        e = float(self.balance.get(self.base, 0))
        for sym, qty in self.positions.items():
            e += float(qty) * float(prices.get(sym, 0))
        return e

    def buy(self, symbol: str, price: float, amount_usd: float):
        if amount_usd <= 0 or price <= 0:
            return False, "invalid"
        if amount_usd > self.balance.get(self.base, 0):
            return False, "insufficient"
        qty = amount_usd / price
        self.balance[self.base] -= amount_usd
        self.positions[symbol] = self.positions.get(symbol, 0) + qty
        return True, f"buy {qty} {symbol}"

    def sell(self, symbol: str, price: float, amount_usd: float):
        if amount_usd <= 0 or price <= 0:
            return False, "invalid"
        qty = amount_usd / price
        if qty > self.positions.get(symbol, 0):
            qty = self.positions.get(symbol, 0)
        if qty <= 0:
            return False, "no_position"
        revenue = qty * price
        self.positions[symbol] = self.positions.get(symbol, 0) - qty
        if self.positions[symbol] <= 1e-8:
            del self.positions[symbol]
        self.balance[self.base] += revenue
        return True, f"sell {qty} {symbol}"
