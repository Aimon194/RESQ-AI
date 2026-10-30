import hashlib

def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()

def matches_recorded_hash(content: bytes,recorded: str) -> bool:
    return sha256_bytes(content)==recorded
