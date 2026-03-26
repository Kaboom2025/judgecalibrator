"""Unit tests for the Rephraser module."""
import pytest
from unittest.mock import patch, MagicMock
from judgecalib.core.rephraser import Rephraser


class TestRephraserInitialization:
    """Tests for Rephraser initialization."""

    def test_rephraser_default_model_is_haiku(self):
        """Rephraser should use claude-3-haiku-20240307 by default."""
        rephraser = Rephraser()
        assert rephraser.model_name == "claude-3-haiku-20240307"

    def test_rephraser_accepts_custom_model(self):
        """Rephraser should accept custom model names."""
        rephraser = Rephraser(model_name="gpt-4")
        assert rephraser.model_name == "gpt-4"

    def test_rephraser_accepts_api_key(self):
        """Rephraser should accept optional API key."""
        rephraser = Rephraser(api_key="test_key")
        assert rephraser.api_key == "test_key"


class TestRephrase:
    """Tests for the rephrase method."""

    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_rephrase_returns_list_of_strings(self, mock_completion):
        """rephrase should return a list of string variations."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='["Variation 1", "Variation 2", "Variation 3", "Variation 4", "Variation 5"]'
                    )
                )
            ]
        )

        rephraser = Rephraser()
        result = rephraser.rephrase("Original prompt", n=5)

        assert isinstance(result, list)
        assert len(result) == 5
        assert all(isinstance(v, str) for v in result)

    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_rephrase_returns_n_variations(self, mock_completion):
        """rephrase should return exactly n variations."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='["V1", "V2", "V3"]'
                    )
                )
            ]
        )

        rephraser = Rephraser()
        result = rephraser.rephrase("Original prompt", n=3)

        assert len(result) == 3

    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_rephrase_returns_non_empty_strings(self, mock_completion):
        """rephrase should return non-empty strings."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='["Non-empty 1", "Non-empty 2"]'
                    )
                )
            ]
        )

        rephraser = Rephraser()
        result = rephraser.rephrase("Original prompt", n=2)

        assert all(len(v) > 0 for v in result)

    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_rephrase_caches_results(self, mock_completion):
        """rephrase should cache results and not call API twice for same prompt."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='["V1", "V2", "V3"]'
                    )
                )
            ]
        )

        rephraser = Rephraser()
        prompt = "Original prompt"
        n = 3

        result1 = rephraser.rephrase(prompt, n=n)
        result2 = rephraser.rephrase(prompt, n=n)

        # API should be called only once
        assert mock_completion.call_count == 1
        # Results should be identical
        assert result1 == result2

    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_rephrase_cache_different_prompts(self, mock_completion):
        """rephrase should not reuse cache for different prompts."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='["V1", "V2"]'
                    )
                )
            ]
        )

        rephraser = Rephraser()

        rephraser.rephrase("Prompt 1", n=2)
        rephraser.rephrase("Prompt 2", n=2)

        # API should be called twice for different prompts
        assert mock_completion.call_count == 2

    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_rephrase_cache_different_n(self, mock_completion):
        """rephrase should not reuse cache when n differs."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='["V1", "V2", "V3"]'
                    )
                )
            ]
        )

        rephraser = Rephraser()
        prompt = "Same prompt"

        rephraser.rephrase(prompt, n=2)
        rephraser.rephrase(prompt, n=3)

        # API should be called twice for different n values
        assert mock_completion.call_count == 2

    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_rephrase_passes_model_name(self, mock_completion):
        """rephrase should pass model_name to litellm.completion."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='["V1"]'
                    )
                )
            ]
        )

        model_name = "gpt-4"
        rephraser = Rephraser(model_name=model_name)
        rephraser.rephrase("Prompt", n=1)

        # Check that model was passed
        call_kwargs = mock_completion.call_args[1]
        assert call_kwargs["model"] == model_name

    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_rephrase_passes_api_key(self, mock_completion):
        """rephrase should pass api_key to litellm.completion."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='["V1"]'
                    )
                )
            ]
        )

        api_key = "test_key"
        rephraser = Rephraser(api_key=api_key)
        rephraser.rephrase("Prompt", n=1)

        # Check that api_key was passed
        call_kwargs = mock_completion.call_args[1]
        assert call_kwargs["api_key"] == api_key

    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_rephrase_includes_system_prompt(self, mock_completion):
        """rephrase should include system prompt in messages."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='["V1"]'
                    )
                )
            ]
        )

        rephraser = Rephraser()
        rephraser.rephrase("Prompt", n=1)

        # Check that system prompt was included
        call_kwargs = mock_completion.call_args[1]
        messages = call_kwargs["messages"]
        assert len(messages) == 2
        assert messages[0]["role"] == "system"
        assert "Generate" in messages[0]["content"]

    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_rephrase_truncates_if_more_than_n(self, mock_completion):
        """rephrase should truncate to n if API returns more variations."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='["V1", "V2", "V3", "V4", "V5", "V6"]'
                    )
                )
            ]
        )

        rephraser = Rephraser()
        result = rephraser.rephrase("Prompt", n=3)

        # Should only return 3 even if API returned 6
        assert len(result) == 3
        assert result == ["V1", "V2", "V3"]

    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_rephrase_handles_integer_in_json(self, mock_completion):
        """rephrase should convert non-string variations to strings."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='["String variation", 123, "Another string"]'
                    )
                )
            ]
        )

        rephraser = Rephraser()
        result = rephraser.rephrase("Prompt", n=3)

        # All should be strings
        assert len(result) == 3
        assert all(isinstance(v, str) for v in result)
