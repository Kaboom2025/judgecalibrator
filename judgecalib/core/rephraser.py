"""Prompt rephraser for generating semantic variations."""
import json
import hashlib
from typing import Optional
import litellm

REPHRASER_SYSTEM_PROMPT = """Generate {n} semantically equivalent variations of the following evaluation prompt.
Keep the same evaluation criteria and task, but vary the phrasing, sentence structure, and wording.
Return ONLY a JSON array of {n} strings, no other text."""

EXPANDER_SYSTEM_PROMPT = """Expand the following answer to be approximately 50% longer.
Add relevant details, examples, and elaboration that genuinely improve the response.
Do NOT add filler phrases, repetition, or padding — only substantive content.
Return ONLY the expanded answer, no commentary."""


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

        # Parse response — strip markdown fences if present
        raw = response.choices[0].message.content or ""
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```", 2)[1]
            if raw.startswith("json"):
                raw = raw[4:]
            raw = raw.strip()

        try:
            variations = json.loads(raw)
            result = [str(v) for v in variations[:n]]
        except (json.JSONDecodeError, TypeError, ValueError):
            # Fallback: return the original prompt repeated n times
            result = [prompt] * n

        # Cache result
        self._cache[cache_key] = result

        return result

    def expand(self, text: str) -> str:
        """
        Expand text to be ~50% longer with substantive content (no filler).

        Args:
            text: Original text to expand

        Returns:
            Expanded version of the text, or original if expansion fails
        """
        cache_key = hashlib.md5(f"expand:{text}".encode()).hexdigest()

        if cache_key in self._cache:
            return self._cache[cache_key][0]

        try:
            response = litellm.completion(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": EXPANDER_SYSTEM_PROMPT},
                    {"role": "user", "content": text},
                ],
                api_key=self.api_key,
            )
            result = (response.choices[0].message.content or "").strip()
            if not result:
                result = text
        except Exception:
            result = text

        self._cache[cache_key] = [result]
        return result
