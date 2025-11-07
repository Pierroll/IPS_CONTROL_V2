# 📘 Guía de Instalación y Ejecución - IPS CONTROL V2

Esta guía te ayudará a configurar y ejecutar el sistema completo de gestión para IPS.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (versión 18 o superior)
- **PostgreSQL** (versión 12 o superior)
- **npm** o **yarn**
- **Git** (opcional, para clonar el repositorio)

## 🗂️ Estructura del Proyecto

El sistema está dividido en dos partes principales:

```
IPS_CONTROL_V2/
├── backend/          # API REST con Node.js + Express + Prisma
├── frontend/         # Aplicación web con Next.js + TypeScript
├── pagina-morosos/   # Proyecto separado (página de morosos)
└── prueba mikrotik/  # Proyecto de pruebas
```

## 🚀 Pasos de Instalación

### 1. Configurar la Base de Datos PostgreSQL

#### 1.1. Crear la base de datos

```bash
# Conectarse a PostgreSQL
psql -U postgres

# Crear la base de datos
CREATE DATABASE internet_service;

# Salir de psql
\q
```

#### 1.2. Verificar que PostgreSQL esté corriendo

```bash
# Verificar el estado del servicio
# En macOS:
brew services list | grep postgresql

# En Linux:
sudo systemctl status postgresql

# En Windows:
# Verificar en Servicios de Windows
```

### 2. Configurar el Backend

#### 2.1. Navegar al directorio del backend

```bash
cd backend
```

#### 2.2. Instalar dependencias

```bash
npm install
```

#### 2.3. Crear archivo de configuración `.env`

Crea un archivo `.env` en la carpeta `backend/` con el siguiente contenido:

```env
# Base de datos PostgreSQL
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/internet_service?schema=public"

# JWT Secret (genera uno seguro con: openssl rand -base64 32)
JWT_SECRET="tu_secreto_jwt_muy_seguro_aqui"

# Puerto del servidor backend
PORT=5001

# URL del frontend (para CORS)
FRONTEND_URL="http://localhost:3000"

# (Opcional) Configuración de email
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=tu_email@gmail.com
# SMTP_PASS=tu_password
```

**⚠️ IMPORTANTE:**
- Reemplaza `TU_PASSWORD` con tu contraseña de PostgreSQL
- Genera un `JWT_SECRET` seguro usando: `openssl rand -base64 32`
- Si tu PostgreSQL usa otro usuario, ajusta la URL de conexión

#### 2.4. Crear las secuencias de PostgreSQL

**⚠️ IMPORTANTE:** Antes de ejecutar `prisma:push`, necesitas crear las secuencias de PostgreSQL que el sistema usa para generar códigos automáticos.

```bash
# Ejecutar el script de secuencias
psql -U postgres -d isp_db -f create-sequences.sql
```

Si tu base de datos tiene otro nombre, ajusta el comando. El script creará las secuencias:
- `plan_seq` - Para códigos de planes
- `invoice_seq` - Para números de factura
- `payment_seq` - Para números de pago
- `receipt_seq` - Para números de recibo
- `contract_seq` - Para números de contrato

#### 2.5. Generar el cliente de Prisma

```bash
npm run prisma:generate
```

#### 2.6. Ejecutar las migraciones de la base de datos

```bash
npm run prisma:push
```

**Nota:** Si ves advertencias sobre posibles pérdidas de datos (constraints únicos), puedes aceptarlas si es una instalación nueva.

O si prefieres usar migraciones formales:

```bash
npx prisma migrate deploy
```

#### 2.7. (Opcional) Ejecutar el seed para datos iniciales

Esto creará usuarios de prueba (admin y seller):

```bash
npm run db:seed
```

**Usuarios creados por defecto:**
- **Admin:** `admin@test.com` / `admin123`
- **Seller:** `seller@test.com` / `seller123`

#### 2.8. Iniciar el servidor backend

**Modo desarrollo (con recarga automática):**
```bash
npm run dev
```

**Modo producción:**
```bash
npm start
```

El backend debería estar corriendo en `http://localhost:5001`

**Verificar que funciona:**
```bash
curl http://localhost:5001/api/health
```

Deberías recibir: `{"status":"OK","timestamp":"..."}`

### 3. Configurar el Frontend

#### 3.1. Abrir una nueva terminal y navegar al frontend

```bash
cd frontend
```

#### 3.2. Instalar dependencias

```bash
npm install
```

#### 3.3. Crear archivo de configuración `.env.local`

Crea un archivo `.env.local` en la carpeta `frontend/` con:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

#### 3.4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

El frontend debería estar corriendo en `http://localhost:3000`

### 4. Acceder al Sistema

