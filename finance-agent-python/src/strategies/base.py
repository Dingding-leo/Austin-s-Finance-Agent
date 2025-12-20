from abc import ABC, abstractmethod

class BaseStrategy(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        pass

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        pass

    def build_user_content(self, market_context: dict, portfolio_state: dict, news_summary: str) -> str:
        return (
            "{"
            + f"\"market\": {market_context}, "
            + f"\"portfolio\": {portfolio_state}, "
            + f"\"news\": \"{news_summary}\""
            + "}"
        )

    def inspect_features(self, market_context: dict) -> dict:
        return {}

    def position_size(self, decision: dict, market_context: dict, portfolio_state: dict) -> float:
        return float(decision.get("amount_usd", 0))
