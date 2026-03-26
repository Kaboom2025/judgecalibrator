"""Wrapper for LLM judge models."""
import json
import re
from typing import Optional
import litellm
from judgecalib.schemas import Task, JudgeResponse

JUDGE_SYSTEM_PROMPT = """You are an evaluation judge. Rate the quality of the response.
Return ONLY a JSON object with these fields:
- "score": integer 1-10 (1=terrible, 10=excellent)
- "confidence": integer 0-100 (your confidence in this score)
- "reasoning": one sentence explanation"""


class JudgeWrapper:
    """Wrapper around an LLM judge model."""

    def __init__(self, model_name: str, api_key: Optional[str] = None):
        """
        Initialize judge wrapper.

        Args:
            model_name: Model identifier (e.g., "gpt-4o", "claude-3-sonnet")
            api_key: Optional API key for the model
        """
        self.model_name = model_name
        self.api_key = api_key

    def evaluate(self, task: Task) -> JudgeResponse:
        """
        Evaluate a task using the judge model.

        Args:
            task: Task to evaluate

        Returns:
            JudgeResponse with score and confidence
        """
        user_content = (
            f"Question: {task.question}\n\n"
            f"Response to evaluate: {task.reference_answer or '(no response provided)'}"
        )

        response = litellm.completion(
            model=self.model_name,
            messages=[
                {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            api_key=self.api_key,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content
        return self._parse_response(task.id, raw)

    def _parse_response(self, task_id: str, raw: str) -> JudgeResponse:
        """
        Parse response from judge model.

        First tries JSON parsing, then falls back to regex extraction.

        Args:
            task_id: ID of the task being evaluated
            raw: Raw response text from the model

        Returns:
            Parsed JudgeResponse
        """
        # Try JSON parsing first
        try:
            data = json.loads(raw)
            score = data.get("score", 5)
            confidence = data.get("confidence", 50)
            reasoning = data.get("reasoning")
        except (json.JSONDecodeError, TypeError):
            # Fall back to regex
            score, confidence = self._extract_with_regex(raw)
            reasoning = None

        # Clamp values to valid ranges
        score = float(score)
        confidence = float(confidence)

        score = max(1.0, min(10.0, score))
        confidence = max(0.0, min(100.0, confidence))

        return JudgeResponse(
            task_id=task_id,
            score=score,
            confidence=confidence,
            reasoning=reasoning,
            raw_response=raw,
        )

    @staticmethod
    def _extract_with_regex(text: str) -> tuple:
        """
        Extract score and confidence from text using regex.

        Args:
            text: Text to extract from

        Returns:
            Tuple of (score, confidence)
        """
        score = 5
        confidence = 50

        # Look for score patterns
        score_patterns = [
            r"score[:\s]+(\d+\.?\d*)",
            r"(\d+\.?\d*)/10",
            r"(\d+\.?\d*)\s*/\s*10",
        ]
        for pattern in score_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                score = float(match.group(1))
                break

        # Look for confidence patterns
        confidence_patterns = [
            r"confidence[:\s]+(\d+\.?\d*)%?",
            r"confidence[:\s]+(\d+\.?\d*)\s*(?:%|percent)?",
        ]
        for pattern in confidence_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                confidence = float(match.group(1))
                break

        return score, confidence
