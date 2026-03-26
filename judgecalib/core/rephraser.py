"""Prompt rephraser for generating semantic variations."""
import json
import hashlib
from typing import Optional
import litellm

REPHRASER_SYSTEM_PROMPT = """Generate {n} semantically equivalent variations of the following evaluation prompt.
Keep the same evaluation criteria and task, but vary the phrasing, sentence structure, and wording.
Return ONLY a JSON array of {n} strings, no other text."""


class Rephraser:
    """Generates semantic variations of evaluation prompts."""

    def __init__(
        self,
        model_name: str = "claude-3-haiku-20240307",
        api_key: Optional[str] = None,
    ) -> None:
        """
        Initialize rephraser.

        Args:
            model_name: LLM model to use for rephrasing (default: Claude Haiku)
            api_key: Optional API key for the model
        """
        self.model_name = model_name
        self.api_key = api_key
        self._cache: dict[str, list[str]] = {}

    def rephrase(self, prompt: str, n: int = 5) -> list[str]:
        """
        Generate semantic variations of a prompt.

        Args:
            prompt: Original prompt to rephrase
            n: Number of variations to generate (default 5)

        Returns:
            List of n semantic variations of the prompt
        """
        # Create cache key based on prompt and n
        cache_key = hashlib.md5(f"{prompt}:{n}".encode()).hexdigest()

        # Check cache
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Call LLM to generate variations
        response = litellm.completion(
            model=self.model_name,
            messages=[
                {
                    "role": "system",
                    "content": REPHRASER_SYSTEM_PROMPT.format(n=n),
                },
                {"role": "user", "content": prompt},
            ],
            api_key=self.api_key,
        )

        # Parse response
        raw = response.choices[0].message.content
        variations = json.loads(raw)

        # Convert all to strings and truncate to n
        result = [str(v) for v in variations[:n]]

        # Cache result
        self._cache[cache_key] = result

        return result
