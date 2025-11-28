from __future__ import annotations
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer, String, LargeBinary, DateTime, ForeignKey, Text, func
from database import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    pwd_hash: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    salt_auth: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    salt_user: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    
    # --- NUEVO CAMPO ---
    # Almacena el embedding ArcFace del usuario.
    face_embedding: Mapped[bytes | None] = mapped_column(LargeBinary)
    # --- FIN NUEVO CAMPO ---
    
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    entries: Mapped[list["VaultEntry"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class VaultEntry(Base):
    __tablename__ = "vault_entries"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # TODO el contenido cifrado (title, username, url, note, secret) se guarda en ciphertext
    # Formato: JSON cifrado con AES-GCM que contiene {title, username, url, note, secret_plain}
    iv: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    ciphertext: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    tag: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship(back_populates="entries")