"""Tests for rate limiter."""
import pytest
import time
from web.backend.rate_limit import RateLimiter


class TestRateLimiterAllows:
    """Tests for is_allowed method."""

    def test_first_request_allowed(self) -> None:
        """First request from IP should be allowed."""
        limiter = RateLimiter(max_per_hour=1)
        assert limiter.is_allowed("1.2.3.4") is True

    def test_second_request_blocked_with_max_one(self) -> None:
        """Second request from same IP should be blocked if max=1."""
        limiter = RateLimiter(max_per_hour=1)
        limiter.record("1.2.3.4")
        assert limiter.is_allowed("1.2.3.4") is False

    def test_different_ips_independent(self) -> None:
        """Different IPs should have independent limits."""
        limiter = RateLimiter(max_per_hour=1)
        limiter.record("1.2.3.4")
        assert limiter.is_allowed("5.6.7.8") is True

    def test_allows_multiple_requests_up_to_limit(self) -> None:
        """Should allow up to max_per_hour requests."""
        limiter = RateLimiter(max_per_hour=3)
        ip = "1.2.3.4"
        assert limiter.is_allowed(ip) is True
        limiter.record(ip)
        assert limiter.is_allowed(ip) is True
        limiter.record(ip)
        assert limiter.is_allowed(ip) is True
        limiter.record(ip)
        assert limiter.is_allowed(ip) is False


class TestRateLimiterRecord:
    """Tests for record method."""

    def test_record_increments_count(self) -> None:
        """Record should track the request."""
        limiter = RateLimiter(max_per_hour=2)
        ip = "1.2.3.4"
        assert limiter.is_allowed(ip) is True
        limiter.record(ip)
        assert limiter.is_allowed(ip) is True
        limiter.record(ip)
        assert limiter.is_allowed(ip) is False


class TestRateLimiterExpiry:
    """Tests for TTL expiration."""

    def test_expired_records_cleaned(self) -> None:
        """Old records outside window should be cleaned up."""
        limiter = RateLimiter(max_per_hour=1, window_seconds=0)
        limiter.record("1.2.3.4")
        time.sleep(0.01)
        assert limiter.is_allowed("1.2.3.4") is True

    def test_records_within_window_preserved(self) -> None:
        """Recent records within window should be preserved."""
        limiter = RateLimiter(max_per_hour=1, window_seconds=3600)
        limiter.record("1.2.3.4")
        assert limiter.is_allowed("1.2.3.4") is False

    def test_mixed_old_and_new_records(self) -> None:
        """Only old records should be cleaned, recent ones kept."""
        limiter = RateLimiter(max_per_hour=2, window_seconds=1)
        ip = "1.2.3.4"
        limiter.record(ip)
        time.sleep(1.2)
        # Old record should be cleaned after 1.2 seconds
        assert limiter.is_allowed(ip) is True
        limiter.record(ip)
        # New record should be kept, so we should still have 1 record
        assert limiter.is_allowed(ip) is True
        limiter.record(ip)
        # Now with 2 records, max is 2, so next should be blocked
        assert limiter.is_allowed(ip) is False


class TestRateLimiterEdgeCases:
    """Tests for edge cases."""

    def test_empty_limiter(self) -> None:
        """Empty limiter should allow first request."""
        limiter = RateLimiter(max_per_hour=1)
        assert limiter.is_allowed("1.2.3.4") is True

    def test_zero_max_blocks_all(self) -> None:
        """max_per_hour=0 should block all requests."""
        limiter = RateLimiter(max_per_hour=0)
        assert limiter.is_allowed("1.2.3.4") is False

    def test_high_max_allows_many(self) -> None:
        """High max_per_hour should allow many requests."""
        limiter = RateLimiter(max_per_hour=100)
        ip = "1.2.3.4"
        for _ in range(100):
            assert limiter.is_allowed(ip) is True
            limiter.record(ip)
        assert limiter.is_allowed(ip) is False
