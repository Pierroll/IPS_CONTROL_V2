# 🔍 Diagnóstico: Error 404 al conectar con API de WhatsApp

## ⚠️ NO usar 0.0.0.0
`0.0.0.0` es solo para que el servidor **escuche** en todas las interfaces, NO es una dirección válida para **conectarse** desde el cliente.

## Diagnóstico paso a paso

### 1. Verificar qué está realmente escuchando en el puerto 3001

```bash
# Ver qué proceso está usando el puerto 3001
sudo lsof -i :3001

# O con netstat
sudo netstat -tulpn | grep 3001

# Debe mostrar el proceso de Node.js (api_ws.js)
```

### 2. Probar la conexión directamente desde el servidor

```bash
# Probar con curl desde el servidor mismo
curl -v http://127.0.0.1:3001/api/status

# Si esto funciona, deberías ver:
# {"status":"connected",...} o {"status":"disconnected",...}

# Si da 404, hay algo interceptando las peticiones
```

### 3. Verificar si hay un proxy/nginx interceptando

```bash
# Verificar si nginx está corriendo
sudo systemctl status nginx

# Ver todas las configuraciones de nginx
sudo ls -la /etc/nginx/sites-enabled/

# Buscar si hay alguna configuración para el puerto 3001
sudo grep -r "3001" /etc/nginx/

# Ver si hay algún proxy reverso configurado
sudo cat /etc/nginx/sites-enabled/*
```

### 4. Verificar los logs de la API de WhatsApp cuando haces una petición

```bash
# En una terminal, ver logs en tiempo real
pm2 logs whatsapp-api --lines 0

# En otra terminal, hacer una petición de prueba
curl -X POST http://127.0.0.1:3001/api/send \
  -H "Content-Type: application/json" \
  -d '{"to":"51994039856","message":"Test"}'

# ¿Aparece algo en los logs de whatsapp-api?
# Si NO aparece nada, la petición no está llegando a la API
```

### 5. Verificar que la API realmente está escuchando

```bash
# Verificar que el proceso está corriendo
ps aux | grep api_ws.js

# Verificar que está escuchando en el puerto correcto
sudo ss -tlnp | grep 3001

# Debe mostrar algo como:
# LISTEN 0 511 0.0.0.0:3001 0.0.0.0:* users:(("node",pid=XXXX,fd=XX))
```

### 6. Probar conectarse directamente con Node.js

```bash
# Crear un script de prueba
cat > /tmp/test-whatsapp.js << 'EOF'
const http = require('http');

const data = JSON.stringify({
  to: '51994039856',
  message: 'Test desde servidor'
});

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

console.log('Intentando conectar a:', `http://${options.hostname}:${options.port}${options.path}`);

const req = http.request(options, (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:', body);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  console.error('Code:', e.code);
});

req.write(data);
req.end();
EOF

# Ejecutar el script
node /tmp/test-whatsapp.js
```

### 7. Verificar variables de entorno del backend

```bash
# Ver qué URL está usando realmente el backend
cd ~/apps/bresscloud/IPS_CONTROL_V2/backend

# Ver el .env
cat .env | grep WHATSAPP

# Ver los logs del backend al iniciar
pm2 logs ips-backend --lines 50 | grep -i whatsapp

# Debe mostrar: "✅ WhatsApp API URL configurado: http://..."
```

### 8. Verificar si hay firewall bloqueando

```bash
# Verificar reglas de firewall
sudo ufw status verbose

# Verificar iptables
sudo iptables -L -n | grep 3001
```

## Posibles causas del 404

1. **Nginx/proxy interceptando**: Si hay un nginx configurado para el puerto 3001, puede estar devolviendo 404
2. **Otro servicio en el puerto**: Puede haber otro servicio usando el puerto 3001
3. **Problema de red local**: Problemas de routing interno
4. **La API no está realmente escuchando**: Aunque los logs digan que sí

## Solución temporal: Probar con la IP de ZeroTier

Si todo lo demás falla, puedes intentar usar la IP de ZeroTier:

```bash
# En el .env del backend
WHATSAPP_API_URL=http://10.34.115.205:3001
```

Pero esto solo funciona si ambos procesos pueden comunicarse por ZeroTier (deben estar en la misma red ZeroTier).

## Comandos de diagnóstico rápido

```bash
# 1. Ver qué está en el puerto 3001
sudo lsof -i :3001

# 2. Probar conexión
curl -v http://127.0.0.1:3001/api/status

# 3. Ver logs de la API en tiempo real
pm2 logs whatsapp-api --lines 0

# 4. Ver logs del backend
pm2 logs ips-backend --lines 50 | grep -i whatsapp

# 5. Verificar procesos PM2
pm2 list
```

