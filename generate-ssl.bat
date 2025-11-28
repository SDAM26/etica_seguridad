@echo off
REM Script para generar certificados SSL autofirmados para desarrollo local
REM Uso: generate-ssl.bat
REM Requisito: OpenSSL instalado (https://slproweb.com/products/Win32OpenSSL.html)

echo ===================================
echo Generando certificados SSL autofirmados
echo ===================================
echo.

REM Crear directorio ssl si no existe
if not exist ssl mkdir ssl

REM Generar clave privada (2048 bits)
openssl genrsa -out ssl/server.key 2048

echo.
echo Clave privada generada: ssl/server.key
echo.

REM Generar certificado autofirmado (válido por 365 días)
openssl req -new -x509 -key ssl/server.key -out ssl/server.crt -days 365 -subj "/C=ES/ST=Madrid/L=Madrid/O=Password Manager/OU=Development/CN=localhost"

echo Certificado generado: ssl/server.crt
echo.

REM Mostrar información del certificado
echo ===================================
echo Información del certificado:
echo ===================================
openssl x509 -in ssl/server.crt -noout -subject -dates

echo.
echo ===================================
echo Certificados generados exitosamente
echo ===================================
echo.
echo Archivos creados:
echo   - ssl/server.key (clave privada)
echo   - ssl/server.crt (certificado público)
echo.
echo NOTA: Estos son certificados autofirmados para desarrollo.
echo Los navegadores mostraran una advertencia de seguridad.
echo Para produccion, usa certificados de una CA confiable.
echo.
pause
