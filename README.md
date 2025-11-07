# Password Manager 

## Descripción del Proyecto

Este proyecto implementa un gestor de contraseñas seguro con arquitectura cliente-servidor. El sistema permite a los usuarios almacenar, gestionar y recuperar credenciales de forma encriptada, utilizando técnicas criptográficas modernas para garantizar la seguridad de los datos sensibles.

## Arquitectura del Sistema

El proyecto está dividido en dos componentes principales:

### Backend (FastAPI)
- API REST construida con FastAPI
- Base de datos SQLite para persistencia
- Autenticación basada en JWT
- Encriptación AES-GCM para los secretos almacenados
- Derivación de claves mediante PBKDF2 y HKDF

### Frontend (HTML/CSS/JavaScript)
- Interfaz de usuario responsive
- Comunicación con la API mediante fetch
- Criptografía del lado del cliente usando Web Crypto API
- Gestión de secretos de dispositivo

## Estructura del Proyecto

```
seguridad/
├── backend/
│   ├── app.py          # Aplicación FastAPI principal
│   ├── auth.py         # Lógica de autenticación y JWT
│   ├── crypto.py       # Funciones criptográficas
│   ├── database.py     # Configuración de base de datos
│   ├── models.py       # Modelos SQLAlchemy
│   └── schemas.py      # Esquemas Pydantic
├── frontend/
│   ├── index.html      # Interfaz de usuario
│   ├── app.js          # Lógica del cliente
│   └── styles.css      # Estilos CSS
└── data/
    └── server.db        # Base de datos SQLite
```

## Planificación y Ejecución del Proyecto

### Fase 1: Planificación y Diseño

Durante la fase inicial, se definieron los siguientes aspectos:

1. **Requisitos de Seguridad**
   - Los secretos nunca deben almacenarse en texto plano
   - La encriptación debe realizarse del lado del cliente antes de enviar al servidor
   - El servidor no debe tener acceso a las contraseñas maestras
   - Implementación de autenticación robusta con JWT

2. **Arquitectura Criptográfica**
   - Selección de AES-GCM para encriptación simétrica (autenticada)
   - Uso de PBKDF2 para derivación de claves desde contraseñas
   - Implementación de HKDF para mezcla de claves (K_mix)
   - Salts únicos por usuario para prevenir ataques de diccionario

3. **Diseño de Base de Datos**
   - Tabla de usuarios con hashes de contraseña
   - Tabla de entradas del vault con campos encriptados
   - Relaciones apropiadas con cascadas para integridad referencial

### Fase 2: Implementación del Backend

La implementación del backend se realizó en los siguientes pasos:

1. **Configuración de Base de Datos**
   - Configuración de SQLAlchemy con SQLite
   - Definición de modelos User y VaultEntry
   - Implementación de relaciones y cascadas

2. **Sistema de Autenticación**
   - Registro de usuarios con hashing de contraseñas (PBKDF2-SHA256)
   - Login con verificación de credenciales
   - Generación y validación de tokens JWT
   - Middleware de autenticación para rutas protegidas

3. **Funcionalidades Criptográficas**
   - Implementación de AES-GCM para encriptación/desencriptación
   - Funciones de derivación de claves (PBKDF2, HKDF)
   - Utilidades de codificación Base64URL
   - Generador de contraseñas seguras
   - Calificador de fortaleza de contraseñas

4. **API REST**
   - Endpoints de autenticación (/auth/register, /auth/login, /auth/me)
   - Endpoints de herramientas (/tools/generate, /tools/score)
   - Endpoints CRUD del vault (/vault)
   - Manejo de errores y validaciones

### Fase 3: Implementación del Frontend

El frontend se desarrolló con las siguientes características:

1. **Interfaz de Usuario**
   - Diseño responsive con tema oscuro
   - Secciones para autenticación, generador y vault
   - Campos de contraseña con funcionalidad de mostrar/ocultar
   - Indicadores visuales de fortaleza de contraseñas

2. **Lógica del Cliente**
   - Implementación de funciones criptográficas usando Web Crypto API
   - Derivación de K_mix en el cliente
   - Gestión de secretos de dispositivo (almacenamiento local)
   - Comunicación asíncrona con la API
   - Manejo de estados de sesión

3. **Funcionalidades**
   - Registro e inicio de sesión
   - Generación de contraseñas con configuración personalizable
   - Calificación de contraseñas en tiempo real
   - CRUD completo de entradas del vault
   - Exportación e importación de secretos de dispositivo

