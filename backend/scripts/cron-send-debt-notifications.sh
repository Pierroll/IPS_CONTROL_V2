#!/bin/bash
# Script para ejecutar el envío masivo de notificaciones de deuda
# Ejecutado por cron el día 25 de cada mes

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

# Ejecutar el script y guardar logs
/usr/bin/node "$SCRIPT_DIR/send-debt-notifications-all.js" >> "$BACKEND_DIR/logs/debt-notifications-$(date +%Y%m%d).log" 2>&1

