#!/bin/bash

# Script para desplegar página de morosos en VPS
# Uso: ./deploy-vps.sh usuario@vps-ip

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar argumentos
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: Debes proporcionar la conexión SSH${NC}"
    echo "Uso: ./deploy-vps.sh usuario@vps-ip"
    echo "Ejemplo: ./deploy-vps.sh root@45.5.56.186"
    exit 1
fi

VPS_CONNECTION=$1
VPS_USER=$(echo $VPS_CONNECTION | cut -d'@' -f1)
VPS_HOST=$(echo $VPS_CONNECTION | cut -d'@' -f2)
APP_DIR="/var/www/pagina-morosos"

echo -e "${GREEN}🚀 Iniciando despliegue de página de morosos${NC}"
echo -e "${YELLOW}VPS: ${VPS_CONNECTION}${NC}"
echo ""

# Paso 1: Verificar conexión SSH
echo -e "${YELLOW}📡 Verificando conexión SSH...${NC}"
if ! ssh -o ConnectTimeout=5 $VPS_CONNECTION "echo 'Conexión exitosa'" > /dev/null 2>&1; then
    echo -e "${RED}❌ No se pudo conectar al VPS${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Conexión SSH exitosa${NC}"
echo ""

# Paso 2: Verificar Node.js
echo -e "${YELLOW}📦 Verificando Node.js...${NC}"
if ! ssh $VPS_CONNECTION "command -v node" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Node.js no está instalado. Instalando...${NC}"
    ssh $VPS_CONNECTION "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
else
    NODE_VERSION=$(ssh $VPS_CONNECTION "node --version")
    echo -e "${GREEN}✅ Node.js instalado: ${NODE_VERSION}${NC}"
fi
echo ""

# Paso 3: Crear directorio
echo -e "${YELLOW}📁 Creando directorio de aplicación...${NC}"
ssh $VPS_CONNECTION "sudo mkdir -p $APP_DIR && sudo chown -R $VPS_USER:$VPS_USER $APP_DIR"
echo -e "${GREEN}✅ Directorio creado${NC}"
echo ""

# Paso 4: Subir archivos
echo -e "${YELLOW}📤 Subiendo archivos...${NC}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
rsync -avz --exclude 'node_modules' --exclude '.git' \
    $SCRIPT_DIR/ $VPS_CONNECTION:$APP_DIR/
echo -e "${GREEN}✅ Archivos subidos${NC}"
echo ""

# Paso 5: Instalar dependencias
echo -e "${YELLOW}📦 Instalando dependencias...${NC}"
ssh $VPS_CONNECTION "cd $APP_DIR && npm install --production"
echo -e "${GREEN}✅ Dependencias instaladas${NC}"
echo ""

# Paso 6: Verificar PM2
echo -e "${YELLOW}🔧 Verificando PM2...${NC}"
if ! ssh $VPS_CONNECTION "command -v pm2" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  PM2 no está instalado. Instalando...${NC}"
    ssh $VPS_CONNECTION "sudo npm install -g pm2"
else
    echo -e "${GREEN}✅ PM2 instalado${NC}"
fi
echo ""

# Paso 7: Detener aplicación si está corriendo
echo -e "${YELLOW}🛑 Deteniendo aplicación anterior (si existe)...${NC}"
ssh $VPS_CONNECTION "cd $APP_DIR && pm2 delete pagina-morosos 2>/dev/null || true"
echo ""

# Paso 8: Iniciar aplicación con PM2
echo -e "${YELLOW}🚀 Iniciando aplicación con PM2...${NC}"
ssh $VPS_CONNECTION "cd $APP_DIR && pm2 start server.js --name pagina-morosos"
ssh $VPS_CONNECTION "pm2 save"
echo -e "${GREEN}✅ Aplicación iniciada${NC}"
echo ""

# Paso 9: Verificar estado
echo -e "${YELLOW}📊 Estado de la aplicación:${NC}"
ssh $VPS_CONNECTION "pm2 status pagina-morosos"
echo ""

# Paso 10: Obtener IP pública del VPS
echo -e "${YELLOW}🌐 Obteniendo IP pública del VPS...${NC}"
VPS_IP=$(ssh $VPS_CONNECTION "curl -s ifconfig.me")
echo -e "${GREEN}✅ IP pública: ${VPS_IP}${NC}"
echo ""

# Paso 11: Probar health check
echo -e "${YELLOW}🏥 Probando health check...${NC}"
sleep 2
if ssh $VPS_CONNECTION "curl -s http://localhost:3001/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check exitoso${NC}"
else
    echo -e "${RED}⚠️  Health check falló, pero la aplicación puede estar iniciando...${NC}"
fi
echo ""

echo -e "${GREEN}✅ Despliegue completado!${NC}"
echo ""
echo -e "${YELLOW}📝 Próximos pasos:${NC}"
echo "1. Configurar firewall:"
echo "   ssh $VPS_CONNECTION 'sudo ufw allow 3001/tcp'"
echo ""
echo "2. Acceder a la página:"
echo "   http://${VPS_IP}:3001"
echo ""
echo "3. Configurar redirección en MikroTik usando la IP: ${VPS_IP}"
echo ""
echo "4. Ver logs:"
echo "   ssh $VPS_CONNECTION 'pm2 logs pagina-morosos'"
echo ""

