#!/bin/bash
# Script para ejecutar el envío masivo de notificaciones de deuda AHORA
# Uso: ./send-debt-now.sh [--dry-run]

# Obtener la ruta del script (independiente de dónde se ejecute)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Cambiar al directorio del backend
cd "$BACKEND_DIR"

# Cargar variables de entorno si existe .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Crear directorio de logs si no existe
mkdir -p logs

# Pasar todos los argumentos al script de Node
/usr/bin/node "$SCRIPT_DIR/send-debt-notifications-all.js" "$@" | tee "$BACKEND_DIR/logs/debt-notifications-$(date +%Y%m%d-%H%M%S).log"

