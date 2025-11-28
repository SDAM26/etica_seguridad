# =============================================================================
# Dockerfile para Password Manager con Reconocimiento Facial
# =============================================================================
# Este Dockerfile crea una imagen optimizada para Linux que incluye:
# - FastAPI backend con Uvicorn
# - InsightFace para reconocimiento facial (requiere Linux)
# - OpenCV y dependencias de procesamiento de imágenes
# - Nginx para servir el frontend estático
# =============================================================================

FROM python:3.12-slim-bookworm as builder

# Instalar dependencias de compilación
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    cmake \
    git \
    libssl-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements y compilar wheels
WORKDIR /build
COPY requirements.txt .

# Compilar todas las dependencias como wheels para acelerar instalación
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# =============================================================================
# Stage 2: Runtime
# =============================================================================
FROM python:3.12-slim-bookworm

# Metadata
LABEL maintainer="Password Manager"
LABEL description="Password Manager con cifrado E2E y reconocimiento facial"

# Instalar dependencias de runtime para OpenCV e InsightFace
RUN apt-get update && apt-get install -y --no-install-recommends \
    # OpenCV dependencies
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    # Nginx para servir frontend
    nginx \
    # Utilidades
    curl \
    && rm -rf /var/lib/apt/lists/*

# Crear usuario no-root para seguridad
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app /app/data /root/.insightface && \
    chown -R appuser:appuser /app

# Copiar wheels del builder y instalar
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir /wheels/* && rm -rf /wheels

# Establecer directorio de trabajo
WORKDIR /app

# Copiar código del proyecto
COPY --chown=appuser:appuser backend/ /app/backend/
COPY --chown=appuser:appuser frontend/ /app/frontend/
COPY --chown=appuser:appuser requirements.txt /app/

# Configurar Nginx para servir frontend con HTTP y HTTPS
RUN rm /etc/nginx/sites-enabled/default
COPY <<EOF /etc/nginx/sites-enabled/password-manager
# HTTP (redirección opcional a HTTPS, comentar si se desea HTTP+HTTPS simultáneos)
server {
    listen 80;
    server_name _;

    # Proxy para API del backend (deben ir ANTES de location /)
    location /auth {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /vault {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /tools {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /docs {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /redoc {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /openapi.json {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Servir frontend estático (debe ir AL FINAL)
    location / {
        root /app/frontend;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}

# HTTPS (requiere certificados SSL en /app/ssl/)
server {
    listen 443 ssl;
    server_name _;

    # Certificados SSL autofirmados
    ssl_certificate /app/ssl/server.crt;
    ssl_certificate_key /app/ssl/server.key;

    # Configuración SSL moderna
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Proxy para API del backend (deben ir ANTES de location /)
    location /auth {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /vault {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /tools {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /docs {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /redoc {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /openapi.json {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Servir frontend estático (debe ir AL FINAL)
    location / {
        root /app/frontend;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

# Crear script de inicio con sintaxis correcta
RUN printf '#!/bin/bash\nset -e\n\necho "=============================================="\necho "  Password Manager - Iniciando servicios"\necho "=============================================="\n\nnginx\n\nsleep 2\n\ncd /app/backend\n\necho ""\necho "✅ Servidor listo en:"\necho "   HTTP:  http://localhost"\necho "   HTTPS: https://localhost (certificado autofirmado)"\necho "   API Docs: http://localhost/docs"\necho ""\n\nexec uvicorn app:app --host 0.0.0.0 --port 8000 --log-level info\n' > /app/start.sh && \
    chmod +x /app/start.sh

# Crear directorio para base de datos persistente
VOLUME ["/app/data"]

# Volume para cachear modelo de InsightFace (evita re-descarga)
VOLUME ["/root/.insightface"]

# Exponer puertos 80 (HTTP) y 443 (HTTPS)
EXPOSE 80 443

# Variables de entorno
ENV PYTHONUNBUFFERED=1
ENV DB_PATH=/app/data/server.db
ENV JWT_SECRET=change_me_in_production_please
ENV JWT_EXPIRE_MIN=120

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost/docs || exit 1

# Ejecutar como root (necesario para nginx)
# En producción, considerar separar nginx en otro contenedor
CMD ["/app/start.sh"]
