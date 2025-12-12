import ccxt
import pandas as pd
import os
import json

class OKXClient:
    def __init__(self):
        api_key = os.getenv("OKX_API_KEY")
        secret = os.getenv("OKX_SECRET")
        password = os.getenv("OKX_PASSPHRASE")
        cfg = {}
        if api_key and secret and password:
            cfg = {"apiKey": api_key, "secret": secret, "password": password}
        self.exchange = ccxt.okx(cfg)
        self.exchange.timeout = 20000
        self.last_price = {}

    def fetch_ohlcv(self, symbol: str, timeframe: str, limit: int = 200) -> pd.DataFrame:
        try:
            data = self.exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            df = pd.DataFrame(data, columns=["timestamp", "open", "high", "low", "close", "volume"])
            df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms")
            return df
        except Exception:
            # Return empty frame on failure; caller should handle
            return pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"])

    def fetch_price(self, symbol: str) -> float:
        try:
            t = self.exchange.fetch_ticker(symbol)
            price = float(t.get("last", t.get("close", 0.0)) or 0.0)
            if price > 0:
                self.last_price[symbol] = price
            return price if price > 0 else float(self.last_price.get(symbol, 0.0))
        except Exception:
            return float(self.last_price.get(symbol, 0.0))

    def get_account_state(self, symbol: str, price: float) -> dict:
        try:
            bal = self.exchange.fetch_balance()
            cash = float(bal.get("free", {}).get("USDT", bal.get("total", {}).get("USDT", 0.0)) or 0.0)
            base = symbol.split("/")[0]
            qty = float(bal.get("total", {}).get(base, 0.0) or 0.0)
            equity = cash + (qty * price if price else 0.0)
            return {"cash": cash, "qty": qty, "equity": equity}
        except Exception:
            # Fallback to zero if not authenticated or failed
            return {"cash": 0.0, "qty": 0.0, "equity": 0.0}

    def place_spot_market_buy(self, symbol: str, amount_usd: float, price: float) -> (bool, str):
        if amount_usd <= 0 or price <= 0:
            return False, "invalid_amount_or_price"
        qty = amount_usd / price
        try:
            order = self.exchange.create_order(symbol, 'market', 'buy', qty)
            oid = order.get('id', '')
            return True, oid or json.dumps(order)
        except Exception as e:
            return False, str(e)

    def place_spot_market_sell(self, symbol: str, amount_usd: float, price: float, qty_available: float) -> (bool, str):
        if amount_usd <= 0 or price <= 0:
            return False, "invalid_amount_or_price"
        qty = amount_usd / price
        if qty > qty_available:
            qty = qty_available
        if qty <= 0:
            return False, "no_position"
        try:
            order = self.exchange.create_order(symbol, 'market', 'sell', qty)
            oid = order.get('id', '')
            return True, oid or json.dumps(order)
        except Exception as e:
            return False, str(e)

    def _perp_symbol(self, spot_symbol: str) -> str:
        base, quote = spot_symbol.split("/")
        return f"{base}/{quote}:USDT"

    def fetch_perp_position_qty(self, spot_symbol: str) -> float:
        try:
            ps = self.exchange.fetch_positions()
            perp = self._perp_symbol(spot_symbol)
            qty = 0.0
            for p in ps:
                if p.get("symbol") == perp:
                    amt = float(p.get("contracts", p.get("amount", 0.0)) or 0.0)
                    side = str(p.get("side", "long"))
                    qty += amt if side == "long" else -amt
            return qty
        except Exception:
            return 0.0

    def get_perp_min_amount(self, spot_symbol: str) -> float:
        try:
            self.exchange.load_markets()
            m = self.exchange.markets.get(self._perp_symbol(spot_symbol))
            if not m:
                return 0.0
            limits = m.get('limits', {})
            amt_min = limits.get('amount', {}).get('min')
            if amt_min:
                return float(amt_min)
            prec = m.get('precision', {}).get('amount')
            if prec is not None:
                try:
                    if isinstance(prec, (float,)) and prec < 1.0:
                        return float(prec)
                    if isinstance(prec, int) and prec >= 0:
                        return float(10 ** (-prec))
                except Exception:
                    return 0.0
            return 0.0
        except Exception:
            return 0.0

    def get_perp_min_base_qty(self, spot_symbol: str) -> float:
        try:
            self.exchange.load_markets()
            m = self.exchange.markets.get(self._perp_symbol(spot_symbol))
            if not m:
                return 0.0
            contract_size = float(m.get('contractSize') or 1.0)
            min_contracts = self.get_perp_min_amount(spot_symbol)
            return float(min_contracts) * contract_size
        except Exception:
            return 0.0

    def set_perp_leverage(self, spot_symbol: str, leverage: float):
        try:
            self.exchange.set_leverage(leverage, self._perp_symbol(spot_symbol), {"mgnMode": "cross"})
        except Exception:
            pass

    def place_perp_market_order(self, spot_symbol: str, side: str, notional_usd: float, price: float, leverage: float, reduce_only: bool = False, tp_price: float = None, sl_price: float = None) -> (bool, str):
        if notional_usd <= 0 or price <= 0:
            return False, "invalid_notional_or_price"
        base_qty = notional_usd / price
        market = self.exchange.market(self._perp_symbol(spot_symbol))
        cs = float(market.get('contractSize') or 0.0)
        if cs <= 0:
            return False, "contract_size_unknown"
        contracts = base_qty / cs
        min_contracts = self.get_perp_min_amount(spot_symbol)
        if min_contracts and contracts < min_contracts:
            return False, f"contracts {contracts:.6f} below exchange minimum {min_contracts}"
        try:
            params = {"tdMode": "cross", "reduceOnly": reduce_only}
            if side.lower() == 'buy':
                params['posSide'] = 'long'
            elif side.lower() == 'sell':
                params['posSide'] = 'short'
            order = self.exchange.create_order(self._perp_symbol(spot_symbol), 'market', side, contracts, None, params)
            oid = order.get('id', '')
            return True, oid or json.dumps(order)
        except Exception as e:
            return False, str(e)

    def place_perp_market_by_contracts(self, spot_symbol: str, side: str, contracts: float) -> (bool, str, float):
        try:
            market = self.exchange.market(self._perp_symbol(spot_symbol))
            cs = float(market.get('contractSize') or 0.0)
            if cs <= 0:
                return False, "contract_size_unknown", 0.0
            base_qty = float(contracts) * cs
            params = {"tdMode": "cross", "reduceOnly": False}
            if side.lower() == 'buy':
                params['posSide'] = 'long'
            elif side.lower() == 'sell':
                params['posSide'] = 'short'
            order = self.exchange.create_order(self._perp_symbol(spot_symbol), 'market', side, float(contracts), None, params)
            oid = order.get('id', '')
            return True, (oid or json.dumps(order)), base_qty
        except Exception as e:
            return False, str(e), 0.0

    def close_perp_market(self, spot_symbol: str, qty: float, pos_side: str = 'long') -> (bool, str):
        if qty <= 0:
            return False, "invalid_qty"
        try:
            params = {"tdMode": "cross", "reduceOnly": True, "posSide": pos_side}
            side = 'sell' if pos_side == 'long' else 'buy'
            order = self.exchange.create_order(self._perp_symbol(spot_symbol), 'market', side, qty, None, params)
            oid = order.get('id', '')
            return True, oid or json.dumps(order)
        except Exception as e:
            return False, str(e)

    def place_perp_tp_sl_algo(self, spot_symbol: str, pos_side: str, tp_px: float = None, sl_px: float = None, qty: float = None, close_fraction: float = None):
        try:
            market = self.exchange.market(self._perp_symbol(spot_symbol))
            inst_id = market.get('id')
            payload = {"instId": inst_id, "tdMode": "cross", "posSide": pos_side, "reduceOnly": True, "ordType": "conditional"}
            payload['side'] = 'sell' if pos_side == 'long' else 'buy'
            # sz must be in contracts and respect lot size (amount precision)
            amount_step = None
            try:
                amount_step = market.get('precision', {}).get('amount') or market.get('limits', {}).get('amount', {}).get('min')
            except Exception:
                amount_step = None
            cs = float(market.get('contractSize') or 0.0)
            if close_fraction is not None:
                payload['closeFraction'] = str(close_fraction)
            elif qty is not None and qty > 0 and cs > 0:
                contracts = qty / cs
                if amount_step:
                    step = float(amount_step)
                    # round up to nearest step to satisfy lot size
                    contracts = ( (int(contracts / step + 0.999999)) * step )
                payload['sz'] = str(contracts)
            else:
                payload['closeFraction'] = '1'
            if tp_px is not None:
                payload.update({"tpTriggerPx": tp_px, "tpOrdPx": "-1", "tpTriggerPxType": "last"})
            if sl_px is not None:
                payload.update({"slTriggerPx": sl_px, "slOrdPx": "-1", "slTriggerPxType": "last"})
            # raw endpoint for algo orders
            result = self.exchange.privatePostTradeOrderAlgo(payload)
            return True, result
        except Exception as e:
            return False, str(e)
