# 🚀 Cómo Iniciar Backend y Frontend en el VPS

## Iniciar Backend

```bash
# 1. Navegar al directorio del backend
cd ~/apps/bresscloud/IPS_CONTROL_V2/backend

# 2. Verificar que existe el archivo .env
ls -la .env

# 3. Iniciar con PM2
pm2 start npm --name "ips-backend" -- run dev

# 4. Verificar que está corriendo
pm2 status

# 5. Ver logs
pm2 logs ips-backend --lines 20
```

## Iniciar Frontend

```bash
# 1. Navegar al directorio del frontend
cd ~/apps/bresscloud/IPS_CONTROL_V2/frontend

# 2. Verificar que existe el build (si es producción)
ls -la .next

# Si no existe, hacer build primero:
# npm run build

# 3. Iniciar con PM2
pm2 start npm --name "frontend" -- start

# 4. Verificar que está corriendo
pm2 status

# 5. Ver logs
pm2 logs frontend --lines 20
```

## Iniciar API de WhatsApp (si no está corriendo)

```bash
# 1. Navegar al directorio de la API
cd ~/apps/bresscloud/IPS_CONTROL_V2/API-Whatsapp

# 2. Iniciar con PM2
pm2 start ecosystem.config.js

# 3. Verificar que está corriendo
pm2 status

# 4. Ver logs
pm2 logs whatsapp-api --lines 20
```

## Ver todos los procesos

```bash
# Ver estado de todos los procesos
pm2 status

# Ver logs de todos los procesos
pm2 logs --lines 20

# Ver logs en tiempo real
pm2 logs
```

## Guardar configuración

```bash
# Guardar la configuración para que se inicie al reiniciar el servidor
pm2 save

# Configurar PM2 para iniciar al arrancar el sistema (solo la primera vez)
pm2 startup
# Ejecuta el comando que te muestre
```

## Comandos útiles

```bash
# Reiniciar un proceso
pm2 restart ips-backend
pm2 restart frontend
pm2 restart whatsapp-api

# Detener un proceso
pm2 stop ips-backend
pm2 stop frontend
pm2 stop whatsapp-api

# Eliminar un proceso
pm2 delete ips-backend
pm2 delete frontend
pm2 delete whatsapp-api

# Ver información detallada de un proceso
pm2 show ips-backend
pm2 show frontend
pm2 show whatsapp-api

# Monitoreo en tiempo real
pm2 monit
```

## Verificar que todo funciona

```bash
# Backend (puerto 5001)
curl http://localhost:5001/api/health

# Frontend (puerto 3000)
curl http://localhost:3000

# API WhatsApp (puerto 3001)
curl http://localhost:3001/api/status
```

