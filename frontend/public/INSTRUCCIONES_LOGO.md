# 📸 Instrucciones para Agregar tu Logo

## 📁 Dónde Guardar el Logo

Guarda tu logo en la siguiente ruta:

```
frontend/public/logo.png
```

O si prefieres otro formato:
- `frontend/public/logo.jpg`
- `frontend/public/logo.svg` (recomendado para mejor calidad)
- `frontend/public/logo.webp`

## 📐 Recomendaciones de Tamaño

- **Logo para Login**: 200x200px a 300x300px (formato PNG o SVG con fondo transparente)
- **Logo para Sidebar**: 150x150px a 200x200px (formato PNG o SVG con fondo transparente)
- **Formato SVG**: Es el mejor formato porque se ve nítido en cualquier tamaño

## ✅ Pasos

1. Copia tu archivo de logo a la carpeta `frontend/public/`
2. Renómbralo como `logo.png` (o el formato que uses)
3. El logo aparecerá automáticamente en:
   - Página de login
   - Sidebar de todas las pantallas del sistema

## 🔄 Si Quieres Cambiar el Nombre del Archivo

Si tu logo tiene otro nombre (ej: `mi-empresa-logo.png`), edita estos archivos:
- `frontend/src/app/auth/page.tsx` (línea donde dice `logo.png`)
- `frontend/src/components/layout/DashboardNav.tsx` (línea donde dice `logo.png`)

Y cambia `logo.png` por el nombre de tu archivo.

