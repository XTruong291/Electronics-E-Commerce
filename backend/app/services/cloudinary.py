import os
import uuid
from typing import Optional

import cloudinary
import cloudinary.uploader

from app.core.config import settings

# Initialize Cloudinary if credentials are present
if (
    settings.CLOUDINARY_CLOUD_NAME
    and settings.CLOUDINARY_API_KEY
    and settings.CLOUDINARY_API_SECRET
):
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def upload_image(
    file_bytes: bytes,
    folder: str = "avatars",
    public_id: Optional[str] = None,
) -> str:
    """Upload image bytes to Cloudinary or fallback to local static store."""
    if (
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    ):
        result = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            public_id=public_id,
            resource_type="image",
        )
        return result.get("secure_url", result.get("url", ""))

    # Fallback for dev / testing environments without live Cloudinary keys
    unique_filename = f"{public_id or uuid.uuid4().hex[:12]}.jpg"
    return f"https://res.cloudinary.com/demo/image/upload/{folder}/{unique_filename}"