1. Abre tu navegador y ve a: `http://localhost:3000`
2. Serás redirigido a la página de login
3. Inicia sesión con:
   - **Email:** `admin@test.com`
   - **Password:** `admin123`

## 🔧 Comandos Útiles

### Backend

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start

# Generar cliente Prisma
npm run prisma:generate

# Aplicar cambios al esquema
npm run prisma:push

# Abrir Prisma Studio (interfaz visual de la BD)
npm run prisma:studio

# Ejecutar seeds
npm run db:seed

# Ejecutar tests
npm test
```

### Frontend

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Iniciar en modo producción
npm start

# Linter
npm run lint
```

## 📁 Archivos de Configuración Importantes

### Backend
- `backend/.env` - Variables de entorno
- `backend/prisma/schema.prisma` - Esquema de la base de datos
- `backend/src/server.js` - Punto de entrada del servidor
- `backend/src/app.js` - Configuración de Express

### Frontend
- `frontend/.env.local` - Variables de entorno públicas
- `frontend/next.config.ts` - Configuración de Next.js
- `frontend/src/lib/apiFacade.ts` - Cliente API del frontend

## 🐛 Solución de Problemas Comunes

### Error: "Cannot connect to database"

**Solución:**
1. Verifica que PostgreSQL esté corriendo
2. Revisa la `DATABASE_URL` en `backend/.env`
3. Asegúrate de que la base de datos `internet_service` exista
4. Verifica usuario y contraseña de PostgreSQL

```bash
# Probar conexión manual
psql -U postgres -d internet_service
```

### Error: "Port 5001 already in use"

**Solución:**
1. Cambia el puerto en `backend/.env`: `PORT=5002`
2. Actualiza `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:5002/api`
3. O mata el proceso que usa el puerto:

```bash
# En macOS/Linux
lsof -ti:5001 | xargs kill -9
```

### Error: "Module not found" en el frontend

**Solución:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Error: "Prisma Client not generated"

**Solución:**
```bash
cd backend
npm run prisma:generate
```

### CORS Error en el navegador

**Solución:**
1. Verifica que `FRONTEND_URL` en `backend/.env` coincida con la URL del frontend
2. Asegúrate de que ambos servidores estén corriendo

## 📊 Verificar la Base de Datos

### Usar Prisma Studio (Interfaz Visual)

```bash
cd backend
npm run prisma:studio
```

Esto abrirá una interfaz web en `http://localhost:5555` donde puedes ver y editar los datos.

### Consultas SQL directas

```bash
psql -U postgres -d internet_service

# Ver todas las tablas
\dt

# Ver usuarios
SELECT * FROM users;

# Salir
\q
```

## 🔐 Seguridad

**⚠️ IMPORTANTE para producción:**

1. **Nunca** subas archivos `.env` al repositorio
2. Usa secretos seguros para `JWT_SECRET`
3. Configura HTTPS en producción
4. Revisa y ajusta las políticas de CORS
5. Implementa rate limiting (ya está configurado)
6. Usa variables de entorno seguras

## 📝 Notas Adicionales

### Jobs Programados (Cron)

El sistema incluye jobs programados que se ejecutan automáticamente:
- `billingJob.js` - Generación de facturas
- `dunningJob.js` - Gestión de morosos
- `paymentJob.js` - Procesamiento de pagos

Estos se cargan automáticamente al iniciar el servidor backend.

### Integración con MikroTik

El sistema incluye integración con routers MikroTik. Para usarla:
1. Configura los routers en la interfaz web
2. Asegúrate de tener acceso de red a los routers
3. Configura las credenciales correctamente

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs del backend en la terminal
2. Revisa la consola del navegador (F12)
3. Verifica que todas las dependencias estén instaladas
4. Asegúrate de que PostgreSQL esté corriendo
5. Revisa que los puertos no estén ocupados

## ✅ Checklist de Instalación

- [ ] PostgreSQL instalado y corriendo
- [ ] Base de datos `internet_service` creada
- [ ] Dependencias del backend instaladas (`npm install` en `backend/`)
- [ ] Archivo `backend/.env` configurado
- [ ] Secuencias de PostgreSQL creadas (`psql -U postgres -d isp_db -f create-sequences.sql`)
- [ ] Cliente Prisma generado (`npm run prisma:generate`)
- [ ] Migraciones aplicadas (`npm run prisma:push`)
- [ ] Seeds ejecutados (`npm run db:seed`)
- [ ] Backend corriendo en `http://localhost:5001`
- [ ] Dependencias del frontend instaladas (`npm install` en `frontend/`)
- [ ] Archivo `frontend/.env.local` configurado
- [ ] Frontend corriendo en `http://localhost:3000`
- [ ] Puedo iniciar sesión con `admin@test.com` / `admin123`

---

**¡Listo!** Tu sistema debería estar funcionando correctamente. 🎉

