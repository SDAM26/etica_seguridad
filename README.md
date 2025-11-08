# Proyecto: Password Manager

## 1. Descripción General

Este proyecto implementa un **gestor de contraseñas seguro** con arquitectura **cliente–servidor**.  
Permite almacenar, cifrar, gestionar y recuperar credenciales de forma segura, aplicando el principio de **zero-knowledge**: el servidor nunca conoce las contraseñas en texto plano, ya que el **cifrado se realiza en el cliente** antes de enviar los datos.

---

## 2. Arquitectura del Sistema

### 2.1 Backend (FastAPI – Python)
- API REST desarrollada con **FastAPI**.  
- Persistencia de datos con **SQLite**.  
- Autenticación mediante **JWT** con expiración configurable.  
- Cifrado de datos con **AES-256-GCM**.  
- Derivación de claves con **PBKDF2** y **HKDF**.

### 2.2 Frontend (HTML, CSS, JavaScript)
- Interfaz **responsive** y ligera (tema oscuro).  
- Criptografía local mediante **Web Crypto API**.  
- Gestión del **secreto de dispositivo** (almacenado en `localStorage`).  
- Comunicación asíncrona con la API usando `fetch`.

---

## 3. Estructura del Proyecto

```
seguridad/
├── backend/
│   ├── app.py          # Aplicación principal (rutas, CORS)
│   ├── auth.py         # Lógica de autenticación y JWT
│   ├── crypto.py       # Funciones criptográficas
│   ├── database.py     # Configuración de base de datos
│   ├── models.py       # Modelos SQLAlchemy (User, VaultEntry)
│   └── schemas.py      # Validaciones con Pydantic
├── frontend/
│   ├── index.html      # Interfaz de usuario
│   ├── app.js          # Lógica cliente (criptografía y API)
│   └── styles.css      # Estilos visuales
└── data/
    └── server.db       # Base de datos SQLite
```

---

## 4. Planificación y Ejecución

**Duración total:** 6 semanas  
Divididas en 4 fases principales.

### 4.1 Fase 1 – Planificación y Diseño
1. **Requisitos Funcionales**
   - CRUD completo de credenciales.  
   - Registro e inicio de sesión de usuarios.  
   - Generador y calificador de contraseñas.  
   - Exportación/Importación de secreto de dispositivo.  
2. **Requisitos de Seguridad**
   - Cifrado del lado del cliente antes del envío.  
   - No almacenar contraseñas en texto plano.  
   - Autenticación con JWT y aislamiento de usuarios.  
3. **Diseño Criptográfico**
   - **AES-GCM** como cifrado autenticado.  
   - **PBKDF2-SHA256** con 210 000 iteraciones.  
   - **HKDF-SHA256** para mezclar claves.  
   - Salts únicos por usuario (`salt_auth`, `salt_user`).  
4. **Diseño de Base de Datos**
   - Tabla `users` con hashes y salts.  
   - Tabla `vault_entries` con datos cifrados (IV, ciphertext, tag).  
   - Relaciones y timestamps para auditoría.

### 4.2 Fase 2 – Implementación del Backend
1. Configuración de SQLite y modelos ORM.  
2. Registro y login con hash PBKDF2 y JWT.  
3. Implementación de AES-GCM y funciones de derivación.  
4. Endpoints REST (`/auth/*`, `/vault/*`, `/tools/*`).  
5. Pruebas de autenticación y cifrado end-to-end.

### 4.3 Fase 3 – Implementación del Frontend
1. Interfaz **responsive** con tema oscuro.  
2. Derivación de `K_mix` a partir de **Master Password** + **device secret**.  
3. Generador y calificador de contraseñas (zxcvbn).  
4. Funciones de exportar/importar secreto de dispositivo.  
5. Comunicación asíncrona con el backend vía `fetch`.

### 4.4 Fase 4 – Integración, Pruebas y Documentación
1. Pruebas de integración frontend–backend.  
2. Verificación del flujo de cifrado/descifrado completo.  
3. Validación del aislamiento de datos entre usuarios.  
4. Revisión de seguridad: el servidor nunca accede a contraseñas planas.  
5. Documentación del código y del flujo criptográfico.

