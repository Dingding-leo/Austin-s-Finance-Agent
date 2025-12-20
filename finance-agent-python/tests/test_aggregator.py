import pandas as pd
from src.data.aggregator import summarize

def test_summarize_basic():
    df = pd.DataFrame({
        "timestamp": pd.date_range(start="2024-01-01", periods=50, freq="H"),
        "open": [100 + i for i in range(50)],
        "high": [101 + i for i in range(50)],
        "low": [99 + i for i in range(50)],
        "close": [100 + i for i in range(50)],
        "volume": [10 for _ in range(50)]
    })
    s = summarize(df)
    assert "price" in s and "sma20" in s and "rsi" in s and "macd" in s
