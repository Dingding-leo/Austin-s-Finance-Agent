import os
from dotenv import load_dotenv
from src.execution.okx_live import OKXLiveAdapter

load_dotenv()

def check():
    try:
        print("Connecting to OKX...")
        adapter = OKXLiveAdapter(dry_run=False)
        balance = adapter.get_balance()
        
        print("\n--- OKX Account Balance ---")
        # Print non-zero balances
        total = balance.get("total", {})
        free = balance.get("free", {})
        
        found = False
        for currency, amount in total.items():
            if float(amount) > 0:
                found = True
                print(f"{currency}: {amount} (Available: {free.get(currency, 0)})")
        
        if not found:
            print("Account connected successfully, but all balances are 0.")
            
    except Exception as e:
        print(f"Error connecting to OKX: {e}")

if __name__ == "__main__":
    check()