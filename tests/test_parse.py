from src.core.agent import Agent
from src.strategies.registry import ConservativeStrategy

def test_decision_normalization():
    a = Agent(strategy=ConservativeStrategy())
    d = a.decide({"multi": {}, "price": 0}, {"cash": 0, "positions": {}, "equity": 0}, "")
    assert "action" in d and "symbol" in d and "amount_usd" in d and "reasoning" in d
