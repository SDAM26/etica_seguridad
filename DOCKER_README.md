# 🐳 Docker - Guía de Inicio Rápido

## 📋 Pre-requisitos

- **Docker** y **Docker Compose** instalados
- Sistema Linux, macOS o **Windows con WSL2** (requerido para reconocimiento facial)
- Al menos 2GB de espacio en disco (imagen + modelo)

## 🚀 Inicio Rápido

### 1. Construir y ejecutar

```bash
docker-compose up --build
```

⏱️ **Nota**: La primera vez tomará **5-10 minutos** debido a:
- Compilación de dependencias (numpy, scipy, cryptography)
- Descarga del modelo de reconocimiento facial buffalo_l (~100MB)

### 2. Acceder a la aplicación

Una vez que veas el mensaje `Application startup complete`:

- **Frontend**: http://localhost:8080
- **API Docs**: http://localhost:8080/docs
- **ReDoc**: http://localhost:8080/redoc

### 3. Detener

```bash
# Detener servicios (Ctrl+C si está en foreground)
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v
```

---

## 📁 Estructura de Volúmenes

El contenedor utiliza dos volúmenes:

1. **`./data`** → Base de datos SQLite
   - Persiste las cuentas de usuario y contraseñas cifradas
   - Se crea automáticamente en la primera ejecución

2. **`insightface-models`** → Modelo de reconocimiento facial
   - Caché del modelo buffalo_l (~100MB)
   - Evita re-descarga en cada rebuild

---

## ⚙️ Configuración

### Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Edita `.env`:

```bash
# Secreto para firmar JWT (IMPORTANTE: cambiar en producción)
JWT_SECRET=tu_secreto_super_seguro_aqui

# Expiración del token (en minutos)
JWT_EXPIRE_MIN=120

# Puerto (opcional, default: 8080)
PORT=8080
```

### Cambiar puerto

Opción 1: Modificar `docker-compose.yml`:
```yaml
ports:
  - "3000:80"  # Cambia 8080 por el puerto deseado
```

Opción 2: Usar variable de entorno:
```bash
PORT=3000 docker-compose up
```

---

## 🔧 Comandos Útiles

### Ver logs en tiempo real
```bash
docker-compose logs -f
```

### Reiniciar servicios
```bash
docker-compose restart
```

### Ejecutar comando dentro del contenedor
```bash
docker-compose exec password-manager bash
```

### Ver estado de servicios
```bash
docker-compose ps
```

### Limpiar todo (incluye volúmenes)
```bash
docker-compose down -v
docker system prune -a
```

---

## 🐛 Solución de Problemas

### Error: "No module named 'database'"

**Causa**: Problema con el WORKDIR en el Dockerfile.

**Solución**: Reconstruir la imagen:
```bash
docker-compose down
docker-compose up --build
```

### Error: "Cannot download buffalo_l model"

**Causa**: Problema de conectividad o permisos.

**Soluciones**:
1. Verificar conexión a internet
2. Limpiar caché de InsightFace:
   ```bash
   docker-compose down -v
   docker volume rm etica_seguridad_insightface-models
   docker-compose up --build
   ```

### Error: "Port 8080 already in use"

**Solución**: Cambiar el puerto en `docker-compose.yml`:
```yaml
ports:
  - "8081:80"  # Usa otro puerto disponible
```

### El reconocimiento facial no funciona

**Verificaciones**:
1. Asegúrate de estar usando **Linux o WSL2** (no funciona en Windows nativo)
2. Verifica que el navegador tenga permisos de cámara
3. Usa **HTTPS** o **localhost** (getUserMedia solo funciona en contextos seguros)

### Logs muestran "Face detection failed"

**Causas comunes**:
- Foto muy oscura o borrosa
- Múltiples caras en la imagen
- Cara muy pequeña en el frame

**Soluciones**:
- Tomar foto con buena iluminación
- Centrar tu rostro en el frame
- Acercarse a la cámara

---

## 🔐 Seguridad en Producción

### ⚠️ IMPORTANTE: Antes de desplegar

1. **Cambiar JWT_SECRET**:
   ```bash
   # Generar secreto aleatorio
   openssl rand -hex 32
   ```
   Agregar a `.env`:
   ```
   JWT_SECRET=<secreto_generado>
   ```

2. **Configurar HTTPS** (obligatorio para webcam):
   - Usa un reverse proxy (Nginx, Traefik, Caddy)
   - Obtén certificado SSL (Let's Encrypt)

3. **Limitar CORS** en `backend/app.py`:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://tudominio.com"],  # NO uses "*"
       allow_credentials=True,
       allow_methods=["GET", "POST", "PUT", "DELETE"],
       allow_headers=["*"]
   )
   ```

4. **Configurar respaldos**:
   ```bash
   # Respaldar base de datos
   docker cp password-manager:/app/data/server.db ./backup-$(date +%Y%m%d).db
   ```

5. **Usar Docker secrets** (en lugar de .env):
   ```yaml
   secrets:
     jwt_secret:
       file: ./secrets/jwt_secret.txt
   ```

---

## 📊 Información Técnica

### Arquitectura del contenedor

```
┌─────────────────────────────────────┐
│  Container: password-manager         │
│                                      │
│  ┌────────────┐     ┌─────────────┐ │
│  │   Nginx    │────▶│   FastAPI   │ │
│  │  (Port 80) │     │ (Port 8000) │ │
│  └────────────┘     └─────────────┘ │
│                                      │
│  Volumes:                            │
│  • /app/data (SQLite)                │
│  • /root/.insightface (modelo)      │
└─────────────────────────────────────┘
```

### Tecnologías incluidas

- **Base**: Python 3.12 Slim (Debian Bookworm)
- **Web Server**: Nginx 1.22
- **Framework**: FastAPI + Uvicorn
- **ML**: InsightFace (buffalo_l), OpenCV
- **Cifrado**: cryptography (AES-256-GCM, PBKDF2)
- **Base de datos**: SQLite 3

### Tamaño de la imagen

- **Comprimida**: ~600MB
- **Descomprimida**: ~1.5GB (incluye modelo buffalo_l)

### Recursos recomendados

- **CPU**: 2 cores mínimo
- **RAM**: 1GB mínimo (2GB recomendado)
- **Disco**: 3GB disponibles

---

## 🔄 Actualizar la aplicación

### Actualizar código sin perder datos

```bash
# 1. Detener contenedor
docker-compose down

# 2. Actualizar código (git pull, etc.)
git pull origin main

# 3. Reconstruir imagen
docker-compose up --build

# La base de datos en ./data se mantiene intacta
```

### Migrar a otra máquina

```bash
# Máquina origen
tar -czf backup.tar.gz data/ docker-compose.yml .env

# Máquina destino
tar -xzf backup.tar.gz
docker-compose up -d
```

---

## 📞 Soporte

Si encuentras problemas:

1. Verifica los logs: `docker-compose logs -f`
2. Revisa que Docker esté usando **WSL2** (Windows) o **Linux**
3. Asegúrate de tener suficiente espacio en disco
4. Verifica que el puerto 8080 esté disponible

---

## 📄 Licencia

Este proyecto es de uso educativo. Consulta LICENSE para más detalles.
