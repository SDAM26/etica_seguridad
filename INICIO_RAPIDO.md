# 🚀 Inicio Rápido - Password Manager

## ⚡ 3 Pasos para Empezar

### 1️⃣ Construir y ejecutar

```bash
docker-compose up --build
```

### 2️⃣ Esperar ~5-10 minutos

La primera vez descargará e instalará:
- ✅ Dependencias de Python
- ✅ Modelo de reconocimiento facial (~100MB)

Verás este mensaje cuando esté listo:
```
INFO:     Application startup complete.
```

### 3️⃣ Abrir navegador

Abre: **http://localhost:8080**

---

## 🎯 Primer Uso

### Registrarse

1. Ingresa tu **email** y **contraseña**
2. Haz clic en **"Registrar (con foto)"**
3. Permite acceso a la **cámara**
4. Toma una **foto de tu rostro**
5. ✅ ¡Listo! Ya estás registrado

### Crear tu primera contraseña

1. Ingresa tu **contraseña maestra** (no es la del login)
2. Haz clic en **"Crear Secreto"** (genera un secreto de dispositivo)
3. Ve a **"Mi Vault"**
4. Rellena el formulario:
   - **Título**: Ej. "Gmail"
   - **Usuario**: tu@email.com
   - **Contraseña**: tu_password_segura
5. Haz clic en **"Guardar"**

### Ver una contraseña guardada

1. Haz clic en **"Desbloquear"** en el Vault
2. Toma una **foto de verificación** (reconocimiento facial)
3. Si se verifica ✅, verás tus entradas
4. Haz clic en el **ícono de ojo** para ver detalles

---

## 🛑 Detener

```bash
# Opción 1: Ctrl+C (si está en foreground)

# Opción 2: Desde otra terminal
docker-compose down
```

---

## 📚 Más Información

- **Guía completa**: Ver [DOCKER_README.md](DOCKER_README.md)
- **Documentación técnica**: Ver [README.md](README.md)
- **API Docs**: http://localhost:8080/docs

---

## ❓ Problemas Comunes

### "Port 8080 already in use"

Cambia el puerto en `docker-compose.yml`:
```yaml
ports:
  - "8081:80"  # Usa 8081 en lugar de 8080
```

### "Face detection failed"

- ✅ Asegúrate de tener buena iluminación
- ✅ Centra tu rostro en el frame
- ✅ Evita gafas de sol o máscaras

### No puedo acceder a la cámara

- ✅ Usa **localhost** o **HTTPS** (no IP local)
- ✅ Permite permisos de cámara en el navegador
- ✅ Verifica que otra app no esté usando la cámara

---

¡Disfruta tu Password Manager seguro! 🔒✨
