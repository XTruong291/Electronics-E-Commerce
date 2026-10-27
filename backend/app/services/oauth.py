from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx
from pydantic import BaseModel

from app.core.config import settings


class OAuthUserInfo(BaseModel):
    provider: str
    provider_user_id: str
    email: Optional[str] = None
    email_verified: bool = False
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


def get_oauth_authorize_url(provider: str, state: str, redirect_uri: str) -> str:
    """Generate authorization URL for given provider."""
    if provider == "google":
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "online",
        }
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    elif provider == "github":
        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "scope": "read:user user:email",
            "state": state,
        }
        return f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    else:
        raise ValueError(f"Unsupported provider: {provider}")


async def exchange_google_code(
    code: str,
    redirect_uri: str,
    client: Optional[httpx.AsyncClient] = None,
) -> OAuthUserInfo:
    """Exchange code with Google and fetch user info."""
    token_url = "https://oauth2.googleapis.com/token"
    userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"

    close_client = False
    if client is None:
        client = httpx.AsyncClient(timeout=10.0)
        close_client = True

    try:
        token_resp = await client.post(
            token_url,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise ValueError("Failed to retrieve access token from Google")

        user_resp = await client.get(
            userinfo_url,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_data = user_resp.json()

        return OAuthUserInfo(
            provider="google",
            provider_user_id=str(user_data["sub"]),
            email=user_data.get("email"),
            email_verified=bool(user_data.get("email_verified", False)),
            full_name=user_data.get("name"),
            avatar_url=user_data.get("picture"),
        )
    finally:
        if close_client:
            await client.aclose()


async def exchange_github_code(
    code: str,
    redirect_uri: str,
    client: Optional[httpx.AsyncClient] = None,
) -> OAuthUserInfo:
    """Exchange code with GitHub and fetch user + verified primary email."""
    token_url = "https://github.com/login/oauth/access_token"
    user_url = "https://api.github.com/user"
    emails_url = "https://api.github.com/user/emails"

    close_client = False
    if client is None:
        client = httpx.AsyncClient(timeout=10.0)
        close_client = True

    try:
        token_resp = await client.post(
            token_url,
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise ValueError("Failed to retrieve access token from GitHub")

        auth_headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github.v3+json",
        }

        user_resp = await client.get(user_url, headers=auth_headers)
        user_data = user_resp.json()

        # Fetch emails to verify primary & verified email
        emails_resp = await client.get(emails_url, headers=auth_headers)
        emails_data = emails_resp.json()

        verified_email: Optional[str] = None
        is_verified = False

        if isinstance(emails_data, list):
            for item in emails_data:
                if item.get("primary") is True and item.get("verified") is True:
                    verified_email = item.get("email")
                    is_verified = True
                    break

        # Fallback to user email if no primary verified email found (will be marked unverified)
        if not verified_email:
            verified_email = user_data.get("email")
            is_verified = False

        return OAuthUserInfo(
            provider="github",
            provider_user_id=str(user_data["id"]),
            email=verified_email,
            email_verified=is_verified,
            full_name=user_data.get("name") or user_data.get("login"),
            avatar_url=user_data.get("avatar_url"),
        )
    finally:
        if close_client:
            await client.aclose()
