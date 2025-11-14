from __future__ import annotations
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db, Base, engine
from models import User, VaultEntry
from schemas import *
from auth import create_user, authenticate_user, create_access_token, get_current_user, get_kmix_header
from crypto import aes_gcm_encrypt, aes_gcm_decrypt, gen_password, pwd_score, b64u

# --- NUEVAS IMPORTACIONES ---
import numpy as np
from face_rec import (
    get_arcface_embedding_from_bytes, 
    cosine_similarity, 
    data_url_to_bytes
)
# --- FIN NUEVAS IMPORTACIONES ---

app = FastAPI(title="Password Manager API (SQLite)")

# CORS abierto para pruebas locales
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"]
)

# Crear tablas en arranque
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

# ---------- Auth ----------
@app.post("/auth/register", response_model=TokenOut)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    # La lógica de creación de usuario (incluyendo rostro)
    # se movió a auth.py
    u = create_user(db, data)
    token = create_access_token(u.id, u.email)
    return {"access_token": token}

@app.post("/auth/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    u = authenticate_user(db, data)
    token = create_access_token(u.id, u.email)
    return {"access_token": token}

@app.get("/auth/me", response_model=MeOut)
def me(user: User = Depends(get_current_user)):
    return {"email": user.email, "salt_user_b64u": b64u(user.salt_user)}

@app.post("/tools/generate", response_model=PwGenOut)
def generate_pw(cfg: PwGenIn):
    pw = gen_password(cfg.length, cfg.use_symbols)
    s, l, sug = pwd_score(pw)
    return {"password": pw, "score": s, "label": l, "suggestions": sug}

@app.post("/tools/score", response_model=PwScoreOut)
def score_pw(data: PwScoreIn):
    s, l, sug = pwd_score(data.password)
    return {"score": s, "label": l, "suggestions": sug}


# ---------- Vault ----------

# --- NUEVO ENDPOINT DE VERIFICACIÓN FACIAL ---
@app.post("/vault/verify-face", response_model=VerifyFaceOut)
def verify_face_for_vault(
    data: VerifyFaceIn,
    user: User = Depends(get_current_user)
):
    """
    Verifica la foto del usuario contra su embedding guardado.
    Esto se llama ANTES de descifrar una contraseña.
    """
    if not user.face_embedding:
        raise HTTPException(400, "El usuario no tiene un rostro registrado. No se puede verificar.")
    
    try:
        img_bytes = data_url_to_bytes(data.image_data_url)
        new_emb = get_arcface_embedding_from_bytes(img_bytes)
        
        if new_emb is None:
            return {"verified": False, "similarity": 0.0}
        
        # Cargar el embedding guardado
        stored_emb = np.frombuffer(user.face_embedding, dtype=np.float32)
        
        sim = cosine_similarity(stored_emb, new_emb)
        threshold = 0.45  # Umbral de confianza
        
        if sim >= threshold:
            return {"verified": True, "similarity": float(sim)}
        else:
            return {"verified": False, "similarity": float(sim)}
            
    except Exception as e:
        print(f"Error durante la verificación facial: {e}")
        return {"verified": False, "similarity": 0.0}
# --- FIN NUEVO ENDPOINT ---


@app.post("/vault", response_model=EntryView)
def create_entry(
    data: EntryCreate,
    user: User = Depends(get_current_user),
    kmix: bytes = Depends(get_kmix_header),
    db: Session = Depends(get_db),
):
    secret_bytes = data.secret_plain.encode("utf-8")
    iv, ct, tag = aes_gcm_encrypt(kmix, secret_bytes)
    entry = VaultEntry(
        user_id=user.id, title=data.title, username=data.username, url=data.url, note=data.note,
        iv=iv, ciphertext=ct, tag=tag
    )
    db.add(entry); db.commit(); db.refresh(entry)
    del secret_bytes
    return EntryView(id=entry.id, title=entry.title, username=entry.username, url=entry.url, note=entry.note, secret_plain=None)

@app.get("/vault", response_model=list[EntryView])
def list_entries(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(VaultEntry).filter_by(user_id=user.id).order_by(VaultEntry.updated_at.desc()).all()
    # Nota: AHORA se requiere verificación facial para VER el secreto, 
    # por lo que este endpoint NO devuelve el secreto.
    return [EntryView(id=r.id, title=r.title, username=r.username, url=r.url, note=r.note) for r in rows]

@app.get("/vault/{entry_id}", response_model=EntryView)
def get_entry(
    entry_id: int, 
    user: User = Depends(get_current_user), 
    kmix: bytes = Depends(get_kmix_header), 
    db: Session = Depends(get_db)
):
    """
    Descifra y devuelve un secreto.
    IMPORTANTE: El frontend DEBE llamar a /vault/verify-face ANTES de llamar aquí.
    Este endpoint asume que la verificación facial ya fue exitosa.
    """
    r = db.query(VaultEntry).filter_by(id=entry_id, user_id=user.id).first()
    if not r:
        raise HTTPException(404, "No existe")
    
    # La verificación facial se hace en el frontend ANTES de llamar a este endpoint.
    # Si la app está bien hecha, este endpoint solo se llama tras una 
    # verificación facial exitosa.
    try:
        secret = aes_gcm_decrypt(kmix, r.iv, r.ciphertext, r.tag).decode("utf-8")
    except Exception:
        raise HTTPException(400, "Error al descifrar. K_mix incorrecto.")

    return EntryView(id=r.id, title=r.title, username=r.username, url=r.url, note=r.note, secret_plain=secret)

@app.put("/vault/{entry_id}", response_model=EntryView)
def update_entry(entry_id: int, data: EntryUpdate, user: User = Depends(get_current_user), kmix: bytes = Depends(get_kmix_header), db: Session = Depends(get_db)):
    r = db.query(VaultEntry).filter_by(id=entry_id, user_id=user.id).first()
    if not r:
        raise HTTPException(404, "No existe")
    if data.title is not None: r.title = data.title
    if data.username is not None: r.username = data.username
    if data.url is not None: r.url = data.url
    if data.note is not None: r.note = data.note
    if data.secret_plain is not None:
        secret_bytes = data.secret_plain.encode("utf-8")
        iv, ct, tag = aes_gcm_encrypt(kmix, secret_bytes)
        r.iv, r.ciphertext, r.tag = iv, ct, tag
        del secret_bytes
    db.commit(); db.refresh(r)
    return EntryView(id=r.id, title=r.title, username=r.username, url=r.url, note=r.note)

@app.delete("/vault/{entry_id}")
def delete_entry(entry_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = db.query(VaultEntry).filter_by(id=entry_id, user_id=user.id).first()
    if not r:
        raise HTTPException(404, "No existe")
    db.delete(r); db.commit()
    return {"ok": True}