### Fase 4: Integración y Pruebas

Durante esta fase se realizaron:

1. **Pruebas de Integración**
   - Verificación del flujo completo de registro y login
   - Pruebas de encriptación y desencriptación
   - Validación de la persistencia de datos
   - Pruebas de sincronización entre cliente y servidor

2. **Pruebas de Seguridad**
   - Verificación de que los secretos no se almacenan en texto plano
   - Validación de la integridad de los datos encriptados
   - Pruebas de manejo de tokens expirados
   - Verificación de aislamiento de datos entre usuarios

## Características Técnicas

### Seguridad

- **Encriptación**: AES-256-GCM para encriptación autenticada
- **Hashing de Contraseñas**: PBKDF2-SHA256 con 210,000 iteraciones
- **Derivación de Claves**: HKDF-SHA256 para mezcla de claves
- **Autenticación**: JWT con expiración configurable
- **Salts Únicos**: Cada usuario tiene salts únicos para autenticación y derivación de claves

### Funcionalidades

- Registro e inicio de sesión de usuarios
- Almacenamiento seguro de credenciales
- Generador de contraseñas seguras
- Calificador de fortaleza de contraseñas
- Gestión completa de entradas (crear, leer, actualizar, eliminar)
- Exportación e importación de secretos de dispositivo
- Interfaz de usuario intuitiva y responsive

## Instalación y Uso

### Requisitos

- Python 3.8+
- Node.js (opcional, para servir el frontend)

### Instalación del Backend

1. Instalar dependencias:
```bash
pip install fastapi uvicorn sqlalchemy pydantic passlib[bcrypt] pyjwt cryptography
```

2. Configurar variables de entorno (opcional):
```bash
export JWT_SECRET="tu_secreto_jwt_seguro"
export JWT_EXPIRE_MIN=120
export DB_PATH="./data/server.db"
```

3. Ejecutar el servidor:
```bash
uvicorn backend.app:app --reload --port 8080
```

### Uso del Frontend

1. Abrir `frontend/index.html` en un navegador web
2. O servir con un servidor HTTP simple:
```bash
cd frontend
python -m http.server 8000
```

3. Acceder a `http://localhost:8000` en el navegador

## Lecciones Aprendidas

### Aspectos Técnicos

1. **Importancia de la Encriptación del Lado del Cliente**
   - Implementar la encriptación antes de enviar datos al servidor garantiza que el servidor nunca tenga acceso a los secretos en texto plano
   - Esto añade una capa adicional de seguridad incluso si el servidor es comprometido

2. **Derivación de Claves Robusta**
   - El uso de PBKDF2 con un alto número de iteraciones (210,000) protege contra ataques de fuerza bruta
   - La combinación de contraseña maestra y secreto de dispositivo mediante HKDF añade seguridad adicional

3. **Gestión de Secretos de Dispositivo**
   - Permitir exportar e importar secretos de dispositivo facilita la sincronización entre dispositivos
   - El almacenamiento local del secreto de dispositivo es necesario para la derivación de K_mix

4. **Validación y Manejo de Errores**
   - Implementar validaciones tanto en el cliente como en el servidor mejora la robustez del sistema
   - Mensajes de error claros mejoran la experiencia del usuario

5. **Arquitectura Modular**
   - Separar la lógica en módulos (auth, crypto, database) facilita el mantenimiento y las pruebas
   - El uso de esquemas Pydantic garantiza la validación de datos en la API

### Aspectos de Desarrollo

1. **Documentación del Código**
   - Comentar funciones criptográficas complejas ayuda a entender el flujo de datos
   - Documentar los esquemas de datos facilita la integración frontend-backend

2. **Pruebas Incrementales**
   - Probar cada componente por separado antes de integrar facilita la identificación de errores
   - Las pruebas de integración son cruciales para validar el flujo completo

3. **Manejo de Estados**
   - Gestionar correctamente el estado de autenticación en el frontend es esencial para la seguridad
   - Limpiar datos sensibles al cerrar sesión previene fugas de información

## Retrospectiva del Proyecto

### Lo que Funcionó Bien

1. **Arquitectura de Seguridad**
   - La implementación de encriptación del lado del cliente resultó ser una decisión acertada
   - El uso de algoritmos criptográficos estándar (AES-GCM, PBKDF2, HKDF) proporciona confianza en la seguridad

