from passlib.context import CryptContext
from passlib.exc import UnknownHashError


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(plain_password, password_hash)
    except UnknownHashError:
        return False


def is_supported_password_hash(password_hash: str) -> bool:
    return pwd_context.identify(password_hash) is not None
