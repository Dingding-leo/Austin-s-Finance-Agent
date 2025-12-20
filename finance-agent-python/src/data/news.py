from ddgs import DDGS

class NewsEngine:
    def __init__(self):
        self.ddg = DDGS()

    def headlines(self, query: str, n: int = 5) -> list:
        try:
            items = self.ddg.news(query, max_results=n) or []
            # Ensure items have expected keys
            cleaned = []
            for i in items:
                cleaned.append({
                    "title": i.get("title", ""),
                    "source": i.get("source", ""),
                    "body": i.get("body", "")
                })
            return cleaned
        except Exception as e:
            print(f"News fetch error: {e}")
            return []

    def summarize(self, items: list) -> str:
        if not items:
            return "No news available."
        text = []
        for i, it in enumerate(items):
            text.append(f"{i+1}. {it['title']} ({it['source']})")
        return "\n".join(text)

    def sentiment(self, items: list) -> str:
        if not items:
            return "neutral"
        t = " ".join([it.get("title", "") + " " + it.get("body", "") for it in items]).lower()
        pos = any(k in t for k in ["approval", "surge", "rally", "bullish", "upgrade", "gain"])
        neg = any(k in t for k in ["ban", "hack", "down", "bearish", "selloff", "liquidation"])
        if pos and not neg:
            return "positive"
        if neg and not pos:
            return "negative"
        return "neutral"