2. **Separación de Responsabilidades**
   - La división entre backend y frontend facilitó el desarrollo y las pruebas
   - Los módulos bien definidos permitieron trabajar en paralelo en diferentes componentes

3. **Interfaz de Usuario**
   - El diseño simple y funcional resultó efectivo
   - La retroalimentación visual (indicadores de fortaleza, estados de sesión) mejora la experiencia

4. **Base de Datos**
   - SQLite fue una elección adecuada para un proyecto de esta escala
   - La estructura de datos es clara y fácil de mantener

### Desafíos Encontrados

1. **Sincronización de Algoritmos**
   - Asegurar que las implementaciones criptográficas en Python y JavaScript produjeran resultados idénticos requirió atención detallada
   - Las diferencias en el manejo de codificación de strings entre lenguajes causaron algunos problemas iniciales

2. **Gestión de Secretos de Dispositivo**
   - Explicar al usuario la necesidad del secreto de dispositivo y cómo gestionarlo fue un desafío de UX
   - La exportación/importación de secretos requiere documentación clara

3. **Manejo de Errores**
   - Proporcionar mensajes de error útiles sin revelar información sensible fue un equilibrio delicado
   - Algunos errores criptográficos son difíciles de comunicar al usuario final

4. **Testing de Seguridad**
   - Validar que el sistema es realmente seguro requiere conocimientos especializados
   - Las pruebas de penetración y auditorías de seguridad son costosas pero necesarias

### Áreas de Mejora para Futuros Proyectos

1. **Testing**
   - Implementar una suite completa de pruebas unitarias y de integración
   - Agregar pruebas automatizadas de seguridad
   - Implementar pruebas end-to-end para validar flujos completos

2. **Documentación**
   - Crear documentación técnica más detallada de los algoritmos utilizados
   - Documentar los flujos de datos y las decisiones de diseño
   - Proporcionar guías de usuario más completas

3. **Seguridad Adicional**
   - Implementar rate limiting para prevenir ataques de fuerza bruta
   - Agregar autenticación de dos factores (2FA)
   - Implementar logging de seguridad para auditoría
   - Considerar el uso de HSM (Hardware Security Module) para producción

4. **Funcionalidades**
   - Agregar búsqueda y filtrado de entradas
   - Implementar categorías o etiquetas para organizar entradas
   - Agregar historial de cambios en las entradas
   - Implementar sincronización automática entre dispositivos

5. **Experiencia de Usuario**
   - Mejorar la interfaz de gestión de secretos de dispositivo
   - Agregar indicadores visuales más claros del estado de seguridad
   - Implementar autocompletado inteligente
   - Agregar modo offline con sincronización posterior

6. **Infraestructura**
   - Migrar a una base de datos más robusta (PostgreSQL) para producción
   - Implementar backups automáticos
   - Agregar monitoreo y alertas
   - Considerar implementación de caché para mejorar rendimiento

7. **Desarrollo**
   - Implementar CI/CD para despliegues automatizados
   - Agregar linting y formateo automático de código
   - Implementar code review sistemático
   - Establecer estándares de codificación más estrictos

8. **Colaboración en Equipo**
   - Establecer reuniones regulares de sincronización
   - Documentar decisiones técnicas en un ADR (Architecture Decision Record)
   - Implementar pair programming para componentes críticos
   - Crear un proceso de revisión de seguridad antes de cada release

## Conclusión

Este proyecto ha sido una experiencia valiosa en el desarrollo de sistemas seguros. La implementación de técnicas criptográficas modernas, la separación adecuada de responsabilidades y la atención a los detalles de seguridad han resultado en un sistema funcional y relativamente seguro.

Las lecciones aprendidas, especialmente en cuanto a la importancia de las pruebas, la documentación y la planificación de seguridad, serán aplicables a futuros proyectos. El proyecto demuestra que es posible crear un gestor de contraseñas funcional con tecnologías web estándar, aunque requiere un entendimiento profundo de los principios criptográficos y de seguridad.

Para un proyecto de producción, sería necesario invertir significativamente más tiempo en pruebas, auditorías de seguridad, y mejoras en la experiencia de usuario. Sin embargo, este proyecto sirve como una base sólida y demuestra los conceptos fundamentales de seguridad en aplicaciones web.