---

## 5. Funcionamiento Criptográfico

1. El usuario ingresa la **Master Password (MP)** en el navegador.  
2. El servidor envía su `salt_user`.  
3. Se deriva `K_user = PBKDF2(MP, salt_user, 210k, 32 B)`.  
4. Se mezcla con el **device secret** mediante `HKDF` → `K_mix`.  
5. `K_mix` cifra/descifra las contraseñas con **AES-GCM**.  
6. El backend guarda solo IV, ciphertext y tag; nunca la MP.

---

## 6. Resultados

- CRUD funcional y seguro de contraseñas.  
- Autenticación JWT con expiración.  
- Generador y calificador de contraseñas.  
- Gestión del **secreto de dispositivo**.  
- Base de datos con almacenamiento **cifrado**.  

---

## 7. Lecciones Aprendidas

### 7.1 Técnicas
1. Cifrado del lado del cliente asegura modelo *zero-knowledge*.  
2. PBKDF2 + HKDF ofrecen resistencia a fuerza bruta.  
3. Mantener consistencia en codificaciones entre Python/JS evita errores.  
4. Manejo correcto de errores mejora seguridad y UX.  
5. Modularidad (auth, crypto, database) facilita mantenimiento.

### 7.2 De Desarrollo
1. Pruebas incrementales por componente simplifican la integración.  
2. Documentar decisiones técnicas evita ambigüedades.  
3. La simplicidad (JS vanilla) fue ideal para un MVP académico.  
4. Gestión de estados y limpieza de datos sensibles es esencial.  
5. UX clara es clave para explicar conceptos técnicos (p. ej. device secret).

---

## 8. Retrospectiva del Proyecto y del Equipo

### 8.1 Fortalezas
- Arquitectura de seguridad sólida y educativa.  
- División clara entre backend y frontend.  
- Interfaz minimalista pero funcional.  
- SQLite fue suficiente para desarrollo académico.  
- FastAPI + Web Crypto API permitieron un enfoque moderno.

### 8.2 Desafíos
- Alinear implementaciones criptográficas entre Python y JS.  
- Explicar al usuario el concepto de secreto de dispositivo.  
- Balancear mensajes de error entre claridad y seguridad.  
- Pruebas manuales intensivas.  
- Campos no cifrados por priorizar funcionalidad.

---

## 9. Áreas de Mejora para Futuros Proyectos

### 9.1 Seguridad y Cifrado de Datos
- **Cifrado completo:** proteger también `title`, `username`, `url`, `note`.  
- Mantener solo `id`, `created_at`, `updated_at` sin cifrar.  
- Agregar **rate limiting**, 2FA (TOTP), auditorías y rotación de claves.

### 9.2 Frontend y Experiencia de Usuario
- Diseño visual moderno con transiciones suaves y tipografía jerárquica.  
- Iconografía consistente y notificaciones (toasts, modales).  
- Validación en tiempo real y confirmaciones antes de eliminar.  
- Estados de carga y mejoras de accesibilidad.  
- Asistente visual para gestionar el secreto de dispositivo.

### 9.3 Funcionalidades Adicionales
- Búsqueda y filtrado en tiempo real.  
- Categorización y favoritos.  
- Historial de cambios y versiones.  
- Importación/exportación desde otros gestores.  
- Sincronización segura entre dispositivos.

---

## 10. Conclusiones

1. Se construyó un **gestor de contraseñas funcional y seguro**, aplicando criptografía moderna (AES-GCM, PBKDF2, HKDF).  
2. Se logró una **implementación full-stack completa** (backend, frontend, DB).  
3. Se garantizó que el servidor nunca accede a contraseñas en claro.  
4. Se aplicaron buenas prácticas de documentación, modularidad y pruebas.  
5. Para un entorno universitario, el resultado es un **proyecto sólido y educativo**.

**Reflexión Final:**  
* El proyecto demuestra que es posible crear un gestor de contraseñas seguro usando tecnologías web estándar.  
