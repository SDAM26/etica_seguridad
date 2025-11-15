#!/bin/bash
# Script de inicio rápido para Password Manager

echo "=========================================="
echo "  🔐 Password Manager"
echo "=========================================="
echo ""

# Verificar si Docker está corriendo
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker no está corriendo"
    echo "   Por favor inicia Docker Desktop y vuelve a intentar"
    exit 1
fi

echo "✅ Docker está corriendo"
echo ""

# Construir e iniciar
echo "🔨 Construyendo imagen Docker..."
echo "   (Primera vez: ~5-10 minutos)"
echo ""

docker-compose up --build -d

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "  ✅ Servidor iniciado correctamente"
    echo "=========================================="
    echo ""
    echo "📱 Abre tu navegador en:"
    echo "   👉 http://localhost:8080"
    echo ""
    echo "📚 Documentación API:"
    echo "   👉 http://localhost:8080/docs"
    echo ""
    echo "📋 Ver logs:"
    echo "   docker-compose logs -f"
    echo ""
    echo "🛑 Detener:"
    echo "   docker-compose down"
    echo ""
else
    echo ""
    echo "❌ Error al iniciar el servidor"
    echo "   Revisa los logs: docker-compose logs"
    exit 1
fi
