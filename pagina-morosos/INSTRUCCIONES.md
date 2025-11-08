# 🚫 Instrucciones: Página de Morosos y Pool de Corte

## ✅ Estado Actual

- ✅ **Página de morosos corriendo en:** `http://localhost:3001`
- ✅ **Health check:** `http://localhost:3001/health`

## 📋 Pasos para Configurar la Redirección en MikroTik

### Opción 1: Usar el Script Automático

1. **Configurar variables de entorno** (opcional):
```bash
export MIKROTIK_IP="192.168.1.1"  # IP de tu MikroTik
export MIKROTIK_USER="admin"
export MIKROTIK_PASSWORD="tu_password"
export PAGINA_MOROSOS_IP="TU_IP_PUBLICA"  # IP donde está corriendo la página
export PAGINA_MOROSOS_PORT="3001"
```

2. **Ejecutar el script**:
```bash
cd pagina-morosos
node configurar-redireccion-mikrotik.js
```

### Opción 2: Configuración Manual en MikroTik

#### Paso 1: Crear Pool de Direcciones IP

```bash
# En el terminal del MikroTik o Winbox
/ip pool add name=POOL_CORTE_MOROSO ranges=192.168.100.100-192.168.100.200
```

**Nota:** Ajusta el rango según tu red. Este pool será usado para clientes cortados.

#### Paso 2: Configurar Perfil PPPoE "CORTE MOROSO"

```bash
# Verificar si el perfil existe
/ppp/profile print where name="CORTE MOROSO"

# Si existe, actualizarlo:
/ppp/profile set [find name="CORTE MOROSO"] remote-address=POOL_CORTE_MOROSO

# Si no existe, crearlo:
/ppp/profile add name="CORTE MOROSO" remote-address=POOL_CORTE_MOROSO rate-limit="0/0"
```

#### Paso 3: Configurar Redirección HTTP

```bash
# Redirigir HTTP (puerto 80) al servidor de la página de morosos
/ip firewall nat add \
  chain=dstnat \
  dst-address=192.168.100.100-192.168.100.200 \
  dst-port=80 \
  protocol=tcp \
  action=dst-nat \
  to-addresses=TU_IP_PUBLICA \
  to-ports=3001 \
  comment="REDIRECT_MOROSOS"
```

**Reemplaza:**
- `192.168.100.100-192.168.100.200` → Rango del pool que creaste
- `TU_IP_PUBLICA` → IP pública donde está corriendo la página de morosos

#### Paso 4: Configurar Redirección HTTPS (Opcional)

```bash
/ip firewall nat add \
  chain=dstnat \
  dst-address=192.168.100.100-192.168.100.200 \
  dst-port=443 \
  protocol=tcp \
  action=dst-nat \
  to-addresses=TU_IP_PUBLICA \
  to-ports=3001 \
  comment="REDIRECT_MOROSOS_HTTPS"
```

## 🔄 Cómo Funciona

1. **Cliente es cortado** → Perfil cambia a "CORTE MOROSO"
2. **Cliente se reconecta** → Obtiene IP del pool `POOL_CORTE_MOROSO`
3. **Cliente intenta navegar** → Regla de firewall redirige HTTP/HTTPS
4. **Cliente ve la página** → Página de morosos con métodos de pago

## 🌐 Exponer la Página Públicamente

Si quieres que la página sea accesible desde internet:

### Opción A: Usar ngrok (Desarrollo/Pruebas)

```bash
# Instalar ngrok
brew install ngrok  # macOS
# o descargar desde https://ngrok.com

# Exponer el puerto 3001
ngrok http 3001
```

Usa la URL que ngrok te da como `PAGINA_MOROSOS_IP`.

### Opción B: Configurar en tu Servidor (Producción)

1. **Configurar firewall** para permitir puerto 3001
2. **Usar tu IP pública** o dominio
3. **Configurar reverse proxy** (nginx/apache) si es necesario

## 🧪 Probar la Configuración

1. **Verificar que la página funciona:**
```bash
curl http://localhost:3001/health
```

2. **Probar desde el navegador:**
```
http://localhost:3001
```

3. **Verificar reglas en MikroTik:**
```bash
/ip firewall nat print where comment~"REDIRECT_MOROSOS"
/ip pool print where name="POOL_CORTE_MOROSO"
/ppp/profile print where name="CORTE MOROSO"
```

## 📝 Notas Importantes

- **IP Pública:** Si la página está en localhost, necesitas exponerla públicamente o usar la IP de tu servidor
- **Puerto:** Asegúrate de que el puerto 3001 esté abierto en el firewall
- **Pool de IPs:** El rango debe estar en una red diferente o configurado correctamente en tu router
- **Perfil PPPoE:** El perfil "CORTE MOROSO" debe existir y estar configurado para usar el pool

## 🚀 Mantener el Servidor Corriendo

Para mantener la página corriendo:

```bash
cd pagina-morosos
npm start
```

O usar PM2:

```bash
pm2 start npm --name "pagina-morosos" -- start
pm2 save
```

