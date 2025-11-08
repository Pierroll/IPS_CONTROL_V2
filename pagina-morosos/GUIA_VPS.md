# 🚀 Guía: Desplegar Página de Morosos en VPS

## 📋 Requisitos Previos

- VPS con acceso SSH
- Node.js instalado (versión 14 o superior)
- Acceso root o usuario con permisos sudo

---

## Paso 1: Conectarse al VPS

```bash
ssh usuario@tu-vps-ip
# Ejemplo: ssh root@45.5.56.186
```

---

## Paso 2: Instalar Node.js (si no está instalado)

### Opción A: Usando NVM (Recomendado)

```bash
# Instalar NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Recargar configuración
source ~/.bashrc

# Instalar Node.js LTS
nvm install --lts
nvm use --lts

# Verificar instalación
node --version
npm --version
```

### Opción B: Usando el gestor de paquetes del sistema

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**CentOS/RHEL:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

---

## Paso 3: Crear Directorio para la Aplicación

```bash
# Crear directorio
sudo mkdir -p /var/www/pagina-morosos
sudo chown -R $USER:$USER /var/www/pagina-morosos

# O usar un directorio en el home del usuario
mkdir -p ~/pagina-morosos
cd ~/pagina-morosos
```

---

## Paso 4: Subir Archivos al VPS

### Opción A: Usando SCP (desde tu máquina local)

```bash
# Desde tu máquina local (en la carpeta IPS_CONTROL_V2)
scp -r pagina-morosos/* usuario@tu-vps-ip:/var/www/pagina-morosos/

# O si usas el directorio home
scp -r pagina-morosos/* usuario@tu-vps-ip:~/pagina-morosos/
```

### Opción B: Usando Git (si tienes el repositorio en GitHub)

```bash
# En el VPS
cd /var/www/pagina-morosos
git clone https://github.com/tu-usuario/IPS_CONTROL_V2.git .
# O solo clonar la carpeta específica
```

### Opción C: Usando rsync (más eficiente)

```bash
# Desde tu máquina local
rsync -avz --exclude 'node_modules' pagina-morosos/ usuario@tu-vps-ip:/var/www/pagina-morosos/
```

### Opción D: Usando SFTP (FileZilla, WinSCP, etc.)

1. Conecta con tu cliente SFTP
2. Navega a `/var/www/pagina-morosos` o `~/pagina-morosos`
3. Sube todos los archivos de la carpeta `pagina-morosos`

**Archivos necesarios:**
- `server.js`
- `package.json`
- `index.html`
- Carpeta `images/` completa

---

## Paso 5: Instalar Dependencias

```bash
# En el VPS, navegar al directorio
cd /var/www/pagina-morosos
# o
cd ~/pagina-morosos

# Instalar dependencias
npm install --production
```

---

## Paso 6: Configurar Variables de Entorno (Opcional)

```bash
# Crear archivo .env si necesitas cambiar el puerto
nano .env
```

Contenido del `.env`:
```
PORT=3001
NODE_ENV=production
```

---

## Paso 7: Probar que Funciona

```bash
# Ejecutar manualmente para probar
node server.js
```

Deberías ver:
```
🚫 Página de morosos corriendo en: http://localhost:3001
📋 Health check: http://localhost:3001/health
🌐 Acceso directo: http://localhost:3001
```

**Presiona Ctrl+C para detener.**

---

## Paso 8: Instalar PM2 (Gestor de Procesos)

PM2 mantiene la aplicación corriendo y la reinicia automáticamente si se cae.

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# O con npm sin sudo (si tienes NVM)
npm install -g pm2
```

---

## Paso 9: Iniciar la Aplicación con PM2

```bash
# Navegar al directorio
cd /var/www/pagina-morosos
# o
cd ~/pagina-morosos

# Iniciar con PM2
pm2 start server.js --name "pagina-morosos"

# Verificar que está corriendo
pm2 status

# Ver logs
pm2 logs pagina-morosos

# Guardar configuración para que se inicie al reiniciar el servidor
pm2 save

# Configurar PM2 para iniciar al arrancar el sistema
pm2 startup
# Ejecuta el comando que te muestre (algo como: sudo env PATH=...)
```

---

## Paso 10: Configurar Firewall

### Si usas UFW (Ubuntu/Debian):

```bash
# Permitir puerto 3001
sudo ufw allow 3001/tcp

# Verificar estado
sudo ufw status
```

### Si usas firewalld (CentOS/RHEL):

```bash
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

### Si usas iptables:

```bash
sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
sudo iptables-save
```

---

## Paso 11: Configurar Nginx como Reverse Proxy (Recomendado)

Esto permite usar el puerto 80 (HTTP) y tener un dominio.

### Instalar Nginx:

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx -y

