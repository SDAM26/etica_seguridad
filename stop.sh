#!/bin/bash
# Script para detener Password Manager

echo "🛑 Deteniendo Password Manager..."
docker-compose down

if [ $? -eq 0 ]; then
    echo "✅ Servidor detenido correctamente"
else
    echo "❌ Error al detener el servidor"
    exit 1
fi
