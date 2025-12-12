import pandas as pd
import numpy as np

def sma(series: pd.Series, n: int) -> pd.Series:
    return series.rolling(window=n, min_periods=1).mean()

def rsi(series: pd.Series, n: int = 14) -> pd.Series:
    delta = series.diff()
    up = delta.clip(lower=0)
    down = -1 * delta.clip(upper=0)
    ma_up = up.ewm(com= n - 1, adjust=False).mean()
    ma_down = down.ewm(com= n - 1, adjust=False).mean()
    rs = ma_up / ma_down.replace(0, np.nan)
    return 100 - (100 / (1 + rs))

def macd(series: pd.Series) -> pd.Series:
    ema12 = series.ewm(span=12, adjust=False).mean()
    ema26 = series.ewm(span=26, adjust=False).mean()
    return ema12 - ema26

def summarize(df: pd.DataFrame) -> dict:
    last = df.iloc[-1]
    s20 = sma(df["close"], 20).iloc[-1]
    r = rsi(df["close"]).iloc[-1]
    m = macd(df["close"]).iloc[-1]
    trend = "up" if last["close"] > s20 else "down"
    momentum = "bullish" if m > 0 else "bearish"
    
    # Recent 200 candles for pattern recognition (Full History)
    history = df[["timestamp", "open", "high", "low", "close", "volume"]].copy()
    history["timestamp"] = history["timestamp"].dt.strftime("%Y-%m-%d %H:%M")
    recent = history.to_dict(orient="records")

    return {
        "current": {
            "price": float(last["close"]),
            "sma20": float(s20),
            "rsi": float(r) if np.isfinite(r) else 50.0,
            "macd": float(m),
            "trend": trend,
            "momentum": momentum,
            "volatility": float(df["close"].std()),
            "high_200": float(df["high"].max()),
            "low_200": float(df["low"].min())
        },
        "candles": recent
    }

def build_multi_timeframe(okx_client, symbol: str, timeframes: list) -> dict:
    out = {}
    for tf in timeframes:
        df = okx_client.fetch_ohlcv(symbol, tf, limit=200)
        out[tf] = summarize(df)
    return out
