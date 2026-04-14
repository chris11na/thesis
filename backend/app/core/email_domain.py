def normalize_domain(domain: str) -> str:
    return domain.strip().lower()


def email_domain(email: str) -> str | None:
    parts = email.strip().lower().split("@")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        return None
    return parts[1].strip()
