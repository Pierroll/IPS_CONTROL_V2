# Configuración del servidor web en MikroTik para alojar página de morosos

## 1. Habilitar el servidor web

### Desde Winbox:
1. Ve a **IP** → **Services**
2. Busca **www** y haz doble clic
3. Cambia **Port** a `80` (o el puerto que prefieras)
4. Marca **Enabled** como `yes`
5. Haz clic en **Apply**

### Desde terminal/SSH:
```bash
/ip service set www port=80 disabled=no
```

## 2. Subir los archivos a la página web

### Opción A: Usando Winbox
1. Abre **Files** en Winbox
2. Navega a la carpeta **web** (si no existe, créala)
3. Sube los archivos:
   - `index.html`
   - Carpeta `images/` con todos los logos
   - `server.js` (opcional, para funcionalidad adicional)

### Opción B: Usando FTP/SCP
```bash
# Conectar por FTP al MikroTik
ftp 45.5.56.186
# Usuario: admin (o tu usuario)
# Subir archivos a la carpeta /web/
```

### Opción C: Usando el terminal del MikroTik
```bash
# Crear directorio web si no existe
/file print where name="web"
/file add name="web" type=directory

# Subir archivos usando comandos de red
/tool fetch url="http://tu-servidor.com/index.html" dst-file="web/index.html"
```

## 3. Configurar la página por defecto

### Crear archivo index.html en el MikroTik:
```bash
# Editar archivo directamente en el MikroTik
/file edit web/index.html
# Pegar el contenido del archivo index.html
```

## 4. Configurar redirección para clientes morosos

### Opción A: Redirección HTTP
```bash
# Crear regla de firewall para redireccionar
/ip firewall nat add chain=dstnat dst-port=80 protocol=tcp src-address=!192.168.1.0/24 action=dst-nat to-addresses=45.5.56.186 to-ports=80
```

### Opción B: Página de captura (Captive Portal)
```bash
# Habilitar HotSpot
/ip hotspot setup
# Configurar página de login personalizada
/ip hotspot profile set hsprof1 html-directory=web
```

## 5. Verificar configuración

### Comandos de verificación:
```bash
# Ver servicios habilitados
/ip service print

# Ver archivos en web
/file print where name~"web"

# Ver reglas de firewall
/ip firewall nat print
```

## 6. Acceso a la página

Una vez configurado, los clientes morosos podrán acceder a:
- `http://45.5.56.186` (IP del MikroTik)
- O cualquier dominio que apunte a esa IP

## 7. Configuración avanzada (Opcional)

### Configurar dominio personalizado:
```bash
# En el DNS del MikroTik
/ip dns static add name="morosos.tu-empresa.com" address=45.5.56.186
```

### Configurar SSL (HTTPS):
```bash
# Habilitar servicio HTTPS
/ip service set www-ssl port=443 disabled=no
# Subir certificado SSL si tienes uno
```

## Notas importantes:

1. **Espacio disponible**: Verifica que el MikroTik tenga suficiente espacio para los archivos
2. **Rendimiento**: El servidor web del MikroTik es básico, ideal para páginas simples
3. **Backup**: Haz backup de la configuración antes de hacer cambios
4. **Seguridad**: Considera restringir el acceso solo a clientes morosos

## Comandos de respaldo:
```bash
# Exportar configuración
/export file=backup-morosos

# Restaurar configuración
/import file=backup-morosos
```
