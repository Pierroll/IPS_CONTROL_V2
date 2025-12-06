# 🔄 Ejecutar Script de Notificaciones en Segundo Plano

## Verificar si está corriendo

```bash
# Ver si hay un proceso de Node.js ejecutando el script
ps aux | grep send-debt-notifications-all.js | grep -v grep

# Si muestra algo, está corriendo
# Si no muestra nada, se detuvo
```

## Opción 1: Usar nohup (recomendado para scripts únicos)

```bash
cd ~/apps/bresscloud/IPS_CONTROL_V2/backend

# Ejecutar con nohup (no se detiene al cerrar terminal)
nohup node scripts/send-debt-notifications-all.js > logs/debt-notifications-$(date +%Y%m%d-%H%M%S).log 2>&1 &

# Ver el proceso
ps aux | grep send-debt-notifications-all.js | grep -v grep

# Ver logs en tiempo real
tail -f logs/debt-notifications-*.log
```

## Opción 2: Usar screen (permite reconectarte)

```bash
# Instalar screen si no está instalado
sudo apt install screen  # Ubuntu/Debian
# o
sudo yum install screen  # CentOS/RHEL

# Crear una sesión screen
screen -S debt-notifications

# Dentro de screen, ejecutar el script
cd ~/apps/bresscloud/IPS_CONTROL_V2/backend
node scripts/send-debt-notifications-all.js

# Desconectarte de screen (sin detener el script): Ctrl+A luego D

# Reconectarte más tarde
screen -r debt-notifications

# Ver todas las sesiones screen
screen -ls
```

## Opción 3: Usar PM2 (mejor para procesos largos)

```bash
# Crear un script wrapper
cd ~/apps/bresscloud/IPS_CONTROL_V2/backend

# Ejecutar con PM2 (seguirá corriendo aunque cierres la terminal)
pm2 start scripts/send-debt-notifications-all.js --name "debt-notifications" --no-autorestart

# Ver logs
pm2 logs debt-notifications

# Ver estado
pm2 status

# Detener cuando termine
pm2 stop debt-notifications
pm2 delete debt-notifications
```

## Verificar si el script terminó

```bash
# Ver si el proceso está corriendo
ps aux | grep send-debt-notifications-all.js | grep -v grep

# Ver los últimos logs
ls -lt ~/apps/bresscloud/IPS_CONTROL_V2/backend/logs/debt-notifications-*.log | head -1
tail -f $(ls -t ~/apps/bresscloud/IPS_CONTROL_V2/backend/logs/debt-notifications-*.log | head -1)
```

## Si el script se detuvo

Si se detuvo y quieres continuar desde donde quedó, necesitarías modificar el script para que guarde el progreso. Por ahora, si se detiene, tendrías que ejecutarlo de nuevo (pero no enviará duplicados si ya se enviaron).

## Recomendación

Para este caso, usa **nohup** o **screen** porque:
- Es un script que se ejecuta una vez y termina
- No necesitas que se reinicie automáticamente
- Puedes ver los logs fácilmente

