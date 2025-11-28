# face_rec.py
from __future__ import annotations
from typing import Optional
import base64
import re
import cv2
import numpy as np
from insightface.app import FaceAnalysis

_face_app: FaceAnalysis | None = None


def _get_face_app() -> FaceAnalysis:
    """
    Inicializa (una sola vez) el modelo buffalo_l de InsightFace.
    """
    global _face_app
    if _face_app is None:
        print("Cargando modelo de reconocimiento facial (la primera vez puede tardar)...")
        app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"] 
        )
        app.prepare(ctx_id=0, det_size=(640, 640)) 
        _face_app = app
        print("Modelo facial cargado.")
    return _face_app


def get_arcface_embedding_from_bytes(image_bytes: bytes) -> Optional[np.ndarray]:
    """
    Recibe bytes de imagen (JPEG/PNG) y devuelve el embedding ArcFace (np.ndarray float32)
    o None si no se detecta rostro.
    """
    if not image_bytes:
        return None

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return None

    app = _get_face_app()
    faces = app.get(img)
    if len(faces) == 0:
        return None

    # Elegimos la cara más grande (por si hay varias)
    faces.sort(
        key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
        reverse=True,
    )
    face = faces[0]
    emb = face.normed_embedding.astype(np.float32)
    return emb


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    Similaridad coseno entre dos embeddings.
    """
    a = a / np.linalg.norm(a)
    b = b / np.linalg.norm(b)
    return float(np.dot(a, b))

def data_url_to_bytes(data_url: str) -> bytes:
    """
    Convierte un DataURL (ej. 'data:image/jpeg;base64,...') en bytes puros.
    """
    try:
        header, data = data_url.split(",", 1)
        return base64.b64decode(data)
    except Exception as e:
        print(f"Error decodificando DataURL: {e}")
        raise ValueError("DataURL inválido")