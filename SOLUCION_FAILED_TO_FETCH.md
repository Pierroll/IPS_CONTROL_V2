# Solución: Error "Failed to fetch" al iniciar sesión

## ✅ Pasos para resolver el problema

### 1. Verificar que el backend esté corriendo

```bash
# Verificar que el backend responda
curl http://localhost:5001/api/health
```

Deberías ver: `{"status":"OK","timestamp":"..."}`

Si no responde, inicia el backend:
```bash
cd backend
npm run dev
```

### 2. Verificar el archivo .env.local del frontend

El archivo debe existir en `frontend/.env.local` con:
```
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

### 3. **IMPORTANTE: Reiniciar el servidor de Next.js**

Next.js solo carga las variables de entorno al iniciar. Si creaste o modificaste `.env.local` después de iniciar el servidor, **debes reiniciarlo**:

```bash
# Detener el servidor (Ctrl+C en la terminal donde corre)
# Luego reiniciar:
cd frontend
npm run dev
```

### 4. Verificar en la consola del navegador

Abre la consola del navegador (F12) y busca estos logs:
- `🌐 API_URL configurada: http://localhost:5001/api`
- `🔗 Intentando conectar a: http://localhost:5001/api/auth/login`

Si ves `undefined` o una URL incorrecta, el servidor no se reinició correctamente.

### 5. Verificar CORS en el backend

Asegúrate de que en `backend/.env` tengas:
```
FRONTEND_URL=http://localhost:3000
```

Y que el backend esté configurado para aceptar peticiones desde ese origen.

## 🔍 Diagnóstico

Si después de reiniciar sigue fallando:

1. **Abre la consola del navegador (F12)**
2. **Ve a la pestaña "Network"**
3. **Intenta iniciar sesión**
4. **Busca la petición a `/auth/login`**
5. **Revisa:**
   - ¿La URL es correcta?
   - ¿Qué código de estado devuelve?
   - ¿Hay algún error de CORS?

## 📝 Errores comunes

### Error: "Failed to fetch"
- **Causa:** El backend no está corriendo o no es accesible
- **Solución:** Verifica que el backend esté corriendo en el puerto 5001

### Error: Variable de entorno no se carga
- **Causa:** Next.js no se reinició después de crear/modificar `.env.local`
- **Solución:** Reinicia el servidor de Next.js

### Error: CORS
- **Causa:** El backend no permite peticiones desde el frontend
- **Solución:** Verifica `FRONTEND_URL` en `backend/.env`

## ✅ Checklist

- [ ] Backend corriendo en `http://localhost:5001`
- [ ] Archivo `frontend/.env.local` existe con `NEXT_PUBLIC_API_URL=http://localhost:5001/api`
- [ ] Servidor de Next.js reiniciado después de crear/modificar `.env.local`
- [ ] Consola del navegador muestra la URL correcta
- [ ] No hay errores de CORS en la consola

