#!/bin/bash

# Script para iniciar la página de morosos
# Uso: ./start.sh

cd "$(dirname "$0")"

echo "🚀 Iniciando página de morosos..."
echo "📝 Logs se guardarán en pagina-morosos.log"
echo "⏹️  Para detener: Ctrl+C o pkill -f 'node.*server.js.*pagina-morosos'"
echo ""

# Verificar si ya está corriendo
if lsof -ti:3001 > /dev/null 2>&1; then
    echo "⚠️  La página ya está corriendo en el puerto 3001"
    echo "🔄 Deteniendo proceso anterior..."
    pkill -f "node.*server.js.*pagina-morosos" 2>/dev/null
    sleep 2
fi

# Iniciar el servidor
npm start 2>&1 | tee pagina-morosos.log

