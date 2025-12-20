import time
import os
import sys
import json
import logging
from dotenv import load_dotenv

# Add project root/finance-agent-python to path to allow imports from src
current_dir = os.path.dirname(os.path.abspath(__file__))
# Go up 3 levels to get to project root, then down into finance-agent-python
agent_root = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(current_dir))), 'finance-agent-python')
sys.path.insert(0, agent_root)

from supabase import create_client, Client
from src.execution.okx_live import OKXLiveAdapter
# Import the detailed client for perp orders if needed, or extend OKXLiveAdapter
from src.data.okx_client import OKXClient

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize OKX Client
# We use the detailed OKXClient from data/okx_client.py as it has more features
okx = OKXClient()

OWNER_USER_ID = os.getenv("OWNER_USER_ID")

def fetch_and_update_balance():
    if not OWNER_USER_ID:
        return
        
    try:
        # Use get_account_state to find total equity (USDT)
        # Note: get_account_state takes a symbol and price, but we just want general balance.
        # Let's inspect OKXClient.get_account_state or fetch_balance
        
        # OKXClient.exchange is a ccxt instance
        bal = okx.exchange.fetch_balance()
        # Usually total equity is in info or total['USDT'] if base currency
        # For unified account, details are in 'info' -> 'data' -> [0] -> 'totalEq'
        
        total_eq = 0.0
        if 'info' in bal and 'data' in bal['info'] and len(bal['info']['data']) > 0:
             total_eq = float(bal['info']['data'][0].get('totalEq', 0.0))
        else:
             # Fallback to USDT total if not unified
             total_eq = float(bal.get('total', {}).get('USDT', 0.0))
        
        # Update Supabase
        supabase.table('account_balances').upsert({
            'user_id': OWNER_USER_ID,
            'total_equity': total_eq,
            'updated_at': 'now()'
        }).execute()
        
        logger.info(f"Updated account balance: ${total_eq:.2f}")
        
    except Exception as e:
        logger.error(f"Failed to fetch balance: {e}")

def process_orders():
    logger.info("Starting Local Execution Agent...")
    if not OWNER_USER_ID:
        logger.warning("OWNER_USER_ID not set in .env. Balance updates will be skipped.")
    
    logger.info("Polling for orders with status 'PENDING_EXECUTION'...")
    
    last_balance_update = 0
    
    while True:
        try:
            # Update balance every 15 seconds
            now = time.time()
            if now - last_balance_update > 15:
                fetch_and_update_balance()
                last_balance_update = now

            # Fetch pending orders
            # Fetch pending orders
            response = supabase.table('orders')\
                .select("*")\
                .eq('status', 'PENDING_EXECUTION')\
                .execute()
            
            orders = response.data
            
            if not orders:
                time.sleep(2)
                continue
                
            for order in orders:
                logger.info(f"Processing Order {order['id']}: {order['side']} {order['symbol']} {order['quantity']}")
                
                symbol = order['symbol']
                side = order['side'].lower()
                qty = float(order['quantity'])
                
                # Execute on OKX
                # Note: This logic assumes Spot Market Buy/Sell for simplicity. 
                # Enhance this to handle Perps if needed based on symbol format.
                
                result_ok = False
                msg = ""
                
                # Check if it's a perp symbol or spot
                is_perp = "SWAP" in symbol or "-USDT" in symbol # simplistic check, adjust as needed
                
                # For this agent, we'll try to use the generic placement methods
                # Note: okx_client.py methods take 'amount_usd' for spot buy usually.
                # We need to clarify if 'quantity' in DB is USD amount or Token amount.
                # Usually Dashboard sends USD amount for buys.
                
                current_price = okx.fetch_price(symbol)
                
                if side == 'buy':
                    # Assuming quantity is in USDT for buys
                    success, oid = okx.place_spot_market_buy(symbol, qty, current_price)
                    if success:
                        result_ok = True
                        msg = f"Filled: {oid}"
                    else:
                        msg = oid
                elif side == 'sell':
                    # For sell, we usually need token amount.
                    # Check balance first?
                    # Let's assume qty is token amount for sell
                    # Or is it USD value? The dashboard usually deals in USD value for simplicity.
                    # Let's try to sell by USD value logic in okx_client
                    
                    # We need available base qty
                    # This is complex. Let's simplify: 
                    # If the user wants to sell $100 worth of BTC.
                    # place_spot_market_sell takes amount_usd
                    
                    # Need to check if user holds enough? okx_client handles it.
                    # We need 'qty_available' for the method signature
                    bal = okx.get_account_state(symbol, current_price)
                    qty_avail = bal['qty']
                    
                    success, oid = okx.place_spot_market_sell(symbol, qty, current_price, qty_avail)
                    if success:
                        result_ok = True
                        msg = f"Filled: {oid}"
                    else:
                        msg = oid
                
                # Update Supabase
                new_status = 'EXECUTED' if result_ok else 'FAILED'
                supabase.table('orders').update({
                    'status': new_status,
                    # We could store the error message in a metadata field if it existed
                    'updated_at': 'now()'
                }).eq('id', order['id']).execute()
                
                logger.info(f"Order {order['id']} {new_status}: {msg}")
                
        except Exception as e:
            logger.error(f"Error in poll loop: {e}")
            time.sleep(5)

if __name__ == "__main__":
    process_orders()
