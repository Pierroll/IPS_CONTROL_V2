# 🔧 Solución de Problemas - Conexión a MikroTik

## Problema: No se puede conectar al router MikroTik

### Síntoma
Error `ECONNREFUSED` (errno: -61) al intentar conectarse al router MikroTik desde el servidor.

### Causas Comunes

#### 1. **Problema de Red Local (Misma Red)**
Si el servidor está en la misma red que el router MikroTik, puede haber problemas de:
- **Firewall del router**: El router puede estar bloqueando conexiones desde la misma red
- **Configuración de NAT**: Algunos routers bloquean conexiones locales a la IP pública
- **Reglas de firewall**: El router puede tener reglas que bloquean conexiones internas

**Solución:**
- Conectarse desde otra red (como hiciste)
- O configurar el firewall del router para permitir conexiones locales
- Usar la IP local del router en lugar de la IP pública

#### 2. **Puerto Bloqueado**
El puerto API (por defecto 8729) puede estar bloqueado por:
- Firewall del router
- Firewall del sistema operativo del servidor
- Reglas de red corporativa

**Solución:**
```bash
# Verificar que el puerto esté abierto
telnet <IP_DEL_ROUTER> 8729
# o
nc -zv <IP_DEL_ROUTER> 8729
```

#### 3. **Servicio API Deshabilitado**
El servicio API de RouterOS puede estar deshabilitado.

**Solución en MikroTik:**
```bash
# Verificar estado del servicio API
/ip service print

# Habilitar el servicio API si está deshabilitado
/ip service enable api
```

#### 4. **IP Incorrecta**
Si estás en la misma red, puede que necesites usar:
- La IP local del router (ej: 192.168.1.1) en lugar de la IP pública
- O viceversa, dependiendo de la configuración

#### 5. **Restricciones de Acceso**
El router puede tener restricciones de acceso configuradas.

**Solución en MikroTik:**
```bash
# Verificar restricciones de acceso
/ip service print detail

# Permitir acceso desde cualquier IP (solo para pruebas)
/ip service set api address=0.0.0.0/0
```

## ✅ Verificación Rápida

1. **Ping al router:**
   ```bash
   ping <IP_DEL_ROUTER>
   ```

2. **Verificar puerto:**
   ```bash
   telnet <IP_DEL_ROUTER> 8729
   ```

3. **Desde el router MikroTik:**
   ```bash
   /ip service print
   # Debe mostrar api habilitado en el puerto 8729
   ```

## 📝 Notas Importantes

- **Misma red**: Si el servidor y el router están en la misma red, puede haber restricciones de firewall
- **Red diferente**: Generalmente funciona mejor desde otra red
- **IP local vs pública**: Dependiendo de la configuración, puede necesitar usar una u otra
- **Puerto personalizado**: Asegúrate de usar el puerto correcto que configuraste en el router

## 🔍 Debugging

Si el problema persiste, revisa los logs del backend:
```bash
# En los logs deberías ver:
🔌 Conectando a <IP>:<PUERTO> (puerto del formulario)...
❌ Error completo: ...
```

El mensaje de error te indicará exactamente qué está fallando.

