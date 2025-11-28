#!/bin/bash

# Script para generar certificados SSL autofirmados para desarrollo local
# Uso: ./generate-ssl.sh

echo "==================================="
echo "Generando certificados SSL autofirmados"
echo "==================================="

# Crear directorio ssl si no existe
mkdir -p ssl

# Generar clave privada (2048 bits)
openssl genrsa -out ssl/server.key 2048

echo ""
echo "Clave privada generada: ssl/server.key"
echo ""

# Generar certificado autofirmado (válido por 365 días)
openssl req -new -x509 -key ssl/server.key -out ssl/server.crt -days 365 \
  -subj "/C=ES/ST=Madrid/L=Madrid/O=Password Manager/OU=Development/CN=localhost"

echo "Certificado generado: ssl/server.crt"
echo ""

# Mostrar información del certificado
echo "==================================="
echo "Información del certificado:"
echo "==================================="
openssl x509 -in ssl/server.crt -noout -text | grep -A2 "Subject:"
openssl x509 -in ssl/server.crt -noout -text | grep -A2 "Validity"

echo ""
echo "==================================="
echo "Certificados generados exitosamente"
echo "==================================="
echo ""
echo "Archivos creados:"
echo "  - ssl/server.key (clave privada)"
echo "  - ssl/server.crt (certificado público)"
echo ""
echo "NOTA: Estos son certificados autofirmados para desarrollo."
echo "Los navegadores mostrarán una advertencia de seguridad."
echo "Para producción, usa certificados de una CA confiable."
