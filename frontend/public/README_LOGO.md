# 📸 Logo del Sistema

## 📁 Ubicación del Logo

Guarda tu logo en esta carpeta con el nombre:

**`logo.png`**

## 📐 Formatos Soportados

- ✅ `logo.png` (recomendado con fondo transparente)
- ✅ `logo.jpg` o `logo.jpeg`
- ✅ `logo.svg` (mejor calidad, se adapta a cualquier tamaño)
- ✅ `logo.webp` (buena compresión)

## 📏 Tamaños Recomendados

- **Logo para Login**: 200x200px a 300x300px
- **Logo para Sidebar**: 150x150px a 200x200px
- **Formato SVG**: Se adapta automáticamente (recomendado)

## ✅ Pasos Rápidos

1. Copia tu archivo de logo a esta carpeta (`frontend/public/`)
2. Renómbralo como `logo.png` (o el formato que uses)
3. ¡Listo! El logo aparecerá automáticamente en:
   - ✅ Página de login (`/auth`)
   - ✅ Sidebar de todas las pantallas del sistema

## 🔄 Si tu Logo Tiene Otro Nombre

Si tu logo tiene otro nombre (ej: `mi-empresa-logo.png`), necesitas editar:

1. **Login**: `frontend/src/app/auth/page.tsx`
   - Busca: `src="/logo.png"`
   - Cambia a: `src="/mi-empresa-logo.png"`

2. **Sidebar**: `frontend/src/components/layout/DashboardNav.tsx`
   - Busca: `src="/logo.png"`
   - Cambia a: `src="/mi-empresa-logo.png"`

## 💡 Consejos

- Usa formato **SVG** para mejor calidad en cualquier tamaño
- Si usas PNG/JPG, usa fondo transparente para mejor integración
- El logo se adapta automáticamente a móviles y desktop
- Si el logo no existe, simplemente no se mostrará (no causará errores)

