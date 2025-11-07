#!/bin/bash

# Script para iniciar el backend de forma estable
# Uso: ./start-backend.sh

cd "$(dirname "$0")/backend"

echo "🚀 Iniciando backend en puerto 5001..."
echo "📝 Logs se guardarán en backend.log"
echo "⏹️  Para detener: Ctrl+C o pkill -f 'nodemon.*IPS_CONTROL_V2'"
echo ""

# Verificar si ya está corriendo
if lsof -ti:5001 > /dev/null 2>&1; then
    echo "⚠️  El backend ya está corriendo en el puerto 5001"
    echo "🔄 Deteniendo proceso anterior..."
    pkill -f "nodemon.*IPS_CONTROL_V2" 2>/dev/null
    sleep 2
fi

# Iniciar el backend
npm run dev 2>&1 | tee backend.log

