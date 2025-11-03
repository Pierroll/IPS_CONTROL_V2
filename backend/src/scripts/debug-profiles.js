/**
 * Script para debuggear perfiles y configuraciones
 */

const { MikrotikConnection } = require('../config/mikrotik-config');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    magenta: '\x1b[35m',
    cyan: '\x1b[96m',
    white: '\x1b[37m',
    bold: '\x1b[1m'
};

async function debugProfiles() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  DEBUG DE PERFILES Y CONFIGURACIONES                     ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikConnection();
    
    try {
        await mikrotik.connect();
        
        // 1. Obtener perfiles PPPoE
        console.log(`${colors.yellow}1️⃣ PERFILES PPPoE DISPONIBLES:${colors.reset}\n`);
        const profiles = await mikrotik.getPPPoEProfiles();
        
        profiles.forEach((profile, index) => {
            console.log(`${colors.bold}${index + 1}. ${profile.name}${colors.reset}`);
            console.log(`   ${colors.cyan}IP Local:${colors.reset} ${profile.localAddress || 'N/A'}`);
            console.log(`   ${colors.cyan}IP Remota:${colors.reset} ${profile.remoteAddress || 'N/A'}`);
            console.log(`   ${colors.cyan}DNS:${colors.reset} ${profile.dnsServer || 'N/A'}`);
            console.log(`   ${colors.cyan}Encriptación:${colors.reset} ${profile.useEncryption || 'N/A'}`);
            console.log('');
        });
        
        // 2. Obtener secretos PPPoE
        console.log(`${colors.yellow}2️⃣ SECRETOS PPPoE:${colors.reset}\n`);
        const secrets = await mikrotik.executeCommand('/ppp/secret/print', {
            '.proplist': 'name,profile,local-address,remote-address,service,disabled'
        });
        
        console.log(`${colors.cyan}Total de secretos: ${secrets.length}${colors.reset}\n`);
        
        // Mostrar algunos ejemplos
        secrets.slice(0, 5).forEach((secret, index) => {
            console.log(`${colors.bold}${index + 1}. ${secret.name}${colors.reset}`);
            console.log(`   ${colors.cyan}Perfil:${colors.reset} ${secret.profile || 'N/A'}`);
            console.log(`   ${colors.cyan}Servicio:${colors.reset} ${secret.service || 'N/A'}`);
            console.log(`   ${colors.cyan}Deshabilitado:${colors.reset} ${secret.disabled === 'true' ? 'Sí' : 'No'}`);
            console.log(`   ${colors.cyan}IP Local:${colors.reset} ${secret['local-address'] || 'N/A'}`);
            console.log(`   ${colors.cyan}IP Remota:${colors.reset} ${secret['remote-address'] || 'N/A'}`);
            console.log('');
        });
        
        // 3. Verificar cliente específico
        console.log(`${colors.yellow}3️⃣ INFORMACIÓN DETALLADA DE M_DonGato:${colors.reset}\n`);
        
        const clientSecrets = secrets.filter(s => s.name === 'M_DonGato');
        if (clientSecrets.length > 0) {
            const client = clientSecrets[0];
            console.log(`${colors.bold}M_DonGato (Secreto):${colors.reset}`);
            console.log(`   ${colors.cyan}Perfil:${colors.reset} ${client.profile || 'N/A'}`);
            console.log(`   ${colors.cyan}Servicio:${colors.reset} ${client.service || 'N/A'}`);
            console.log(`   ${colors.cyan}Deshabilitado:${colors.reset} ${client.disabled === 'true' ? 'Sí' : 'No'}`);
            console.log(`   ${colors.cyan}IP Local:${colors.reset} ${client['local-address'] || 'N/A'}`);
            console.log(`   ${colors.cyan}IP Remota:${colors.reset} ${client['remote-address'] || 'N/A'}`);
            console.log('');
        }
        
        // 4. Verificar conexiones activas
        console.log(`${colors.yellow}4️⃣ CONEXIONES ACTIVAS:${colors.reset}\n`);
        const activeUsers = await mikrotik.executeCommand('/ppp/active/print', {
            '.proplist': 'name,address,uptime,profile'
        });
        
        const donGatoActive = activeUsers.filter(u => u.name === 'M_DonGato');
        if (donGatoActive.length > 0) {
            const active = donGatoActive[0];
            console.log(`${colors.bold}M_DonGato (Activo):${colors.reset}`);
            console.log(`   ${colors.cyan}IP:${colors.reset} ${active.address}`);
            console.log(`   ${colors.cyan}Perfil:${colors.reset} ${active.profile || 'N/A'}`);
            console.log(`   ${colors.cyan}Tiempo activo:${colors.reset} ${active.uptime}`);
            console.log('');
        } else {
            console.log(`${colors.red}M_DonGato no está activo${colors.reset}\n`);
        }
        
        // 5. Verificar configuración de perfiles
        console.log(`${colors.yellow}5️⃣ CONFIGURACIÓN DEL PERFIL CORTE MOROSO:${colors.reset}\n`);
        const corteProfile = profiles.find(p => p.name === 'CORTE MOROSO');
        if (corteProfile) {
            console.log(`${colors.bold}CORTE MOROSO:${colors.reset}`);
            console.log(`   ${colors.cyan}IP Local:${colors.reset} ${corteProfile.localAddress || 'N/A'}`);
            console.log(`   ${colors.cyan}IP Remota:${colors.reset} ${corteProfile.remoteAddress || 'N/A'}`);
            console.log(`   ${colors.cyan}DNS:${colors.reset} ${corteProfile.dnsServer || 'N/A'}`);
            console.log(`   ${colors.cyan}Encriptación:${colors.reset} ${corteProfile.useEncryption || 'N/A'}`);
        } else {
            console.log(`${colors.red}Perfil CORTE MOROSO no encontrado${colors.reset}`);
        }
        
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    } finally {
        await mikrotik.disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    debugProfiles().catch(error => {
        console.error(`${colors.red}💥 Error fatal: ${error.message}${colors.reset}`);
    });
}

module.exports = { debugProfiles };
