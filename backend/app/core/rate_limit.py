import time
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, Request, status

# In-memory IP request timestamp store
_ip_requests: Dict[str, List[float]] = defaultdict(list)
_rate_limiting_enabled: bool = True


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


def rate_limit_auth(
    request: Request,
    limit: int = 5,
    window_seconds: int = 60,
) -> None:
    """Rate limiter dependency: default 5 requests per minute per IP."""
    if not _rate_limiting_enabled:
        return

    client_ip = get_client_ip(request)
    now = time.time()
    cutoff = now - window_seconds

    # Filter timestamps within sliding window
    timestamps = [t for t in _ip_requests[client_ip] if t > cutoff]
    if len(timestamps) >= limit:
        _ip_requests[client_ip] = timestamps
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Quá nhiều yêu cầu. Vui lòng thử lại sau một phút",
        )

    timestamps.append(now)
    _ip_requests[client_ip] = timestamps


def reset_rate_limits() -> None:
    """Helper to clear rate limit store (useful in tests)."""
    _ip_requests.clear()


def set_rate_limiting_enabled(enabled: bool) -> None:
    """Toggle rate limiting globally (e.g., during tests)."""
    global _rate_limiting_enabled
    _rate_limiting_enabled = enabled
