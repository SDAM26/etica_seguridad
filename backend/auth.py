from __future__ import annotations
import time, os
import jwt
from passlib.hash import pbkdf2_sha256
from fastapi import HTTPException, status, Depends, Header
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import RegisterIn, LoginIn
from crypto import b64u, ub64u

JWT_SECRET = os.environ.get("JWT_SECRET", "dev_secret_change_me")
JWT_EXPIRE_MIN = int(os.environ.get("JWT_EXPIRE_MIN", "120"))

def _randbytes(n=32) -> bytes:
    return os.urandom(n)

def hash_password(password: str, salt_auth: bytes) -> bytes:
    return pbkdf2_sha256.using(rounds=210_000, salt=salt_auth).hash(password).encode("utf-8")

def verify_password(password: str, salt_auth: bytes, pwd_hash: bytes) -> bool:
    return pbkdf2_sha256.using(rounds=210_000, salt=salt_auth).verify(password, pwd_hash.decode("utf-8"))

def create_user(db: Session, data: RegisterIn) -> User:
    if db.query(User).filter_by(email=data.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email ya registrado")
    salt_auth = _randbytes(16)
    salt_user = _randbytes(16)
    pwd_hash = hash_password(data.password, salt_auth)
    u = User(email=data.email.lower(), pwd_hash=pwd_hash, salt_auth=salt_auth, salt_user=salt_user)
    db.add(u); db.commit(); db.refresh(u)
    return u

def authenticate_user(db: Session, data: LoginIn) -> User:
    u = db.query(User).filter_by(email=data.email.lower()).first()
    if not u or not verify_password(data.password, u.salt_auth, u.pwd_hash):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    return u

def create_access_token(user_id: int, email: str) -> str:
    now = int(time.time())
    payload = {"sub": str(user_id), "email": email, "iat": now, "exp": now + 60*JWT_EXPIRE_MIN}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def get_current_user(db: Session = Depends(get_db), authorization: str = Header(...)):
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Falta token")
    token = authorization.split()[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token inválido/expirado")
    user = db.query(User).get(int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    return user

def get_kmix_header(x_kmix_b64u: str = Header(...)) -> bytes:
    try:
        kmix = ub64u(x_kmix_b64u)
        if len(kmix) != 32:
            raise ValueError
        return kmix
    except Exception:
        raise HTTPException(status_code=400, detail="X-Kmix-B64u inválido")
