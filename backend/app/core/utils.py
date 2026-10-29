import re
import unicodedata


def generate_slug(text: str) -> str:
    """Generate clean URL-friendly slug from text, handling Vietnamese characters.
    Example: 'Điện thoại & Phụ kiện 2026' -> 'dien-thoai-phu-kien-2026'
    """
    if not text:
        return ""

    # Replace 'đ' and 'Đ' before decomposition because unicodedata does not decompose them
    normalized = text.replace("đ", "d").replace("Đ", "d")

    # Decompose unicode characters into base char and diacritical marks
    nfkd_form = unicodedata.normalize("NFKD", normalized)
    ascii_text = "".join([c for c in nfkd_form if not unicodedata.combining(c)])

    # Convert to lowercase
    slug = ascii_text.lower()

    # Replace non-alphanumeric characters with hyphens
    slug = re.sub(r"[^a-z0-9]+", "-", slug)

    # Strip leading and trailing hyphens
    slug = slug.strip("-")

    return slug

