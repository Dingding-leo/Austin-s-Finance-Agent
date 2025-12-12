import os
import ccxt

class OKXLiveAdapter:
    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.exchange = ccxt.okx({
            "apiKey": os.getenv("OKX_API_KEY"),
            "secret": os.getenv("OKX_SECRET"),
            "password": os.getenv("OKX_PASSPHRASE")
        })

    def market_buy(self, symbol: str, amount: float):
        if self.dry_run:
            return {"status": "dry_run", "symbol": symbol, "amount": amount}
        return self.exchange.create_market_buy_order(symbol, amount)

    def market_sell(self, symbol: str, amount: float):
        if self.dry_run:
            return {"status": "dry_run", "symbol": symbol, "amount": amount}
        return self.exchange.create_market_sell_order(symbol, amount)

    def get_balance(self):
        return self.exchange.fetch_balance()
