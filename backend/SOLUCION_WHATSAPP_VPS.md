# 🔧 Solución: Error 404 al conectar con API de WhatsApp en VPS

## Problema
El backend recibe error 404 al intentar conectarse a `http://localhost:3001/api/send`, aunque la API está corriendo.

## Causa
En el VPS, `localhost` puede no resolver correctamente o puede haber un proxy/nginx interceptando las peticiones.

## Solución

### 1. Verificar que el backend tiene la variable de entorno configurada

```bash
# Navegar al directorio del backend
cd ~/apps/bresscloud/IPS_CONTROL_V2/backend

# Verificar el archivo .env
cat .env | grep WHATSAPP

# Si no está, agregarlo:
echo "WHATSAPP_API_URL=http://127.0.0.1:3001" >> .env
```

**Nota:** Usar `127.0.0.1` en lugar de `localhost` es más confiable en servidores Linux.

### 2. Probar la conexión desde el servidor

```bash
# Probar el endpoint directamente desde el servidor
curl -X POST http://127.0.0.1:3001/api/send \
  -H "Content-Type: application/json" \
  -d '{"to":"51994039856","message":"Test"}'

# Si funciona, deberías ver una respuesta JSON o un error de WhatsApp (no 404)
# Si da 404, hay un problema de red o proxy
```

### 3. Verificar que no hay un proxy/nginx interceptando

```bash
# Verificar si hay nginx corriendo
sudo systemctl status nginx

# Verificar configuración de nginx
sudo cat /etc/nginx/sites-enabled/* | grep 3001

# Si hay configuración de nginx para el puerto 3001, puede estar causando el problema
```

### 4. Reiniciar el backend después de cambiar el .env

```bash
# Reiniciar el backend para que cargue la nueva variable
pm2 restart ips-backend

# Verificar logs para ver qué URL está usando
pm2 logs ips-backend --lines 20 | grep WhatsApp

# Debe mostrar: "✅ WhatsApp API URL configurado: http://127.0.0.1:3001"
```

### 5. Verificar que ambos procesos están en el mismo servidor

```bash
# Ver procesos PM2
pm2 list

# Debe mostrar tanto "ips-backend" como "whatsapp-api" corriendo
```

### 6. Probar desde el backend directamente

```bash
# Conectarse al servidor y ejecutar Node.js directamente
node -e "
const http = require('http');
const data = JSON.stringify({to: '51994039856', message: 'Test'});
const options = {
  hostname: '127.0.0.1',
  port: 3001,
  path: '/api/send',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};
const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  res.on('data', (d) => process.stdout.write(d));
});
req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
"
```

## Solución alternativa: Usar la IP de ZeroTier

Si `127.0.0.1` no funciona, puedes usar la IP de ZeroTier:

```bash
# En el .env del backend
WHATSAPP_API_URL=http://10.34.115.205:3001
```

Pero esto solo funciona si ambos procesos pueden comunicarse por ZeroTier.

## Verificación final

Después de aplicar los cambios:

1. Verificar que el backend muestra la URL correcta en los logs:
   ```bash
   pm2 logs ips-backend | grep "WhatsApp API URL"
   ```

2. Intentar crear un ticket o registrar un pago desde el frontend

3. Verificar los logs del backend para ver si la conexión funciona:
   ```bash
   pm2 logs ips-backend --lines 50
   ```

4. Verificar los logs de la API de WhatsApp para ver si recibe las peticiones:
   ```bash
   pm2 logs whatsapp-api --lines 50
   ```

## Si el problema persiste

1. Verificar que el puerto 3001 no está bloqueado por firewall:
   ```bash
   sudo ufw status | grep 3001
   ```

2. Verificar que ambos procesos pueden comunicarse:
   ```bash
   # Desde el proceso del backend, verificar conectividad
   netstat -tulpn | grep 3001
   ```

3. Verificar logs detallados del error:
   ```bash
   pm2 logs ips-backend --err --lines 100
   ```

