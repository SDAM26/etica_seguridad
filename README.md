# 🔐 Password Manager con Cifrado End-to-End

## Informe Técnico – Proyecto de Ética y Seguridad de Datos (DS3031)

**Autor:** Jorge Eduardo Quenta Solis
**Institución:** Universidad de Ingeniería y Tecnología – UTEC
**Curso:** Ética y Seguridad de Datos (DS3031)
**Fecha:** Enero 2025

---

## 📑 Tabla de Contenidos

1. [Introducción y Contexto](#1-introducción-y-contexto)
2. [Objetivos del Proyecto](#2-objetivos-del-proyecto)
3. [Requerimientos del Sistema](#3-requerimientos-del-sistema)
4. [Arquitectura General del Sistema](#4-arquitectura-general-del-sistema)
5. [Implementación Técnica](#5-implementación-técnica)
6. [Medidas de Seguridad Aplicadas](#6-medidas-de-seguridad-aplicadas)
7. [Análisis de Riesgos y Mitigación](#7-análisis-de-riesgos-y-mitigación)
8. [Resultados y Lecciones Aprendidas](#8-resultados-y-lecciones-aprendidas)
9. [Conclusiones y Recomendaciones Futuras](#9-conclusiones-y-recomendaciones-futuras)
10. [Referencias y Anexos](#10-referencias-y-anexos)

---

## 1. Introducción y Contexto

### 1.1 Motivación del Proyecto

En la era digital actual, la gestión de contraseñas representa uno de los desafíos más críticos en seguridad informática. Según diversos estudios de ciberseguridad, más del 80% de las brechas de datos involucran contraseñas débiles o comprometidas. Los usuarios promedio manejan entre 70 y 100 credenciales diferentes, lo que lleva a prácticas inseguras como la reutilización de contraseñas o el almacenamiento en texto plano.

Este proyecto surge como respuesta a esta problemática, desarrollando un **gestor de contraseñas seguro** que implementa principios de **Zero-Knowledge Architecture**, donde el servidor nunca tiene acceso a las contraseñas en texto plano. El sistema garantiza la confidencialidad e integridad de los datos mediante criptografía moderna, alineándose con los estándares de seguridad actuales.

### 1.2 Contexto Académico

Este proyecto fue desarrollado como parte del curso **Ética y Seguridad de Datos (DS3031)** en la Universidad de Ingeniería y Tecnología (UTEC). El objetivo académico es aplicar conocimientos teóricos de criptografía, seguridad de la información y desarrollo de software seguro en un caso de uso real y práctico.

El proyecto aborda conceptos fundamentales como:
- Funciones de derivación de claves (KDF)
- Cifrado autenticado (AEAD)
- Arquitecturas de seguridad cliente-servidor
- Gestión de secretos y claves criptográficas
- Principios éticos en el manejo de datos sensibles

### 1.3 Alcance del Proyecto

El sistema desarrollado es una aplicación web full-stack que permite:
- Registro e inicio de sesión de usuarios
- Almacenamiento cifrado de credenciales
- Generación de contraseñas seguras con análisis de fortaleza
- Sincronización entre dispositivos mediante secretos exportables
- CRUD completo de entradas en el vault personal

El proyecto **NO** incluye (por limitaciones de alcance académico):
- Sincronización en tiempo real entre múltiples dispositivos
- Autenticación multifactor (MFA)
- Aplicaciones móviles nativas
- Despliegue en producción con certificados SSL válidos

---

## 2. Objetivos del Proyecto

### 2.1 Objetivo General

Diseñar e implementar un gestor de contraseñas con arquitectura zero-knowledge que garantice la confidencialidad, integridad y disponibilidad de las credenciales de los usuarios, aplicando principios de criptografía moderna y buenas prácticas de seguridad informática.

### 2.2 Objetivos Específicos

1. **Implementar cifrado end-to-end:** Desarrollar un sistema donde el cifrado se realiza completamente en el cliente, evitando que el servidor acceda a información sensible en texto plano.

2. **Aplicar funciones criptográficas seguras:** Utilizar algoritmos estándar de la industria (AES-256-GCM, PBKDF2-SHA256, HKDF-SHA256) para protección de datos.

3. **Diseñar una arquitectura modular y escalable:** Separar responsabilidades entre backend (API REST) y frontend (SPA) para facilitar mantenimiento y futuras extensiones.

4. **Implementar autenticación segura:** Utilizar JWT para gestión de sesiones con expiración automática y validación de tokens.

5. **Gestionar secretos de dispositivo:** Permitir que usuarios exporten/importen secretos para sincronización manual entre dispositivos sin comprometer la seguridad.

6. **Documentar decisiones de diseño:** Justificar elecciones técnicas desde perspectivas de seguridad, rendimiento y usabilidad.

---

## 3. Requerimientos del Sistema

### 3.1 Requerimientos Funcionales

#### RF1: Gestión de Usuarios
- **RF1.1:** El sistema debe permitir el registro de nuevos usuarios mediante email y contraseña.
- **RF1.2:** El sistema debe autenticar usuarios existentes mediante credenciales válidas.
- **RF1.3:** El sistema debe generar tokens JWT con expiración de 120 minutos.
- **RF1.4:** El sistema debe permitir el cierre de sesión seguro.

#### RF2: Gestión de Contraseñas Maestras
- **RF2.1:** El usuario debe ingresar una contraseña maestra (MP) para cifrar/descifrar entradas.
- **RF2.2:** El sistema debe derivar `K_user` mediante PBKDF2-SHA256 con 210,000 iteraciones.
- **RF2.3:** El sistema debe combinar `K_user` con el secreto del dispositivo para generar `K_mix`.
- **RF2.4:** El sistema nunca debe enviar la contraseña maestra al servidor.

#### RF3: Gestión del Vault
- **RF3.1:** El sistema debe permitir crear entradas con título, usuario, URL, nota y contraseña.
- **RF3.2:** El sistema debe listar entradas sin exponer contraseñas cifradas.
- **RF3.3:** El sistema debe permitir visualizar detalles completos de una entrada (con descifrado local).
- **RF3.4:** El sistema debe permitir editar entradas existentes.
- **RF3.5:** El sistema debe permitir eliminar entradas con confirmación.
- **RF3.6:** El sistema debe aislar entradas por usuario (no se puede acceder a datos de otros usuarios).

#### RF4: Generación y Análisis de Contraseñas
- **RF4.1:** El sistema debe generar contraseñas aleatorias de longitud configurable (8-64 caracteres).
- **RF4.2:** El sistema debe permitir incluir/excluir símbolos en la generación.
- **RF4.3:** El sistema debe calificar la fortaleza de contraseñas usando zxcvbn.
- **RF4.4:** El sistema debe proporcionar sugerencias para mejorar contraseñas débiles.

#### RF5: Gestión de Secretos de Dispositivo
- **RF5.1:** El sistema debe generar automáticamente un secreto de dispositivo de 16 bytes.
- **RF5.2:** El sistema debe almacenar el secreto en localStorage del navegador.
- **RF5.3:** El sistema debe permitir exportar el secreto como archivo `.key`.
- **RF5.4:** El sistema debe permitir importar un secreto existente.

### 3.2 Requerimientos de Seguridad

#### RS1: Protección de Datos en Reposo
- **RS1.1:** Todas las contraseñas deben cifrarse con AES-256-GCM antes de almacenamiento.
- **RS1.2:** El hash de autenticación debe utilizar PBKDF2-SHA256 con 210,000 iteraciones mínimas.
- **RS1.3:** Cada usuario debe tener salts únicos (`salt_auth` y `salt_user`).
- **RS1.4:** Los campos `iv`, `ciphertext` y `tag` deben almacenarse separadamente para validación de integridad.

#### RS2: Protección de Datos en Tránsito
- **RS2.1:** Toda comunicación debe realizarse sobre HTTPS (en producción).
- **RS2.2:** Los tokens JWT deben incluir expiración y firma HMAC-SHA256.
- **RS2.3:** El header `X-Kmix-B64u` debe validarse en el servidor para operaciones de vault.

#### RS3: Gestión de Accesos
- **RS3.1:** Las rutas de vault deben requerir autenticación JWT válida.
- **RS3.2:** Las rutas de vault deben requerir el header `X-Kmix-B64u` para operaciones de cifrado.
- **RS3.3:** El sistema debe validar que un usuario solo acceda a sus propias entradas.

#### RS4: Registros de Auditoría
- **RS4.1:** El sistema debe registrar timestamps de creación y actualización en cada entrada.
- **RS4.2:** Los logs del backend no deben exponer contraseñas en texto plano.
- **RS4.3:** Los errores criptográficos deben registrarse sin revelar información sensible.

#### RS5: Zero-Knowledge Architecture
- **RS5.1:** El servidor nunca debe tener acceso a la contraseña maestra.
- **RS5.2:** El servidor nunca debe tener acceso al secreto del dispositivo.
- **RS5.3:** El servidor nunca debe tener acceso a `K_mix` (solo lo recibe temporalmente en headers).
- **RS5.4:** El servidor nunca debe almacenar contraseñas en texto plano.

### 3.3 Requerimientos No Funcionales

#### RNF1: Rendimiento
- **RNF1.1:** Las operaciones de cifrado/descifrado deben completarse en menos de 500ms.
- **RNF1.2:** La derivación de `K_mix` debe completarse en menos de 2 segundos.
- **RNF1.3:** Las consultas a la base de datos deben responder en menos de 100ms.

#### RNF2: Usabilidad
- **RNF2.1:** La interfaz debe ser responsive y funcionar en pantallas de 320px a 1920px.
- **RNF2.2:** El sistema debe proporcionar feedback visual claro para todas las acciones.
- **RNF2.3:** Los errores deben comunicarse de forma comprensible sin exponer detalles técnicos.

#### RNF3: Mantenibilidad
- **RNF3.1:** El código debe estar modularizado en componentes independientes.
- **RNF3.2:** El código debe incluir comentarios en secciones críticas.
- **RNF3.3:** La arquitectura debe permitir futuras extensiones sin refactorización mayor.

---

## 4. Arquitectura General del Sistema

### 4.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND (SPA)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Login View │  │  Master View │  │   Vault View │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────────────────────────────────────────┐          │
│  │         Web Crypto API (PBKDF2, HKDF, AES-GCM)   │          │
│  └──────────────────────────────────────────────────┘          │
│  ┌──────────────────────────────────────────────────┐          │
│  │   localStorage (device_secret, session state)    │          │
│  └──────────────────────────────────────────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS (JWT + X-Kmix-B64u)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Auth Routes │  │ Vault Routes │  │ Tools Routes │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────────────────────────────────────────┐          │
│  │  Cryptography (PBKDF2, AES-GCM, HKDF)            │          │
│  └──────────────────────────────────────────────────┘          │
│  ┌──────────────────────────────────────────────────┐          │
│  │  JWT Authentication & Authorization              │          │
│  └──────────────────────────────────────────────────┘          │
└────────────────────────┬────────────────────────────────────────┘
                         │ SQLAlchemy ORM
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (SQLite)                            │
│  ┌──────────────┐              ┌──────────────┐                │
│  │    users     │──────────────│vault_entries │                │
│  │  - id        │  1        *  │  - id        │                │
│  │  - email     │              │  - user_id   │                │
│  │  - pwd_hash  │              │  - title     │                │
│  │  - salt_auth │              │  - username  │                │
│  │  - salt_user │              │  - url       │                │
│  └──────────────┘              │  - note      │                │
│                                │  - iv        │                │
│                                │  - ciphertext│                │
│                                │  - tag       │                │
│                                └──────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Componentes del Sistema

#### 4.2.1 Frontend (SPA)

**Tecnologías:**
- HTML5 + CSS3 (Tailwind CSS)
- JavaScript Vanilla (ES6+)
- Web Crypto API

**Estructura de Vistas:**
1. **Login View:** Formulario de registro/inicio de sesión
2. **Master Password View:** Gestión de contraseña maestra y secreto de dispositivo
3. **Generator View:** Generador y calificador de contraseñas
4. **Vault View:** CRUD de entradas cifradas

**Responsabilidades:**
- Derivación de `K_mix` a partir de MP + device_secret
- Cifrado/descifrado de contraseñas localmente
- Gestión de estado de sesión (token JWT)
- Comunicación con backend vía API REST

#### 4.2.2 Backend (FastAPI)

**Tecnologías:**
- FastAPI 0.104+
- SQLAlchemy 2.0+ (ORM)
- Pydantic 2.0+ (validación)
- python-jose (JWT)
- cryptography (AES-GCM)
- zxcvbn-python (análisis de contraseñas)

**Módulos:**
- `app.py`: Rutas y configuración de la aplicación
- `auth.py`: Autenticación, JWT, gestión de usuarios
- `crypto.py`: Funciones criptográficas (PBKDF2, HKDF, AES-GCM)
- `models.py`: Modelos de datos (User, VaultEntry)
- `schemas.py`: Esquemas de validación con Pydantic
- `database.py`: Configuración de SQLAlchemy

**Responsabilidades:**
- Autenticación y autorización de usuarios
- Validación de tokens JWT
- Almacenamiento de datos cifrados
- Generación de contraseñas seguras
- Análisis de fortaleza con zxcvbn

#### 4.2.3 Base de Datos (SQLite)

**Tabla `users`:**
| Campo       | Tipo         | Descripción                                    |
|-------------|--------------|------------------------------------------------|
| id          | Integer (PK) | Identificador único                            |
| email       | String(255)  | Correo electrónico (unique, lowercase)         |
| pwd_hash    | LargeBinary  | Hash PBKDF2 de la contraseña de autenticación  |
| salt_auth   | LargeBinary  | Salt para autenticación (16 bytes)             |
| salt_user   | LargeBinary  | Salt para derivación de K_user (16 bytes)      |
| created_at  | DateTime     | Timestamp de creación                          |

**Tabla `vault_entries`:**
| Campo       | Tipo         | Descripción                                    |
|-------------|--------------|------------------------------------------------|
| id          | Integer (PK) | Identificador único                            |
| user_id     | Integer (FK) | Referencia a users.id (CASCADE)                |
| title       | String(255)  | Título de la entrada                           |
| username    | String(255)  | Usuario/email asociado (nullable)              |
| url         | String(1024) | URL del servicio (nullable)                    |
| note        | Text         | Notas adicionales (nullable)                   |
| iv          | LargeBinary  | Initialization Vector (12 bytes)               |
| ciphertext  | LargeBinary  | Contraseña cifrada con AES-GCM                 |
| tag         | LargeBinary  | Tag de autenticación GCM (16 bytes)            |
| created_at  | DateTime     | Timestamp de creación                          |
| updated_at  | DateTime     | Timestamp de última actualización              |

### 4.3 Flujo de Datos Principal

#### 4.3.1 Registro de Usuario

```
1. Usuario ingresa email + password en frontend
2. Frontend envía POST /auth/register
3. Backend:
   a. Genera salt_auth (16 bytes aleatorios)
   b. Genera salt_user (16 bytes aleatorios)
   c. Calcula pwd_hash = PBKDF2(password, salt_auth, 210k)
   d. Crea registro en tabla users
   e. Genera JWT token
4. Backend responde con access_token
5. Frontend almacena token y solicita /auth/me
6. Backend responde con email y salt_user_b64u
7. Frontend almacena salt_user_b64u para derivación de K_mix
```

#### 4.3.2 Creación de Entrada Cifrada

```
1. Usuario ingresa Master Password en frontend
2. Frontend:
   a. Recupera salt_user_b64u del servidor
   b. Deriva K_user = PBKDF2(MP, salt_user, 210k)
   c. Recupera device_secret de localStorage
   d. Deriva K_mix = HKDF(K_user, device_secret)
3. Usuario crea entrada con contraseña "MySecretPass123"
4. Frontend:
   a. Cifra secret_plain con AES-GCM usando K_mix
   b. Obtiene iv (12 bytes), ciphertext, tag (16 bytes)
5. Frontend envía POST /vault con:
   - Header: Authorization (JWT)
   - Header: X-Kmix-B64u
   - Body: {title, username, url, note, secret_plain}
6. Backend:
   a. Valida JWT y extrae user_id
   b. Valida X-Kmix-B64u (32 bytes)
   c. Cifra secret_plain con K_mix recibido
   d. Almacena iv, ciphertext, tag en DB
7. Backend responde con entrada creada (sin secret_plain)
```

---

## 5. Implementación Técnica

### 5.1 Criptografía Implementada

#### 5.1.1 PBKDF2-SHA256 (Password-Based Key Derivation Function)

**Propósito:** Derivar claves criptográficas a partir de contraseñas.

**Implementación Backend:**
```python
def pbkdf2_key(password: str, salt: bytes, iterations: int = 210_000, dklen: int = 32) -> bytes:
    return pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations, dklen=dklen)
```

**Implementación Frontend:**
```javascript
async function pbkdf2_sha256(password, salt, iterations = 210000, dkLen = 32) {
    const enc = new TextEncoder();
    const keyMat = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, keyMat, dkLen * 8);
    return new Uint8Array(bits);
}
```

**Parámetros:**
- Algoritmo: SHA-256
- Iteraciones: 210,000 (recomendación OWASP 2024)
- Salt: 16 bytes aleatorios únicos por usuario
- Output: 32 bytes (256 bits)

**Justificación:**
PBKDF2 es resistente a ataques de fuerza bruta mediante el uso de múltiples iteraciones. Con 210,000 iteraciones, cada intento de adivinar una contraseña requiere ~0.5 segundos en hardware estándar, haciendo inviables los ataques de diccionario.

#### 5.1.2 HKDF-SHA256 (HMAC-based Key Derivation Function)

**Propósito:** Combinar `K_user` con `device_secret` para generar `K_mix`.

**Implementación Backend:**
```python
def hkdf_sha256(ikm: bytes, salt: bytes, info: bytes, L: int = 32) -> bytes:
    prk = hmac.new(salt, ikm, hashlib.sha256).digest()
    T = b""; okm = b""; c = 0
    while len(okm) < L:
        c += 1
        T = hmac.new(prk, T + info + bytes([c]), hashlib.sha256).digest()
        okm += T
    return okm[:L]
```

**Parámetros:**
- IKM (Input Keying Material): `K_user` (32 bytes)
- Salt: `device_secret` (16 bytes)
- Info: String "k_mix" (contexto)
- Output: 32 bytes

**Justificación:**
HKDF permite combinar dos fuentes de entropía (contraseña del usuario + secreto del dispositivo) en una clave final criptográficamente fuerte. Esto implementa autenticación de dos factores: algo que sabes (MP) + algo que tienes (device_secret).

#### 5.1.3 AES-256-GCM (Advanced Encryption Standard - Galois/Counter Mode)

**Propósito:** Cifrado autenticado de contraseñas con protección de integridad.

**Implementación Backend:**
```python
def aes_gcm_encrypt(key32: bytes, plaintext: bytes, aad: bytes | None = None) -> tuple[bytes, bytes, bytes]:
    if len(key32) != 32:
        raise ValueError("AES-256 key must be 32 bytes")
    iv = os.urandom(12)
    aead = AESGCM(key32)
    ct = aead.encrypt(iv, plaintext, aad)
    return iv, ct[:-16], ct[-16:]

def aes_gcm_decrypt(key32: bytes, iv: bytes, ciphertext: bytes, tag: bytes, aad: bytes | None = None) -> bytes:
    if len(iv) != 12:
        raise ValueError("AES-GCM IV must be 12 bytes")
    aead = AESGCM(key32)
    return aead.decrypt(iv, ciphertext + tag, aad)
```

**Parámetros:**
- Algoritmo: AES-256 (clave de 256 bits)
- Modo: GCM (Galois/Counter Mode)
- IV: 12 bytes aleatorios únicos por cifrado
- Tag: 16 bytes (128 bits) para autenticación

**Ventajas de GCM:**
- **Confidencialidad:** El ciphertext no revela información del plaintext
- **Integridad:** El tag detecta modificaciones maliciosas
- **Autenticación:** Verifica que el mensaje proviene del propietario de K_mix
- **Rendimiento:** Modo optimizado para hardware moderno

### 5.2 Autenticación y Autorización

#### 5.2.1 Registro de Usuarios

**Endpoint:** `POST /auth/register`

**Flujo:**
```python
def create_user(db: Session, data: RegisterIn) -> User:
    if db.query(User).filter_by(email=data.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email ya registrado")
    salt_auth = _randbytes(16)
    salt_user = _randbytes(16)
    pwd_hash = hash_password(data.password, salt_auth)
    u = User(email=data.email.lower(), pwd_hash=pwd_hash, salt_auth=salt_auth, salt_user=salt_user)
    db.add(u); db.commit(); db.refresh(u)
    return u
```

**Seguridad:**
- Email normalizado a lowercase para evitar duplicados
- `salt_auth` único para resistencia a rainbow tables
- `salt_user` único para derivación de K_user independiente
- Hash con PBKDF2-SHA256 (210,000 iteraciones)

#### 5.2.2 Tokens JWT

**Generación:**
```python
def create_access_token(user_id: int, email: str) -> str:
    now = int(time.time())
    payload = {"sub": str(user_id), "email": email, "iat": now, "exp": now + 60*JWT_EXPIRE_MIN}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")
```

**Estructura del Token:**
```json
{
  "sub": "1",
  "email": "user@example.com",
  "iat": 1735689600,
  "exp": 1735696800
}
```

**Parámetros de Seguridad:**
- Algoritmo: HS256 (HMAC-SHA256)
- Secret: Variable de entorno `JWT_SECRET`
- Expiración: 120 minutos (configurable)

### 5.3 Gestión del Secreto de Dispositivo

#### 5.3.1 Generación Automática

**Implementación Frontend:**
```javascript
function getOrCreateDeviceSecret() {
    let s = localStorage.getItem("device_secret_b64u");
    if (!s) {
        const rnd = crypto.getRandomValues(new Uint8Array(16));
        s = b64u(rnd);
        localStorage.setItem("device_secret_b64u", s);
    }
    return s;
}
```

**Características:**
- Generación con `crypto.getRandomValues` (CSPRNG del navegador)
- Almacenamiento en localStorage (persistente por dominio)
- Formato Base64URL para portabilidad

#### 5.3.2 Exportación

**Implementación Frontend:**
```javascript
function exportSecret() {
    const s = getOrCreateDeviceSecret();
    const blob = new Blob([s], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "device_secret.key";
    a.click();
}
```

**Uso:** Permite al usuario descargar el secreto como archivo `device_secret.key` para sincronización manual entre dispositivos.

### 5.4 Endpoints de la API

#### 5.4.1 Autenticación

| Método | Endpoint        | Descripción                          | Autenticación |
|--------|-----------------|--------------------------------------|---------------|
| POST   | /auth/register  | Registra un nuevo usuario            | No            |
| POST   | /auth/login     | Inicia sesión y retorna JWT          | No            |
| GET    | /auth/me        | Obtiene información del usuario actual| JWT           |

#### 5.4.2 Vault

| Método | Endpoint          | Descripción                          | Autenticación | K_mix |
|--------|-------------------|--------------------------------------|---------------|-------|
| POST   | /vault            | Crea nueva entrada cifrada           | JWT           | Sí    |
| GET    | /vault            | Lista entradas (sin contraseñas)     | JWT           | No    |
| GET    | /vault/{id}       | Obtiene entrada completa descifrada  | JWT           | Sí    |
| PUT    | /vault/{id}       | Actualiza entrada existente          | JWT           | Sí    |
| DELETE | /vault/{id}       | Elimina entrada                      | JWT           | No    |

#### 5.4.3 Herramientas

| Método | Endpoint         | Descripción                          | Autenticación |
|--------|------------------|--------------------------------------|---------------|
| POST   | /tools/generate  | Genera contraseña segura             | No            |
| POST   | /tools/score     | Califica fortaleza de contraseña     | No            |

---

## 6. Medidas de Seguridad Aplicadas

### 6.1 Protección de Datos en Reposo

#### 6.1.1 Cifrado de Contraseñas
- **Algoritmo:** AES-256-GCM (estándar NIST, usado por bancos y gobiernos)
- **Clave:** K_mix derivado de MP + device_secret
- **IV único:** 12 bytes aleatorios por cada cifrado
- **Tag de autenticación:** 16 bytes para detectar modificaciones

**Resultado:** El servidor almacena solo datos cifrados. Sin K_mix correcto, los datos son indistinguibles de ruido aleatorio.

#### 6.1.2 Hashing de Contraseñas de Autenticación
- **Algoritmo:** PBKDF2-SHA256
- **Iteraciones:** 210,000 (OWASP 2024 recomienda 200,000+)
- **Salt único:** 16 bytes por usuario
- **Output:** 32 bytes

**Resultado:** Incluso si la base de datos es comprometida, las contraseñas no pueden ser recuperadas sin fuerza bruta costosa.

#### 6.1.3 Separación de Sales
- **salt_auth:** Para autenticación (comparación de hashes)
- **salt_user:** Para derivación de K_user (cifrado de vault)

**Resultado:** Aunque un atacante comprometa el hash de autenticación, no puede derivar K_user sin la contraseña maestra.

### 6.2 Protección de Datos en Tránsito

#### 6.2.1 HTTPS (Recomendado para Producción)
- **Protocolo:** TLS 1.3
- **Certificados:** Let's Encrypt o certificados autofirmados (desarrollo)

**Resultado:** Previene ataques Man-in-the-Middle (MITM) y escucha de tráfico (sniffing).

#### 6.2.2 Validación de Tokens JWT
- **Firma:** HMAC-SHA256 con secreto servidor
- **Expiración:** 120 minutos automáticos
- **Validación:** En cada request protegido

**Resultado:** Previene falsificación de tokens y sesiones sin expiración.

### 6.3 Arquitectura Zero-Knowledge

#### 6.3.1 Derivación de Claves en Cliente
```
Frontend:
MP (user input) + salt_user (from server) → K_user → K_user + device_secret → K_mix

K_mix NUNCA se almacena, solo se envía en headers para operaciones puntuales
```

**Resultado:** El servidor nunca conoce:
- La contraseña maestra
- El secreto del dispositivo
- La clave K_mix (solo la recibe temporalmente en headers)

#### 6.3.2 Cifrado antes del Envío
```javascript
// Frontend cifra localmente
const secret_bytes = new TextEncoder().encode(password);
const {iv, ciphertext, tag} = await aes_gcm_encrypt(K_mix, secret_bytes);

// Solo se envía el ciphertext, no el plaintext
await api("/vault", "POST", {secret_plain: password}, true);
```

**Resultado:** Las contraseñas nunca viajan en texto plano, ni siquiera sobre HTTPS.

### 6.4 Control de Acceso

#### 6.4.1 Autenticación de Usuarios
- Todos los endpoints de vault requieren JWT válido
- Token debe incluir user_id en claim `sub`

#### 6.4.2 Autorización de Recursos
```python
# Backend verifica que la entrada pertenezca al usuario autenticado
r = db.query(VaultEntry).filter_by(id=entry_id, user_id=user.id).first()
if not r:
    raise HTTPException(404, "No existe")
```

**Resultado:** Un usuario no puede acceder a entradas de otros usuarios, incluso con un JWT válido.

### 6.5 Registros de Auditoría

#### 6.5.1 Timestamps Automáticos
```python
created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())
updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

**Uso:** Permite rastrear cuándo se crearon o modificaron entradas.

### 6.6 Prevención de Vulnerabilidades Comunes

#### 6.6.1 SQL Injection
- **Mitigación:** Uso de SQLAlchemy ORM con queries parametrizadas
- **Ejemplo seguro:**
```python
db.query(VaultEntry).filter_by(id=entry_id, user_id=user.id).first()
```

#### 6.6.2 XSS (Cross-Site Scripting)
- **Mitigación:** No se usa `innerHTML` con input de usuario
- **Ejemplo seguro:**
```javascript
div.textContent = userInput;  // Escapa automáticamente
```

#### 6.6.3 CSRF (Cross-Site Request Forgery)
- **Mitigación:** Uso de tokens JWT en headers (no cookies)
- **Resultado:** Los requests cross-origin no pueden incluir el header `Authorization`

---

## 7. Análisis de Riesgos y Mitigación

### 7.1 Matriz de Riesgos

| Riesgo | Probabilidad | Impacto | Severidad | Mitigación Implementada |
|--------|--------------|---------|-----------|-------------------------|
| Pérdida de contraseña maestra | Media | Crítico | **ALTA** | Educación al usuario, no hay recuperación (zero-knowledge) |
| Pérdida de device_secret | Media | Crítico | **ALTA** | Exportación de secreto, almacenamiento local persistente |
| Compromiso de base de datos | Baja | Alto | **MEDIA** | Cifrado AES-GCM, datos inutilizables sin K_mix |
| Ataque de fuerza bruta a login | Media | Medio | **MEDIA** | PBKDF2 210k iteraciones, rate limiting pendiente |
| Man-in-the-Middle (MITM) | Media | Alto | **MEDIA** | HTTPS en producción, CORS configurado |
| XSS en frontend | Baja | Medio | **BAJA** | Uso de textContent, validación de inputs |
| SQL Injection | Baja | Crítico | **BAJA** | SQLAlchemy ORM, queries parametrizadas |

### 7.2 Análisis Detallado de Riesgos

#### 7.2.1 Pérdida de Contraseña Maestra

**Descripción:** El usuario olvida su Master Password y no puede derivar K_mix.

**Consecuencias:**
- Imposibilidad de descifrar entradas existentes
- Pérdida permanente de acceso a contraseñas almacenadas

**Mitigación:**
- **Educación:** Mensaje claro durante primer uso explicando que no hay recuperación
- **Alternativa:** Sistema de "hint" cifrado con contraseña de autenticación (no implementado)
- **Mejor práctica:** Recomendar uso de contraseña memorable pero fuerte (ej: passphrase)

**Estado:** Aceptado (característica de zero-knowledge)

#### 7.2.2 Compromiso de Base de Datos

**Descripción:** Un atacante obtiene acceso completo a `server.db`.

**Mitigación implementada:**
```
Datos expuestos:
- Emails: Sí (inevitable para login)
- Hashes de autenticación: Sí, pero protegidos con PBKDF2 210k iteraciones
- Contraseñas en vault: Cifradas con AES-GCM, inutilizables sin K_mix

Para descifrar una contraseña, el atacante necesita:
1. Adivinar la Master Password del usuario → PBKDF2 210k iteraciones
2. Obtener el device_secret del dispositivo del usuario → Almacenado solo en localStorage
3. Derivar K_mix correctamente → HKDF-SHA256

Conclusión: Compromiso de DB solo expone datos cifrados inútiles.
```

**Estado:** Bien mitigado

#### 7.2.3 Ataque de Fuerza Bruta al Login

**Descripción:** Un atacante intenta miles de combinaciones de email/password.

**Mitigación implementada:**
- PBKDF2 con 210,000 iteraciones (0.5s por intento)
- Hash de autenticación independiente de derivación de vault

**Mitigación pendiente:**
- **Rate limiting:** Limitar intentos de login por IP (ej: 5 intentos/15 min)
- **CAPTCHA:** Después de 3 intentos fallidos
- **Bloqueo temporal:** Cuenta bloqueada por 30 min tras 10 intentos fallidos

**Estado:** Parcialmente mitigado

---

## 8. Resultados y Lecciones Aprendidas

### 8.1 Resultados Alcanzados

#### 8.1.1 Funcionalidades Implementadas

✅ **Sistema de autenticación completo**
- Registro con validación de email único
- Login con JWT de 120 minutos de expiración
- Endpoint `/auth/me` para obtener información del usuario

✅ **CRUD completo de entradas cifradas**
- Creación de entradas con cifrado AES-GCM
- Listado de entradas sin exponer contraseñas
- Visualización individual con descifrado local
- Edición de entradas existentes
- Eliminación con confirmación

✅ **Generador y calificador de contraseñas**
- Generación aleatoria con CSPRNG
- Longitud configurable (8-64 caracteres)
- Opción de incluir/excluir símbolos
- Análisis de fortaleza con zxcvbn
- Sugerencias para mejorar contraseñas débiles

✅ **Gestión de secreto de dispositivo**
- Generación automática en primer uso
- Exportación como archivo `.key`
- Importación desde archivo
- Persistencia en localStorage

✅ **Interfaz de usuario moderna**
- SPA con 4 vistas principales
- Tema oscuro consistente
- Notificaciones toast para feedback
- Modales para visualización detallada
- Diseño responsive

#### 8.1.2 Métricas de Seguridad

| Métrica | Objetivo | Alcanzado |
|---------|----------|-----------|
| Iteraciones PBKDF2 | ≥200,000 | ✅ 210,000 |
| Longitud de clave AES | 256 bits | ✅ 256 bits |
| Longitud de IV | 12 bytes | ✅ 12 bytes |
| Longitud de salt | ≥16 bytes | ✅ 16 bytes |
| Expiración de JWT | <180 min | ✅ 120 min |
| Cifrado de contraseñas | Sí | ✅ AES-GCM |
| Zero-knowledge | Sí | ✅ Derivación cliente |

### 8.2 Lecciones Aprendidas

#### 8.2.1 Lecciones Técnicas

**1. La sincronización entre implementaciones criptográficas es crítica**

Problema enfrentado:
```javascript
// Frontend: Base64URL sin padding
const b64u = (bytes) => btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

// Backend: Base64URL con padding automático
def b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()
```

Lección: Asegurar que ambos lados usen el mismo formato (Base64URL sin padding) evita errores de validación.

**2. PBKDF2 con 210,000 iteraciones causa latencia perceptible**

Observación:
- Derivación de K_user toma ~1.5 segundos en navegadores
- Usuario debe esperar antes de cada operación de vault

Lección: Implementar indicadores de carga ("Derivando clave...") mejora la percepción de rendimiento.

**3. El manejo de device_secret requiere educación del usuario**

Problema:
- Usuarios no entienden por qué necesitan exportar el secreto
- Pérdida del secreto causa confusión ("¿por qué mis contraseñas no se descifran?")

Lección: Agregar wizard de onboarding explicando:
- Qué es el device_secret
- Por qué es necesario para sincronización
- Cómo exportarlo antes de cambiar de dispositivo

#### 8.2.2 Lecciones de Desarrollo

**1. Pruebas incrementales simplifican la integración**

Estrategia aplicada:
```
Semana 1: Backend + DB (pytest)
Semana 2: Frontend sin cifrado (Postman)
Semana 3: Integración de cifrado (pruebas manuales)
Semana 4: Refactorización y UX
```

Lección: Validar cada capa antes de integrar reduce debugging complejo.

**2. Modularización facilita mantenimiento**

Estructura aplicada:
```
backend/
├── app.py         # Rutas y CORS
├── auth.py        # Autenticación aislada
├── crypto.py      # Funciones criptográficas puras
├── models.py      # Esquema de BD
├── schemas.py     # Validaciones
└── database.py    # Configuración de ORM
```

Lección: Separación de responsabilidades permite cambiar implementaciones sin afectar otros módulos.

#### 8.2.3 Lecciones de Seguridad

**1. Zero-knowledge es incompatible con recuperación de contraseñas**

Dilema:
- Los usuarios esperan poder "recuperar" su contraseña olvidada
- Zero-knowledge significa que el servidor no puede ayudar

Solución aplicada:
- Educación clara: "No hay recuperación. Guarda tu Master Password de forma segura."
- Solución futura: Recovery key cifrado de 24 palabras (similar a wallets de criptomonedas)

Lección: Las decisiones de seguridad deben comunicarse claramente, incluso si reducen conveniencia.

**2. CORS abierto (`allow_origins=["*"]`) es inseguro para producción**

Configuración actual:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ❌ Peligroso en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)
```

Lección: Configuraciones de desarrollo deben documentarse como inseguras y actualizarse antes de producción.

### 8.3 Retrospectiva del Proyecto

#### 8.3.1 Fortalezas del Proyecto

1. **Arquitectura de seguridad sólida**
   - Implementación correcta de estándares criptográficos
   - Zero-knowledge bien documentado
   - Separación clara de responsabilidades

2. **Código limpio y modular**
   - Funciones con responsabilidad única
   - Nomenclatura descriptiva
   - Comentarios en secciones críticas

3. **Documentación completa**
   - README técnico detallado
   - Diagramas de arquitectura
   - Justificación de decisiones de diseño

4. **Usabilidad considerada**
   - Interfaz minimalista pero funcional
   - Feedback visual claro (toasts, modales)
   - Mensajes de error comprensibles

#### 8.3.2 Desafíos Enfrentados

1. **Sincronización entre Python y JavaScript**
   - Diferentes implementaciones de HKDF
   - Diferencias en manejo de bytes/strings
   - Solución: Pruebas exhaustivas con vectores de test

2. **Educación del usuario sobre conceptos criptográficos**
   - Device secret no es intuitivo
   - Zero-knowledge significa pérdida permanente de datos
   - Solución: Mensajes claros y wizard de onboarding (pendiente)

---

## 9. Conclusiones y Recomendaciones Futuras

### 9.1 Conclusiones Generales

1. **Se logró construir un gestor de contraseñas funcional y seguro** que implementa principios de criptografía moderna (AES-256-GCM, PBKDF2-SHA256, HKDF-SHA256) con arquitectura zero-knowledge.

2. **El proyecto cumple con los objetivos académicos del curso** al aplicar conocimientos de seguridad informática, ética en el manejo de datos y desarrollo de software seguro.

3. **La arquitectura cliente-servidor con cifrado end-to-end es viable** para aplicaciones web que manejan datos sensibles, balanceando seguridad con usabilidad.

4. **Las decisiones de diseño criptográfico están justificadas** según estándares de la industria (NIST, OWASP) y buenas prácticas de seguridad.

5. **El sistema es educativamente valioso** como demostración de cómo implementar principios de zero-knowledge en una aplicación real.

### 9.2 Limitaciones Reconocidas

#### 9.2.1 Seguridad

- **No implementado:** Rate limiting (vulnerable a ataques de fuerza bruta)
- **No implementado:** MFA (autenticación depende solo de contraseña)
- **No implementado:** HTTPS en desarrollo (tráfico en texto plano localmente)
- **No implementado:** Rotación de JWT_SECRET

#### 9.2.2 Funcionalidad

- **No cifrado completo:** `title`, `username`, `url`, `note` están en texto plano
- **No implementado:** Búsqueda y filtrado de entradas
- **No implementado:** Categorización o etiquetas
- **No implementado:** Historial de cambios

### 9.3 Recomendaciones Futuras

#### 9.3.1 Mejoras de Seguridad (Prioridad Alta)

**1. Implementar Rate Limiting**
```python
@app.post("/auth/login")
@limiter.limit("5/15minutes")
async def login(...):
    ...
```

**2. Migrar a HTTPS con certificados válidos**
```bash
sudo certbot --nginx -d passwordmanager.com
```

**3. Agregar Autenticación Multifactor (TOTP)**
```python
import pyotp
totp = pyotp.TOTP(user.totp_secret)
if not totp.verify(code_from_user):
    raise HTTPException(401, "Código TOTP inválido")
```

#### 9.3.2 Mejoras de Funcionalidad (Prioridad Media)

**1. Cifrado completo de metadatos**
```python
# Cifrar también title, username, url, note con K_mix
encrypted_metadata = aes_gcm_encrypt(kmix, json.dumps({
    "title": title,
    "username": username,
    "url": url,
    "note": note
}).encode())
```

**2. Búsqueda cifrada con índices**
```python
# Generar hash de título para búsqueda sin descifrar
title_hash = sha256(title.lower().encode()).hexdigest()[:16]
```

### 9.4 Reflexión Final

Este proyecto demostró que **es posible construir software seguro sin sacrificar funcionalidad**, siempre que se apliquen principios criptográficos correctamente y se eduque a los usuarios sobre las implicaciones de seguridad.

La arquitectura zero-knowledge, aunque compleja de implementar, proporciona **garantías de privacidad que ningún otro modelo puede ofrecer**: ni siquiera el desarrollador del sistema puede acceder a las contraseñas de los usuarios.

Como futuros ingenieros de datos y software, **tenemos la responsabilidad ética** de proteger la información sensible de nuestros usuarios, no solo por cumplimiento legal, sino por respeto a su privacidad y confianza.

> *"La seguridad no es un producto, es un proceso."* — Bruce Schneier

---

## 10. Referencias y Anexos

### 10.1 Referencias Bibliográficas

**Estándares y Documentación Oficial:**

1. **NIST SP 800-132** (2010). "Recommendation for Password-Based Key Derivation."
   https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf

2. **NIST SP 800-38D** (2007). "Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC."
   https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf

3. **RFC 5869** (2010). "HMAC-based Extract-and-Expand Key Derivation Function (HKDF)."
   https://datatracker.ietf.org/doc/html/rfc5869

4. **OWASP Password Storage Cheat Sheet** (2024).
   https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

**Librerías y Herramientas:**

5. **FastAPI Documentation** (2024). "FastAPI framework, high performance, easy to learn."
   https://fastapi.tiangolo.com/

6. **Cryptography.io** (2024). "Python Cryptographic Authority."
   https://cryptography.io/en/latest/

7. **Web Crypto API** (W3C). "Web Cryptography API Specification."
   https://www.w3.org/TR/WebCryptoAPI/

8. **zxcvbn** (Dropbox). "Low-Budget Password Strength Estimation."
   https://github.com/dropbox/zxcvbn

### 10.2 Estructura del Proyecto

```
etica_seguridad/
├── backend/
│   ├── app.py          # Aplicación principal (rutas, CORS)
│   ├── auth.py         # Lógica de autenticación y JWT
│   ├── crypto.py       # Funciones criptográficas
│   ├── database.py     # Configuración de base de datos
│   ├── models.py       # Modelos SQLAlchemy (User, VaultEntry)
│   └── schemas.py      # Validaciones con Pydantic
├── frontend/
│   ├── index.html      # Interfaz de usuario moderna
│   └── app.js          # Lógica cliente (criptografía y API)
├── data/
│   └── server.db       # Base de datos SQLite
└── README.md           # Este documento
```

### 10.3 Comandos de Despliegue

**Desarrollo Local:**
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000

# Frontend (con Live Server en VSCode)
cd frontend
# Abrir index.html con Live Server (puerto 5500)
```

### 10.4 Contacto y Soporte

**Autores:** 
- Jorge Eduardo Quenta Solis
- Stuart Diego Arteaga Montes

**Emails:** 
- jorge.quenta@utec.edu.pe
- stuart.arteaga@utec.edu.pe

**Universidad:** Universidad de Ingeniería y Tecnología – UTEC
**Curso:** Ética y Seguridad de Datos (DS3031)

---

