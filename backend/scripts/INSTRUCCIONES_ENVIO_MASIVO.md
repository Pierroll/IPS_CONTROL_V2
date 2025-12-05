# Instrucciones para Envío Masivo de Deuda

## Ejecutar AHORA (Hoy)

### Opción 1: Ejecutar directamente con Node

```bash
cd ~/apps/bresscloud/IPS_CONTROL_V2/backend

# Primero hacer una prueba (DRY-RUN) para ver qué haría
node scripts/send-debt-notifications-all.js --dry-run

# Si todo se ve bien, ejecutar el envío real
node scripts/send-debt-notifications-all.js
```

### Opción 2: Usar el script bash (recomendado)

```bash
cd ~/apps/bresscloud/IPS_CONTROL_V2/backend

# Primero hacer una prueba (DRY-RUN)
./scripts/send-debt-now.sh --dry-run

# Si todo se ve bien, ejecutar el envío real
./scripts/send-debt-now.sh
```

### Opción 3: Ejecutar con límite (para probar con pocos clientes)

```bash
# Probar con solo 5 clientes primero
node scripts/send-debt-notifications-all.js --dry-run --limit=5

# Si se ve bien, enviar a 10 clientes
node scripts/send-debt-notifications-all.js --limit=10

# Luego enviar a todos
node scripts/send-debt-notifications-all.js
```

## Configurar para el Próximo Mes (Cron del día 25)

El cron ya está configurado para ejecutarse automáticamente el día 25 de cada mes a las 9:00 AM.

Para verificar o modificar:

```bash
# Ver el cron actual
crontab -l

# Editar el cron
crontab -e
```

La línea del cron debería ser:
```cron
0 9 25 * * /home/tu-usuario/apps/bresscloud/IPS_CONTROL_V2/backend/scripts/cron-send-debt-notifications.sh
```

### Cambiar la hora del cron (si quieres)

Si quieres que se ejecute a una hora diferente el día 25, modifica el cron:

```cron
# Formato: minuto hora día mes día-semana
# Ejemplo: 5:00 PM (17:00) del día 25
0 17 25 * * /home/tu-usuario/apps/bresscloud/IPS_CONTROL_V2/backend/scripts/cron-send-debt-notifications.sh

# Ejemplo: 8:00 AM del día 25
0 8 25 * * /home/tu-usuario/apps/bresscloud/IPS_CONTROL_V2/backend/scripts/cron-send-debt-notifications.sh
```

## Ver Logs

Los logs se guardan en:
```bash
# Ver el último log
tail -f ~/apps/bresscloud/IPS_CONTROL_V2/backend/logs/debt-notifications-*.log

# Ver todos los logs
ls -lh ~/apps/bresscloud/IPS_CONTROL_V2/backend/logs/debt-notifications-*.log
```

## Verificar que la API de WhatsApp esté funcionando

Antes de ejecutar el script, verifica:

```bash
# Verificar que la API esté corriendo
pm2 status whatsapp-api

# Verificar estado de conexión
curl http://localhost:3001/api/status

# Debería responder: {"status":"connected","isConnected":true,...}
```

## Notas Importantes

1. **Primero siempre hacer DRY-RUN** para ver qué haría el script
2. **El script espera 3 segundos entre cada envío** para evitar rate limiting
3. **Los mensajes se registran en MessageLog** en la base de datos
4. **Si hay errores, se guardan en los logs** y en el resumen final
5. **El script solo envía a clientes con deuda** (balance > 0)

