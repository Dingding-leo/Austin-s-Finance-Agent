import os
import json
from typing import Dict
from src.data.aggregator import sma, rsi, macd

def _arrays_from_candles(candles):
    x = [c.get("timestamp") for c in candles]
    o = [float(c.get("open", 0)) for c in candles]
    h = [float(c.get("high", 0)) for c in candles]
    l = [float(c.get("low", 0)) for c in candles]
    c_ = [float(c.get("close", 0)) for c in candles]
    return x, o, h, l, c_

def plot_chart(symbol: str, tf: str, tf_context: Dict, features: Dict, out_path: str):
    candles = features.get("candles", tf_context.get("candles", []))
    if not candles:
        return False, "No candle data"
    x, o, h, l, c_ = _arrays_from_candles(candles)
    # Indicators
    try:
        import pandas as pd
        series_close = pd.Series(c_)
        s20 = sma(series_close, 20).fillna(method="bfill").fillna(method="ffill").tolist()
        r = rsi(series_close).fillna(method="bfill").fillna(method="ffill").tolist()
        m = macd(series_close).fillna(method="bfill").fillna(method="ffill").tolist()
    except Exception:
        s20 = []
        r = []
        m = []

    fvgs = features.get("fvgs", [])
    rh = features.get("range_high")
    rl = features.get("range_low")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    html = f"""
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <script src="https://cdn.plot.ly/plotly-2.30.0.min.js"></script>
  <title>{symbol} {tf} Chart</title>
  <style>body{{font-family:sans-serif}} .chart{{margin-bottom:24px}}</style>
</head>
<body>
  <h2>{symbol} {tf} - Strategy View</h2>
  <div id="price" class="chart"></div>
  <div id="rsi" class="chart"></div>
  <div id="macd" class="chart"></div>
  <script>
    const x = {json.dumps(x)};
    const o = {json.dumps(o)};
    const h = {json.dumps(h)};
    const l = {json.dumps(l)};
    const c = {json.dumps(c_)};
    const s20 = {json.dumps(s20)};
    const rsiVals = {json.dumps(r)};
    const macdVals = {json.dumps(m)};
    const shapes = [];
    // FVG bands across full x-range
    const x0 = x[0];
    const x1 = x[x.length-1];
    const fvgs = {json.dumps(fvgs)};
    fvgs.forEach(g => {{
      const color = g.type === 'bullish' ? 'rgba(44,160,44,0.15)' : 'rgba(214,39,40,0.15)';
      shapes.push({{type:'rect', xref:'x', yref:'y', x0:x0, x1:x1, y0:g.bottom, y1:g.top, fillcolor:color, line:{{width:0}}}});
    }});
    // Range lines
    const rh = {json.dumps(rh)};
    const rl = {json.dumps(rl)};
    if (rh) shapes.push({{type:'line', xref:'x', yref:'y', x0:x0, x1:x1, y0:rh, y1:rh, line:{{color:'#9467bd', dash:'dash'}}}});
    if (rl) shapes.push({{type:'line', xref:'x', yref:'y', x0:x0, x1:x1, y0:rl, y1:rl, line:{{color:'#8c564b', dash:'dash'}}}});

    Plotly.newPlot('price', [
      {{type:'candlestick', x:x, open:o, high:h, low:l, close:c, name:'OHLC'}},
      {{type:'scatter', x:x, y:s20, mode:'lines', name:'SMA20', line:{{color:'#ff7f0e'}}}}
    ], {{title:'Price', shapes:shapes}});

    Plotly.newPlot('rsi', [{{type:'scatter', x:x, y:rsiVals, mode:'lines', name:'RSI', line:{{color:'#17becf'}}}}], {{title:'RSI', yaxis:{{range:[0,100]}}, shapes:[
      {{type:'line', xref:'x', yref:'y', x0:x0, x1:x1, y0:70, y1:70, line:{{color:'red', dash:'dot'}}}},
      {{type:'line', xref:'x', yref:'y', x0:x0, x1:x1, y0:30, y1:30, line:{{color:'green', dash:'dot'}}}}
    ]}});

    Plotly.newPlot('macd', [{{type:'scatter', x:x, y:macdVals, mode:'lines', name:'MACD', line:{{color:'#7f7f7f'}}}}], {{title:'MACD'}});
  </script>
</body>
</html>
"""
    with open(out_path.replace('.png', '.html'), 'w') as f:
        f.write(html)
    return True, out_path.replace('.png', '.html')
