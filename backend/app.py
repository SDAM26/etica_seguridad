from __future__ import annotations
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db, Base, engine
from models import User, VaultEntry
from schemas import *
from auth import create_user, authenticate_user, create_access_token, get_current_user, get_kmix_header
from crypto import aes_gcm_encrypt, aes_gcm_decrypt, gen_password, pwd_score, b64u
import json
import logging

# --- NUEVAS IMPORTACIONES ---
import numpy as np
from face_rec import (
    get_arcface_embedding_from_bytes,
    cosine_similarity,
    data_url_to_bytes
)
# --- FIN NUEVAS IMPORTACIONES ---

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
        logger.warning(f"Verificación facial fallida: Usuario sin embedding registrado - {user.email}")
        raise HTTPException(400, "El usuario no tiene un rostro registrado. No se puede verificar.")

    try:
        img_bytes = data_url_to_bytes(data.image_data_url)
        new_emb = get_arcface_embedding_from_bytes(img_bytes)

        if new_emb is None:
            logger.warning(f"Verificación facial fallida: No se detectó rostro - {user.email}")
            return {"verified": False, "similarity": 0.0}

        # Cargar el embedding guardado
        stored_emb = np.frombuffer(user.face_embedding, dtype=np.float32)

        sim = cosine_similarity(stored_emb, new_emb)
        threshold = 0.45  # Umbral de confianza

        if sim >= threshold:
            logger.info(f"Verificación facial exitosa: {user.email} (similaridad: {sim:.3f})")
            return {"verified": True, "similarity": float(sim)}
        else:
            logger.warning(f"Verificación facial fallida: Similaridad insuficiente - {user.email} (similaridad: {sim:.3f}, threshold: {threshold})")
            return {"verified": False, "similarity": float(sim)}

    except Exception as e:
        logger.error(f"Error durante verificación facial para {user.email}: {str(e)}")
        return {"verified": False, "similarity": 0.0}
# --- FIN NUEVO ENDPOINT ---


@app.post("/vault", response_model=EntryView)
def create_entry(
    data: EntryCreate,
    user: User = Depends(get_current_user),
    kmix: bytes = Depends(get_kmix_header),
    db: Session = Depends(get_db),
):
    # Cifrar TODO el contenido como JSON
    entry_data = {
        "title": data.title,
        "username": data.username,
        "url": data.url,
        "note": data.note,
        "secret_plain": data.secret_plain
    }
    json_bytes = json.dumps(entry_data).encode("utf-8")
    iv, ct, tag = aes_gcm_encrypt(kmix, json_bytes)

    entry = VaultEntry(
        user_id=user.id,
        iv=iv, ciphertext=ct, tag=tag
    )
    db.add(entry); db.commit(); db.refresh(entry)
    del json_bytes
    logger.info(f"Entrada creada: ID={entry.id}, Usuario={user.email}, Título={data.title}")
    # No devolvemos ningún dato sensible, todo está cifrado
    return EntryView(id=entry.id)

@app.get("/vault", response_model=list[EntryView])
def list_entries(user: User = Depends(get_current_user), kmix: bytes = Depends(get_kmix_header), db: Session = Depends(get_db)):
    rows = db.query(VaultEntry).filter_by(user_id=user.id).order_by(VaultEntry.updated_at.desc()).all()
    # Descifrar cada entrada para mostrar título (pero no el secret)
    result = []
    for r in rows:
        try:
            json_bytes = aes_gcm_decrypt(kmix, r.iv, r.ciphertext, r.tag)
            entry_data = json.loads(json_bytes.decode("utf-8"))
            result.append(EntryView(
                id=r.id,
                title=entry_data.get("title"),
                username=entry_data.get("username"),
                url=entry_data.get("url"),
                note=entry_data.get("note")
            ))
        except Exception:
            # Si falla el descifrado, saltamos esta entrada
            continue
    return result

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
        json_bytes = aes_gcm_decrypt(kmix, r.iv, r.ciphertext, r.tag)
        entry_data = json.loads(json_bytes.decode("utf-8"))
    except Exception:
        raise HTTPException(400, "Error al descifrar. K_mix incorrecto.")

    return EntryView(
        id=r.id,
        title=entry_data.get("title"),
        username=entry_data.get("username"),
        url=entry_data.get("url"),
        note=entry_data.get("note"),
        secret_plain=entry_data.get("secret_plain")
    )

@app.put("/vault/{entry_id}", response_model=EntryView)
def update_entry(entry_id: int, data: EntryUpdate, user: User = Depends(get_current_user), kmix: bytes = Depends(get_kmix_header), db: Session = Depends(get_db)):
    r = db.query(VaultEntry).filter_by(id=entry_id, user_id=user.id).first()
    if not r:
        logger.warning(f"Actualización fallida: Entrada no encontrada - ID={entry_id}, Usuario={user.email}")
        raise HTTPException(404, "No existe")

    # Descifrar el contenido actual
    try:
        json_bytes = aes_gcm_decrypt(kmix, r.iv, r.ciphertext, r.tag)
        entry_data = json.loads(json_bytes.decode("utf-8"))
    except Exception:
        logger.error(f"Actualización fallida: Error al descifrar - ID={entry_id}, Usuario={user.email}")
        raise HTTPException(400, "Error al descifrar. K_mix incorrecto.")

    # Actualizar solo los campos que se enviaron
    if data.title is not None: entry_data["title"] = data.title
    if data.username is not None: entry_data["username"] = data.username
    if data.url is not None: entry_data["url"] = data.url
    if data.note is not None: entry_data["note"] = data.note
    if data.secret_plain is not None: entry_data["secret_plain"] = data.secret_plain

    # Volver a cifrar todo
    json_bytes = json.dumps(entry_data).encode("utf-8")
    iv, ct, tag = aes_gcm_encrypt(kmix, json_bytes)
    r.iv, r.ciphertext, r.tag = iv, ct, tag
    del json_bytes

    db.commit(); db.refresh(r)
    logger.info(f"Entrada actualizada: ID={entry_id}, Usuario={user.email}, Título={entry_data.get('title')}")
    return EntryView(id=r.id)

@app.delete("/vault/{entry_id}")
def delete_entry(entry_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = db.query(VaultEntry).filter_by(id=entry_id, user_id=user.id).first()
    if not r:
        logger.warning(f"Eliminación fallida: Entrada no encontrada - ID={entry_id}, Usuario={user.email}")
        raise HTTPException(404, "No existe")
    db.delete(r); db.commit()
    logger.info(f"Entrada eliminada: ID={entry_id}, Usuario={user.email}")
    return {"ok": True}