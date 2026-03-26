"""IP-based rate limiter."""
from collections import defaultdict
from datetime import datetime, timedelta
from typing import DefaultDict


class RateLimiter:
    """Rate limiter by IP address with sliding window."""

    def __init__(self, max_per_hour: int = 1, window_seconds: int = 3600) -> None:
        """
        Initialize rate limiter.

        Args:
            max_per_hour: Maximum requests allowed per window
            window_seconds: Time window in seconds (default 1 hour)
        """
        self._max = max_per_hour
        self._window = window_seconds
        self._records: DefaultDict[str, list[datetime]] = defaultdict(list)

    def is_allowed(self, ip: str) -> bool:
        """
        Check if request from IP is allowed.

        Args:
            ip: Client IP address

        Returns:
            True if request is allowed, False if rate limited
        """
        if ip in ("127.0.0.1", "::1", "localhost"):
            return True
        self._cleanup(ip)
        return len(self._records[ip]) < self._max

    def record(self, ip: str) -> None:
        """
        Record a request from IP.

        Args:
            ip: Client IP address
        """
        self._records[ip].append(datetime.utcnow())

    def _cleanup(self, ip: str) -> None:
        """Remove records outside the window for given IP."""
        cutoff = datetime.utcnow() - timedelta(seconds=self._window)
        self._records[ip] = [t for t in self._records[ip] if t > cutoff]