# CentOS/RHEL
sudo yum install nginx -y
```

### Configurar Nginx:

```bash
sudo nano /etc/nginx/sites-available/pagina-morosos
# O en CentOS/RHEL:
sudo nano /etc/nginx/conf.d/pagina-morosos.conf
```

**Contenido del archivo:**

```nginx
server {
    listen 80;
    server_name tu-dominio.com;  # O tu IP pública

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Habilitar el sitio:

```bash
# Ubuntu/Debian
sudo ln -s /etc/nginx/sites-available/pagina-morosos /etc/nginx/sites-enabled/
sudo nginx -t  # Verificar configuración
sudo systemctl restart nginx

# CentOS/RHEL
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## Paso 12: Configurar SSL con Let's Encrypt (Opcional pero Recomendado)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y
# O en CentOS:
sudo yum install certbot python3-certbot-nginx -y

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com

# Renovación automática (ya viene configurado)
sudo certbot renew --dry-run
```

---

## Paso 13: Configurar Redirección en MikroTik

Una vez que la página esté corriendo en tu VPS, configura la redirección en el MikroTik.

### Obtener la IP pública de tu VPS:

```bash
curl ifconfig.me
# O
curl ipinfo.io/ip
```

### Usar el script de configuración:

```bash
# En el VPS o desde tu máquina local
cd /var/www/pagina-morosos
# Configurar variables
export MIKROTIK_IP="45.5.56.186"  # IP de tu MikroTik
export MIKROTIK_USER="admin"
export MIKROTIK_PASSWORD="tu_password"
export MIKROTIK_PORT="8728"  # Puerto API del MikroTik
export PAGINA_MOROSOS_IP="TU_IP_PUBLICA_VPS"  # IP pública de tu VPS
export PAGINA_MOROSOS_PORT="80"  # O 3001 si no usas nginx

# Ejecutar script
node configurar-redireccion-mikrotik.js
```

### O configurar manualmente en MikroTik:

```bash
# 1. Crear pool
/ip pool add name=POOL_CORTE_MOROSO ranges=192.168.100.100-192.168.100.200

# 2. Configurar perfil
/ppp/profile set [find name="CORTE MOROSO"] remote-address=POOL_CORTE_MOROSO

# 3. Redirección HTTP
/ip firewall nat add \
  chain=dstnat \
  dst-address=192.168.100.100-192.168.100.200 \
  dst-port=80 \
  protocol=tcp \
  action=dst-nat \
  to-addresses=TU_IP_PUBLICA_VPS \
  to-ports=80 \
  comment="REDIRECT_MOROSOS"
```

---

## ✅ Verificación Final

1. **Verificar que PM2 está corriendo:**
```bash
pm2 status
pm2 logs pagina-morosos
```

2. **Probar desde el navegador:**
```
http://TU_IP_PUBLICA_VPS
# O si configuraste dominio:
http://tu-dominio.com
```

3. **Probar health check:**
```bash
curl http://localhost:3001/health
# O desde fuera:
curl http://TU_IP_PUBLICA_VPS/health
```

---

## 🔧 Comandos Útiles de PM2

```bash
# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs pagina-morosos

# Reiniciar aplicación
pm2 restart pagina-morosos

# Detener aplicación
pm2 stop pagina-morosos

# Iniciar aplicación
pm2 start pagina-morosos

# Eliminar de PM2
pm2 delete pagina-morosos

# Monitoreo
pm2 monit
```

---

## 🐛 Solución de Problemas

### La aplicación no inicia:

```bash
# Ver logs detallados
pm2 logs pagina-morosos --lines 50

# Verificar que el puerto no esté en uso
sudo lsof -i :3001
# O
sudo netstat -tulpn | grep 3001
```

### No puedo acceder desde fuera:

1. Verificar firewall:
```bash
sudo ufw status
```

2. Verificar que nginx está corriendo:
```bash
sudo systemctl status nginx
```

3. Verificar logs de nginx:
```bash
sudo tail -f /var/log/nginx/error.log
```

### La aplicación se detiene:

```bash
# Verificar logs de PM2
pm2 logs pagina-morosos --err

# Reiniciar PM2
pm2 restart pagina-morosos
```

---

## 📝 Resumen de Comandos Rápidos

```bash
# 1. Conectarse al VPS
ssh usuario@tu-vps-ip

# 2. Subir archivos (desde tu máquina local)
scp -r pagina-morosos/* usuario@tu-vps-ip:/var/www/pagina-morosos/

# 3. En el VPS: Instalar dependencias
cd /var/www/pagina-morosos && npm install --production

# 4. Iniciar con PM2
pm2 start server.js --name "pagina-morosos"
pm2 save
pm2 startup

# 5. Configurar firewall
sudo ufw allow 3001/tcp

# 6. Verificar
pm2 status
curl http://localhost:3001/health
```

---

## 🎯 Checklist de Despliegue

- [ ] Node.js instalado en el VPS
- [ ] Archivos subidos al VPS
- [ ] Dependencias instaladas (`npm install`)
- [ ] Aplicación probada manualmente (`node server.js`)
- [ ] PM2 instalado y configurado
- [ ] Aplicación corriendo con PM2
- [ ] PM2 configurado para iniciar al arrancar
- [ ] Firewall configurado (puerto 3001 o 80)
- [ ] Nginx configurado (opcional pero recomendado)
- [ ] SSL configurado (opcional pero recomendado)
- [ ] Redirección configurada en MikroTik
- [ ] Prueba desde navegador externo exitosa

---

¡Listo! Tu página de morosos debería estar corriendo en tu VPS. 🚀

