import os
import json
import time
from dotenv import load_dotenv
from colorama import Fore, Style, init
from configs import settings
from src.strategies.registry import available_strategies
from src.core.agent import Agent
from src.core.llm import DeepSeekClient
from src.data.okx_client import OKXClient
from src.data.aggregator import build_multi_timeframe
from src.data.news import NewsEngine
from src.execution.wallet import Wallet
from src.execution.risk import RiskManager

load_dotenv()
init(autoreset=True)

def run():
    symbol = os.getenv("SYMBOL", settings.symbols[0])
    tf = settings.timeframes
    strategies_env = os.getenv("STRATEGIES")
    if strategies_env:
        strat_keys = [s.strip() for s in strategies_env.split(",") if s.strip()]
    else:
        strat_keys = [os.getenv("STRATEGY", "conservative")]
    valid_keys = []
    for k in strat_keys:
        if k in available_strategies:
            valid_keys.append(k)
        else:
            print(Fore.RED + f"Strategy '{k}' not found. Skipping.")
    if not valid_keys:
        valid_keys = ["conservative"]
    multi_mode = len(valid_keys) > 1
    okx = OKXClient()
    news = NewsEngine()
    wallet = Wallet()
    risk = RiskManager(
        min_position_pct=settings.risk["min_position_pct"],
        max_position_pct=settings.risk["max_position_pct"],
        max_daily_drawdown_pct=settings.risk["max_daily_drawdown_pct"],
        cooldown_minutes=settings.risk["cooldown_minutes"],
        min_cash_buffer_pct=settings.risk["min_cash_buffer_pct"],
        leverage_min=settings.risk["leverage_min"],
        leverage_max=settings.risk["leverage_max"],
        min_rrr=settings.risk["min_rrr"]
    )
    reviewer = DeepSeekClient(system_prompt="You are a trading reviewer. Return JSON: {\"reflection\": string}", model="deepseek-chat")
    open_path = "logs/open_orders.json"
    journal_path = "logs/trade_journal.md"
    try:
        os.makedirs("logs", exist_ok=True)
        if not os.path.exists(open_path):
            with open(open_path, "w") as f:
                f.write("{}")
        if not os.path.exists(journal_path):
            with open(journal_path, "a") as f:
                f.write("")
    except Exception:
        pass
    try:
        with open(open_path, "r") as f:
            open_orders = json.load(f)
    except Exception:
        open_orders = {}
    live_env = os.getenv("LIVE_TRADING", "false").lower() == "true"
    use_perp = os.getenv("USE_PERP", "true").lower() == "true"
    # Live trading is enabled if either env flag is true OR settings.live.enabled is true, and OKX creds exist
    okx_creds = bool(os.getenv("OKX_API_KEY")) and bool(os.getenv("OKX_SECRET")) and bool(os.getenv("OKX_PASSPHRASE"))
    live_enabled = (live_env or settings.live.get("enabled", False)) and okx_creds
    while True:
        prices = {}
        prices[symbol] = okx.fetch_price(symbol)
        try:
            for k, entry in list(open_orders.items()):
                sym = entry.get("symbol", symbol)
                if sym not in prices:
                    prices[sym] = okx.fetch_price(sym)
        except Exception:
            pass
        acct = okx.get_account_state(symbol, prices[symbol])
        mctx = build_multi_timeframe(okx, symbol, tf)
        headlines = news.headlines(f"{symbol} crypto news", 5)
        news_text = news.summarize(headlines)
        perp_qty = okx.fetch_perp_position_qty(symbol)
        holdings = {symbol: perp_qty} if perp_qty != 0 else ({symbol: acct["qty"]} if acct.get("qty", 0) > 0 else {})
        portfolio_state = {"cash": acct["cash"], "positions": holdings, "equity": acct["equity"]}
        print(Fore.YELLOW + f"Price {prices[symbol]:.2f}")
        for key in valid_keys:
            strategy = available_strategies[key]
            agent = Agent(strategy=strategy)
            desired_notional = os.getenv("DESIRED_NOTIONAL_USD")
            mc = {"multi": mctx, "price": prices[symbol], "symbol": symbol}
            if desired_notional:
                try:
                    mc["desired_notional_usd"] = float(desired_notional)
                except Exception:
                    pass
            decision = agent.decide(mc, portfolio_state, news_text)
            order_contracts = os.getenv("ORDER_CONTRACTS")
            # Enforce min/max after-leverage sizing when not placing explicit contracts
            if not order_contracts:
                lev_used = float(decision.get("leverage", settings.risk["leverage_min"]) or settings.risk["leverage_min"]) 
                eq = float(portfolio_state["equity"]) if portfolio_state["equity"] else 0.0
                min_pct = float(settings.risk["min_position_pct"]) 
                max_pct = float(settings.risk["max_position_pct"]) 
                current_notional = float(decision.get("amount_usd", 0) or 0.0) * lev_used
                if decision.get("position_pct") is None and eq > 0:
                    decision["position_pct"] = current_notional / eq if eq else 0.0
                if eq > 0 and current_notional < eq * min_pct:
                    decision["position_pct"] = min_pct
                    decision["amount_usd"] = (eq * min_pct) / lev_used
                elif eq > 0 and current_notional > eq * max_pct:
                    decision["position_pct"] = max_pct
                    decision["amount_usd"] = (eq * max_pct) / lev_used
            valid, reason = (True, "ok") if order_contracts else risk.validate(decision, portfolio_state["equity"], portfolio_state["cash"])
            print(Fore.CYAN + f"[{strategy.name}]")
            print(Fore.WHITE + f"Decision {decision['action']} {decision['symbol']} ${decision['amount_usd']:.2f}")
            pos_pct = decision.get('position_pct')
            lev = decision.get('leverage')
            sl = decision.get('stop_loss')
            tp = decision.get('take_profit')
            rr = decision.get('risk_reward')
            es = decision.get('entry_signal')
            er = decision.get('entry_reason')
            if pos_pct is not None:
                notional_pct = float(pos_pct) * 100.0
                notional_usd = float(pos_pct) * float(portfolio_state['equity'])
                print(Fore.WHITE + f"Position % (after leverage): {notional_pct:.1f}% | Notional: ${notional_usd:.2f} | Leverage: {lev}")
            if sl is not None:
                print(Fore.WHITE + f"Stop Loss: {sl} | Take Profit: {tp}")
            if rr is not None:
                print(Fore.WHITE + f"Risk/Reward: {rr}")
            if es is not None:
                print(Fore.WHITE + f"Entry: {('YES' if es else 'NO')} - {er}")
            print(Fore.MAGENTA + f"News Analysis: {decision.get('news_analysis', '')}")
            print(Fore.BLUE + f"Technical Conditions: {decision.get('technical_conditions', '')}")
            print(Fore.GREEN + f"Risk Manager: {'ACCEPTED' if valid else 'REJECTED'}{(' - ' + reason) if not valid else ''}")
            if valid:
                if decision["action"] == "BUY":
                    if live_enabled and use_perp:
                        qty = 0.0
                        if order_contracts:
                            contracts = float(order_contracts)
                            print(Fore.YELLOW + f"Placing PERP BUY contracts={contracts} on {symbol}")
                            ok, msg, base_qty = okx.place_perp_market_by_contracts(symbol, 'buy', contracts)
                            qty = base_qty
                        else:
                            lev_used = float(decision.get("leverage", settings.risk["leverage_min"]))
                            notional = decision["amount_usd"] * lev_used
                            print(Fore.YELLOW + f"Placing PERP BUY notional=${notional:.2f} price={prices[symbol]:.2f} lev={lev_used}")
                            okx.set_perp_leverage(symbol, lev_used)
                            base, quote = symbol.split("/")
                            perp_sym = f"{base}/{quote}:USDT"
                            cs = float(okx.exchange.market(perp_sym).get('contractSize') or 1.0)
                            min_contracts = okx.get_perp_min_amount(symbol)
                            contracts = (notional / prices[symbol]) / cs if prices[symbol] else 0.0
                            if min_contracts and contracts < min_contracts:
                                min_notional = (min_contracts * cs) * prices[symbol]
                                target_notional = max(notional, min_notional)
                                target_pct = target_notional / portfolio_state["equity"] if portfolio_state["equity"] else 0.0
                                if target_pct <= settings.risk["max_position_pct"] and target_pct >= settings.risk["min_position_pct"]:
                                    decision["amount_usd"] = target_notional / lev_used
                                    decision["position_pct"] = target_pct
                                    notional = target_notional
                                    print(Fore.YELLOW + f"Adjusted to min contract: notional=${notional:.2f} (pct={target_pct*100:.1f}%)")
                                    ok, msg = okx.place_perp_market_order(symbol, 'buy', notional, prices[symbol], lev_used, False, decision.get("take_profit"), decision.get("stop_loss") )
                                else:
                                    print(Fore.RED + f"Cannot place PERP BUY: min contracts {min_contracts} would exceed caps (pct={target_pct*100:.1f}%).")
                                    ok, msg = (False, f"min_contracts {min_contracts}")
                            else:
                                ok, msg = okx.place_perp_market_order(symbol, 'buy', notional, prices[symbol], lev_used, False, decision.get("take_profit"), decision.get("stop_loss") )
                        print(Fore.GREEN + (f"Live PERP BUY placed id={msg}" if ok else f"Live PERP BUY failed: {msg}"))
                        if ok:
                            pos_side = 'long'
                            ok_tp_sl, algo = okx.place_perp_tp_sl_algo(symbol, pos_side, decision.get("take_profit"), decision.get("stop_loss"), qty=qty)
                            print(Fore.CYAN + (f"Attached TP/SL algo: {algo}" if ok_tp_sl else f"Failed to attach TP/SL: {algo}"))
                    elif live_enabled:
                        print(Fore.YELLOW + f"Placing SPOT BUY amount_usd=${decision['amount_usd']:.2f} price={prices[symbol]:.2f}")
                        ok, msg = okx.place_spot_market_buy(symbol, decision["amount_usd"], prices[symbol])
                        print(Fore.GREEN + (f"Live SPOT BUY placed id={msg}" if ok else f"Live SPOT BUY failed: {msg}"))
                    else:
                        ok, msg = wallet.buy(symbol, prices[symbol], decision["amount_usd"])
                        print(Fore.GREEN + msg if ok else Fore.RED + msg)
                    if ok:
                        key_id = f"{strategy.name}:{symbol}"
                        if not order_contracts:
                            qty = (decision["amount_usd"] * float(decision.get("leverage", 1) or 1)) / prices[symbol] if prices[symbol] else 0.0
                        open_orders[key_id] = {
                            "ts": time.time(),
                            "strategy": strategy.name,
                            "symbol": symbol,
                            "entry_price": prices[symbol],
                            "qty": qty,
                            "amount_usd": decision["amount_usd"],
                            "order_id": msg,
                            "stop_loss": decision.get("stop_loss"),
                            "take_profit": decision.get("take_profit"),
                            "leverage": decision.get("leverage"),
                            "risk_reward": decision.get("risk_reward"),
                            "entry_reason": decision.get("entry_reason"),
                            "pos_side": "long"
                        }
                        try:
                            with open(open_path, "w") as f:
                                json.dump(open_orders, f)
                            ref = reviewer.complete_json(json.dumps({
                                "type": "entry_reflection",
                                "context": {
                                    "price": prices[symbol],
                                    "decision": decision
                                }
                            }))
                            with open(journal_path, "a") as f:
                                f.write(f"\n## OPEN {strategy.name} {symbol}\n")
                                f.write(json.dumps({"entry": open_orders[key_id], "reflection": ref.get("reflection", "")}) + "\n")
                        except Exception:
                            pass
                    # Refresh account state after execution for next strategies
                    acct = okx.get_account_state(symbol, prices[symbol])
                    portfolio_state = {"cash": acct["cash"], "positions": holdings, "equity": acct["equity"]}
                elif decision["action"] == "SELL":
                    if live_enabled and use_perp:
                        lev_used = float(decision.get("leverage", settings.risk["leverage_min"]))
                        notional = decision["amount_usd"] * lev_used
                        print(Fore.YELLOW + f"Placing PERP SELL notional=${notional:.2f} price={prices[symbol]:.2f} lev={lev_used}")
                        okx.set_perp_leverage(symbol, lev_used)
                        base, quote = symbol.split("/")
                        perp_sym = f"{base}/{quote}:USDT"
                        cs = float(okx.exchange.market(perp_sym).get('contractSize') or 1.0)
                        min_contracts = okx.get_perp_min_amount(symbol)
                        contracts = (notional / prices[symbol]) / cs if prices[symbol] else 0.0
                        if min_contracts and contracts < min_contracts:
                            min_notional = (min_contracts * cs) * prices[symbol]
                            target_notional = max(notional, min_notional)
                            target_pct = target_notional / portfolio_state["equity"] if portfolio_state["equity"] else 0.0
                            if target_pct <= settings.risk["max_position_pct"]:
                                decision["amount_usd"] = target_notional / lev_used
                                decision["position_pct"] = target_pct
                                notional = target_notional
                                print(Fore.YELLOW + f"Adjusted to min contract: notional=${notional:.2f} (pct={target_pct*100:.1f}%)")
                                ok, msg = okx.place_perp_market_order(symbol, 'sell', notional, prices[symbol], lev_used, True)
                            else:
                                print(Fore.RED + f"Cannot place PERP SELL: min contracts {min_contracts} would exceed caps (pct={target_pct*100:.1f}%).")
                                ok, msg = (False, f"min_contracts {min_contracts}")
                        else:
                            ok, msg = okx.place_perp_market_order(symbol, 'sell', notional, prices[symbol], lev_used, True)
                        print(Fore.RED + (f"Live PERP SELL placed id={msg}" if ok else f"Live PERP SELL failed: {msg}"))
                    elif live_enabled:
                        print(Fore.YELLOW + f"Placing SPOT SELL amount_usd=${decision['amount_usd']:.2f} price={prices[symbol]:.2f}")
                        ok, msg = okx.place_spot_market_sell(symbol, decision["amount_usd"], prices[symbol], acct.get("qty", 0.0))
                        print(Fore.RED + (f"Live SPOT SELL placed id={msg}" if ok else f"Live SPOT SELL failed: {msg}"))
                    else:
                        ok, msg = wallet.sell(symbol, prices[symbol], decision["amount_usd"])
                        print(Fore.RED + msg if ok else Fore.RED + msg)
                    key_id = f"{strategy.name}:{symbol}"
                    if ok and key_id in open_orders:
                        entry = open_orders.pop(key_id)
                        exit_price = prices[symbol]
                        qty = float(entry.get("qty", 0))
                        pnl_usd = qty * (exit_price - float(entry.get("entry_price", 0)))
                        try:
                            with open(open_path, "w") as f:
                                json.dump(open_orders, f)
                            ref = reviewer.complete_json(json.dumps({
                                "type": "exit_reflection",
                                "context": {
                                    "entry": entry,
                                    "exit_price": exit_price,
                                    "pnl_usd": pnl_usd
                                }
                            }))
                            with open(journal_path, "a") as f:
                                f.write(f"\n## CLOSE {strategy.name} {symbol}\n")
                                f.write(json.dumps({"entry": entry, "exit_price": exit_price, "pnl_usd": pnl_usd, "reflection": ref.get("reflection", "")}) + "\n")
                        except Exception:
                            pass
                    # Refresh account state after execution for next strategies
                    acct = okx.get_account_state(symbol, prices[symbol])
                    portfolio_state = {"cash": acct["cash"], "positions": holdings, "equity": acct["equity"]}
            # Monitor TP/SL for auto-close
            try:
                to_close = []
                for k, entry in open_orders.items():
                    sym = entry.get("symbol", symbol)
                    px = prices.get(sym, okx.fetch_price(sym))
                    tp = entry.get("take_profit")
                    sl = entry.get("stop_loss")
                    qty = float(entry.get("qty", 0))
                    pos_side = entry.get("pos_side", "long")
                    if qty <= 0:
                        continue
                    hit_tp = tp is not None and px >= float(tp)
                    hit_sl = sl is not None and px <= float(sl)
                    if hit_tp or hit_sl:
                        print(Fore.CYAN + f"Trigger hit for {k}: {'TP' if hit_tp else 'SL'} at {px:.2f}")
                        if live_enabled and use_perp:
                            ok, msg = okx.close_perp_market(sym, qty, pos_side)
                            print(Fore.CYAN + (f"Closed PERP position id={msg}" if ok else f"Close failed: {msg}"))
                        else:
                            ok, msg = wallet.sell(sym, px, qty * px)
                            print(Fore.CYAN + (msg))
                        to_close.append((k, entry, px))
                for k, entry, exit_px in to_close:
                    open_orders.pop(k, None)
                    with open(open_path, "w") as f:
                        json.dump(open_orders, f)
                    pnl_usd = float(entry.get("qty", 0)) * (exit_px - float(entry.get("entry_price", 0)))
                    ref = reviewer.complete_json(json.dumps({
                        "type": "exit_reflection",
                        "context": {"entry": entry, "exit_price": exit_px, "pnl_usd": pnl_usd}
                    }))
                    with open(journal_path, "a") as f:
                        f.write(f"\n## AUTO-CLOSE {entry.get('strategy')} {entry.get('symbol')}\n")
                        f.write(json.dumps({"entry": entry, "exit_price": exit_px, "pnl_usd": pnl_usd, "reflection": ref.get("reflection", "")}) + "\n")
            except Exception:
                pass

            log = {
                "ts": time.time(),
                "strategy": strategy.name,
                "symbol": symbol,
                "price": prices[symbol],
                "decision": decision,
                "equity": portfolio_state["equity"]
            }
            try:
                os.makedirs("logs", exist_ok=True)
                with open("logs/decisions.jsonl", "a") as f:
                    f.write(json.dumps(log) + "\n")
            except Exception:
                pass
        
        # Wait for 5 minutes (300 seconds) before the next iteration
        print(Fore.CYAN + "Waiting 5 minutes for next tick...")
        time.sleep(300)

if __name__ == "__main__":
    run()
