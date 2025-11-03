/**
 * Script para obtener información del sistema MikroTik
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

async function getSystemInfo() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  INFORMACIÓN DEL SISTEMA MIKROTIK                        ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikConnection();
    
    try {
        await mikrotik.connect();
        
        // 1. Información de recursos del sistema
        console.log(`${colors.blue}1️⃣ RECURSOS DEL SISTEMA:${colors.reset}`);
        const resources = await mikrotik.executeCommand('/system/resource/print');
        
        if (resources.length > 0) {
            const resource = resources[0];
            console.log(`${colors.cyan}Información del sistema:${colors.reset}`);
            console.log(`   • Versión RouterOS: ${resource.version || 'N/A'}`);
            console.log(`   • Arquitectura: ${resource.architecture || 'N/A'}`);
            console.log(`   • Tiempo de compilación: ${resource['build-time'] || 'N/A'}`);
            console.log(`   • Tiempo activo: ${resource.uptime || 'N/A'}`);
            console.log(`   • Memoria total: ${resource['total-memory'] || 'N/A'}`);
            console.log(`   • Memoria libre: ${resource['free-memory'] || 'N/A'}`);
            console.log(`   • CPU: ${resource['cpu-count'] || 'N/A'} núcleos`);
            console.log(`   • CPU load: ${resource['cpu-load'] || 'N/A'}%`);
        }
        console.log('');
        
        // 2. Identidad del sistema
        console.log(`${colors.blue}2️⃣ IDENTIDAD DEL SISTEMA:${colors.reset}`);
        const identity = await mikrotik.executeCommand('/system/identity/print');
        
        if (identity.length > 0) {
            console.log(`${colors.cyan}Identidad:${colors.reset}`);
            console.log(`   • Nombre: ${identity[0].name || 'N/A'}`);
        }
        console.log('');
        
        // 3. Información de licencia
        console.log(`${colors.blue}3️⃣ INFORMACIÓN DE LICENCIA:${colors.reset}`);
        try {
            const license = await mikrotik.executeCommand('/system/license/print');
            
            if (license.length > 0) {
                const lic = license[0];
                console.log(`${colors.cyan}Licencia:${colors.reset}`);
                console.log(`   • Nivel: ${lic['software-id'] || 'N/A'}`);
                console.log(`   • N-key: ${lic['nkey'] || 'N/A'}`);
                console.log(`   • Válida hasta: ${lic['valid-to'] || 'N/A'}`);
            }
        } catch (error) {
            console.log(`${colors.yellow}⚠️ No se pudo obtener información de licencia${colors.reset}`);
        }
        console.log('');
        
        // 4. Información de la API
        console.log(`${colors.blue}4️⃣ INFORMACIÓN DE LA API:${colors.reset}`);
        try {
            const apiServices = await mikrotik.executeCommand('/ip/service/print', {
                '.proplist': 'name,port,disabled'
            });
            
            const apiService = apiServices.find(s => s.name === 'api');
            const apiSslService = apiServices.find(s => s.name === 'api-ssl');
            
            console.log(`${colors.cyan}Servicios API:${colors.reset}`);
            if (apiService) {
                console.log(`   • API: Puerto ${apiService.port} - ${apiService.disabled === 'true' ? 'Deshabilitado' : 'Habilitado'}`);
            }
            if (apiSslService) {
                console.log(`   • API-SSL: Puerto ${apiSslService.port} - ${apiSslService.disabled === 'true' ? 'Deshabilitado' : 'Habilitado'}`);
            }
        } catch (error) {
            console.log(`${colors.yellow}⚠️ No se pudo obtener información de servicios API${colors.reset}`);
        }
        console.log('');
        
        // 5. Información de usuarios
        console.log(`${colors.blue}5️⃣ INFORMACIÓN DE USUARIOS:${colors.reset}`);
        try {
            const users = await mikrotik.executeCommand('/user/print', {
                '.proplist': 'name,group,disabled'
            });
            
            console.log(`${colors.cyan}Usuarios del sistema:${colors.reset}`);
            users.forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.name} - Grupo: ${user.group} - ${user.disabled === 'true' ? 'Deshabilitado' : 'Habilitado'}`);
            });
        } catch (error) {
            console.log(`${colors.yellow}⚠️ No se pudo obtener información de usuarios${colors.reset}`);
        }
        console.log('');
        
        // 6. Resumen de la versión
        if (resources.length > 0) {
            const resource = resources[0];
            console.log(`${colors.green}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
            console.log(`${colors.green}║  RESUMEN DE VERSIÓN                                    ║${colors.reset}`);
            console.log(`${colors.green}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
            console.log(`${colors.bold}${colors.cyan}RouterOS: ${resource.version}${colors.reset}`);
            console.log(`${colors.cyan}Arquitectura: ${resource.architecture}${colors.reset}`);
            console.log(`${colors.cyan}Compilado: ${resource['build-time']}${colors.reset}`);
            console.log(`${colors.cyan}Tiempo activo: ${resource.uptime}${colors.reset}`);
        }
        
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    } finally {
        await mikrotik.disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    getSystemInfo().catch(error => {
        console.error(`${colors.red}💥 Error fatal: ${error.message}${colors.reset}`);
    });
}

module.exports = { getSystemInfo };
