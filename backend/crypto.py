from __future__ import annotations
import base64, os, hmac, hashlib
from hashlib import pbkdf2_hmac
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from zxcvbn import zxcvbn

# ---------------- Base64url helpers ----------------

def b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

def ub64u(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))

# ---------------- KDFs ----------------

def pbkdf2_key(password: str, salt: bytes, iterations: int = 210_000, dklen: int = 32) -> bytes:
    return pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations, dklen=dklen)



def hkdf_sha256(ikm: bytes, salt: bytes, info: bytes, L: int = 32) -> bytes:
    prk = hmac.new(salt, ikm, hashlib.sha256).digest()
    T = b""; okm = b""; c = 0
    while len(okm) < L:
        c += 1
        T = hmac.new(prk, T + info + bytes([c]), hashlib.sha256).digest()
        okm += T
    return okm[:L]

# ---------------- AES‑GCM (AEAD) ----------------

def aes_gcm_encrypt(key32: bytes, plaintext: bytes, aad: bytes | None = None) -> tuple[bytes, bytes, bytes]:
    if len(key32) != 32:
        raise ValueError("AES-256 key must be 32 bytes")
    iv = os.urandom(12)
    aead = AESGCM(key32)
    ct = aead.encrypt(iv, plaintext, aad)  # devuelve ct||tag
    return iv, ct[:-16], ct[-16:]


def aes_gcm_decrypt(key32: bytes, iv: bytes, ciphertext: bytes, tag: bytes, aad: bytes | None = None) -> bytes:
    if len(iv) != 12:
        raise ValueError("AES-GCM IV must be 12 bytes")
    aead = AESGCM(key32)
    return aead.decrypt(iv, ciphertext + tag, aad)

# ---------------- Password utilities ----------------
ALPH_LO = "abcdefghjkmnpqrstuvwxyz"     
ALPH_UP = "ABCDEFGHJKMNPQRSTUVWXYZ"
ALPH_DI = "23456789"                  
ALPH_SY = "!@#$%^&*()-_=+[]{}:,.?/"

import secrets

def gen_password(length: int = 20, use_symbols: bool = True) -> str:
    alphabet = ALPH_LO + ALPH_UP + ALPH_DI + (ALPH_SY if use_symbols else "")
    if length < 8:
        length = 8
    req = [secrets.choice(ALPH_LO), secrets.choice(ALPH_UP), secrets.choice(ALPH_DI)]
    if use_symbols:
        req.append(secrets.choice(ALPH_SY))
    while len(req) < length:
        req.append(secrets.choice(alphabet))
    secrets.SystemRandom().shuffle(req)
    return "".join(req[:length])


def pwd_score(password: str):
    result = zxcvbn(password)
    score = result["score"] + 1
    label = ["muy débil", "débil", "moderada", "fuerte", "muy fuerte"][result["score"]]
    suggestions = result["feedback"]["suggestions"]
    return score, label, suggestions

