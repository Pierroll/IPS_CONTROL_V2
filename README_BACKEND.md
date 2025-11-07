# 🚀 Cómo mantener el Backend corriendo

## Problema
El backend se detiene automáticamente cuando se cierra la terminal o hay algún error.

## Solución 1: Terminal separada (Recomendado)

Abre una terminal nueva y ejecuta:

```bash
cd /Users/ruffner/Documents/BRESSCLOUD/IPS_CONTROL_V2/backend
npm run dev
```

**Mantén esta terminal abierta** mientras uses el sistema.

## Solución 2: Usar el script de inicio

```bash
cd /Users/ruffner/Documents/BRESSCLOUD/IPS_CONTROL_V2
./start-backend.sh
```

## Solución 3: Usar PM2 (Producción)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar el backend con PM2
cd /Users/ruffner/Documents/BRESSCLOUD/IPS_CONTROL_V2/backend
pm2 start npm --name "ips-backend" -- run dev

# Ver estado
pm2 status

# Ver logs
pm2 logs ips-backend

# Detener
pm2 stop ips-backend
```

## Verificar que está corriendo

```bash
# Verificar puerto
lsof -ti:5001

# Probar conexión
curl http://localhost:5001/api/health
```

Debería responder: `{"status":"OK","timestamp":"..."}`

## Si el backend se detiene

1. Verifica los logs en `backend/backend.log`
2. Verifica que PostgreSQL esté corriendo: `brew services list | grep postgresql`
3. Reinicia el backend con uno de los métodos arriba

