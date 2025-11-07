from __future__ import annotations
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

class RegisterIn(BaseModel):
    email: EmailStr
    password: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class MeOut(BaseModel):
    email: EmailStr
    salt_user_b64u: str

class EntryCreate(BaseModel):
    title: str
    username: Optional[str] = None
    url: Optional[str] = None
    note: Optional[str] = None
    secret_plain: str

class EntryView(BaseModel):
    id: int
    title: str
    username: Optional[str]
    url: Optional[str]
    note: Optional[str]
    secret_plain: Optional[str] = None

class EntryUpdate(BaseModel):
    title: Optional[str] = None
    username: Optional[str] = None
    url: Optional[str] = None
    note: Optional[str] = None
    secret_plain: Optional[str] = None

class PwGenIn(BaseModel):
    length: int = Field(ge=8, le=128, default=20)
    use_symbols: bool = True

class PwGenOut(BaseModel):
    password: str
    score: int
    label: str
    suggestions: Optional[List[str]] = None   # <-- añadir


class PwScoreIn(BaseModel):
    password: str

class PwScoreOut(BaseModel):
    score: int
    label: str
    suggestions: Optional[List[str]] = None   # <-- añadir
