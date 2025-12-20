import os
import json
from openai import OpenAI

class DeepSeekClient:
    def __init__(self, system_prompt: str, model: str = "deepseek-chat"):
        api_key = os.getenv("DEEPSEEK_API_KEY")
        if not api_key:
            print("WARNING: DEEPSEEK_API_KEY not found. Using mock LLM mode.")
            self.client = None
        else:
            self.client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
        
        self.system_prompt = system_prompt
        self.model = model

    def complete_json(self, user_content: str) -> dict:
        if not self.client:
            # Mock response for testing without API key
            return {
                "action": "HOLD",
                "symbol": "BTC/USDT", 
                "amount_usd": 0,
                "reasoning": "Mock Decision (No API Key)"
            }

        try:
            resp = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=0.5,
                response_format={"type": "json_object"}
            )
            content = resp.choices[0].message.content
            return json.loads(content)
        except Exception:
            return {"action": "HOLD", "symbol": "BTC/USDT", "amount_usd": 0, "reasoning": "LLM error"}
