/**
 * Script para cambiar perfiles de clientes
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

async function changeClientProfile(username, newProfile) {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  CAMBIO DE PERFIL DE CLIENTE                             ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikConnection();
    
    try {
        console.log(`${colors.yellow}🔄 Conectando al MikroTik...${colors.reset}`);
        await mikrotik.connect();
        
        console.log(`${colors.yellow}👤 Cliente: ${username}${colors.reset}`);
        console.log(`${colors.yellow}🎯 Nuevo perfil: ${newProfile}${colors.reset}\n`);
        
        // Obtener información actual del cliente
        console.log(`${colors.blue}📋 Obteniendo información actual del cliente...${colors.reset}`);
        const clients = await mikrotik.getClientsWithProfiles();
        const client = clients.find(c => c.name === username);
        
        if (!client) {
            console.log(`${colors.red}❌ Cliente '${username}' no encontrado${colors.reset}`);
            return;
        }
        
        console.log(`${colors.cyan}Información actual:${colors.reset}`);
        console.log(`   • Perfil actual: ${client.profile}`);
        console.log(`   • Estado: ${client.status === 'ACTIVO' ? '🟢 ACTIVO' : '🔴 INACTIVO'}`);
        if (client.status === 'ACTIVO') {
            console.log(`   • IP: ${client.currentAddress}`);
            console.log(`   • Tiempo activo: ${client.uptime}`);
        }
        console.log('');
        
        // Cambiar el perfil
        console.log(`${colors.yellow}🔄 Cambiando perfil...${colors.reset}`);
        const result = await mikrotik.changeClientProfile(username, newProfile);
        
        if (result.success) {
            console.log(`${colors.green}✅ CAMBIO EXITOSO${colors.reset}\n`);
            console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
            console.log(`${colors.green}Resumen del cambio:${colors.reset}`);
            console.log(`   • Cliente: ${result.username}`);
            console.log(`   • Perfil anterior: ${result.oldProfile}`);
            console.log(`   • Perfil nuevo: ${result.newProfile}`);
            console.log(`   • Estaba activo: ${result.wasActive ? 'Sí' : 'No'}`);
            console.log(`   • Mensaje: ${result.message}`);
            console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
            
            // Verificar el cambio
            console.log(`${colors.blue}🔍 Verificando el cambio...${colors.reset}`);
            const updatedClients = await mikrotik.getClientsWithProfiles();
            const updatedClient = updatedClients.find(c => c.name === username);
            
            if (updatedClient) {
                console.log(`${colors.cyan}Estado actualizado:${colors.reset}`);
                console.log(`   • Perfil: ${updatedClient.profile}`);
                console.log(`   • Estado: ${updatedClient.status === 'ACTIVO' ? '🟢 ACTIVO' : '🔴 INACTIVO'}`);
            }
        }
        
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    } finally {
        await mikrotik.disconnect();
    }
}

async function suspendClient(username) {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  SUSPENSIÓN DE CLIENTE                                    ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikConnection();
    
    try {
        await mikrotik.connect();
        
        console.log(`${colors.yellow}🔄 Suspendiendo cliente: ${username}${colors.reset}\n`);
        
        const result = await mikrotik.suspendClient(username);
        
        if (result.success) {
            console.log(`${colors.red}🚫 CLIENTE SUSPENDIDO${colors.reset}\n`);
            console.log(`${colors.red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
            console.log(`${colors.red}Cliente suspendido:${colors.reset}`);
            console.log(`   • Usuario: ${result.username}`);
            console.log(`   • Perfil anterior: ${result.oldProfile}`);
            console.log(`   • Nuevo perfil: ${result.newProfile}`);
            console.log(`   • Estaba activo: ${result.wasActive ? 'Sí (desconectado)' : 'No'}`);
            console.log(`${colors.red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
        }
        
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    } finally {
        await mikrotik.disconnect();
    }
}

async function reactivateClient(username, profile = 'PLAN_S/. 60.00') {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  REACTIVACIÓN DE CLIENTE                                 ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikConnection();
    
    try {
        await mikrotik.connect();
        
        console.log(`${colors.yellow}🔄 Reactivando cliente: ${username}${colors.reset}`);
        console.log(`${colors.yellow}🎯 Perfil: ${profile}${colors.reset}\n`);
        
        const result = await mikrotik.reactivateClient(username, profile);
        
        if (result.success) {
            console.log(`${colors.green}✅ CLIENTE REACTIVADO${colors.reset}\n`);
            console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
            console.log(`${colors.green}Cliente reactivado:${colors.reset}`);
            console.log(`   • Usuario: ${result.username}`);
            console.log(`   • Perfil anterior: ${result.oldProfile}`);
            console.log(`   • Nuevo perfil: ${result.newProfile}`);
            console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
        }
        
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    } finally {
        await mikrotik.disconnect();
    }
}

async function listActiveClients() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  CLIENTES ACTIVOS DISPONIBLES                            ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikConnection();
    
    try {
        await mikrotik.connect();
        
        const clients = await mikrotik.getClientsWithProfiles();
        const activeClients = clients.filter(c => c.status === 'ACTIVO');
        
        console.log(`${colors.green}👥 Clientes activos (${activeClients.length}):${colors.reset}\n`);
        
        activeClients.forEach((client, index) => {
            console.log(`${colors.bold}${index + 1}. ${client.name}${colors.reset}`);
            console.log(`   ${colors.cyan}Perfil:${colors.reset} ${client.profile}`);
            console.log(`   ${colors.cyan}IP:${colors.reset} ${client.currentAddress}`);
            console.log(`   ${colors.cyan}Tiempo activo:${colors.reset} ${client.uptime}`);
            console.log('');
        });
        
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    } finally {
        await mikrotik.disconnect();
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`${colors.yellow}Uso del script:${colors.reset}`);
        console.log(`  node change-profile.js <comando> [argumentos]`);
        console.log('');
        console.log(`${colors.cyan}Comandos disponibles:${colors.reset}`);
        console.log(`  list                    - Lista clientes activos`);
        console.log(`  change <usuario> <perfil> - Cambia perfil de un cliente`);
        console.log(`  suspend <usuario>       - Suspende un cliente (CORTE MOROSO)`);
        console.log(`  reactivate <usuario> [perfil] - Reactiva un cliente`);
        console.log('');
        console.log(`${colors.cyan}Ejemplos:${colors.reset}`);
        console.log(`  node change-profile.js list`);
        console.log(`  node change-profile.js change AxelMelendez "PLAN_S/. 100.00"`);
        console.log(`  node change-profile.js suspend M_JanetTrujillo`);
        console.log(`  node change-profile.js reactivate M_KarenValverde "PLAN_S/. 60.00"`);
        return;
    }
    
    const command = args[0];
    
    switch (command) {
        case 'list':
            await listActiveClients();
            break;
            
        case 'change':
            if (args.length < 3) {
                console.log(`${colors.red}❌ Error: Se requiere usuario y perfil${colors.reset}`);
                console.log(`${colors.yellow}Uso: node change-profile.js change <usuario> <perfil>${colors.reset}`);
                return;
            }
            await changeClientProfile(args[1], args[2]);
            break;
            
        case 'suspend':
            if (args.length < 2) {
                console.log(`${colors.red}❌ Error: Se requiere usuario${colors.reset}`);
                console.log(`${colors.yellow}Uso: node change-profile.js suspend <usuario>${colors.reset}`);
                return;
            }
            await suspendClient(args[1]);
            break;
            
        case 'reactivate':
            if (args.length < 2) {
                console.log(`${colors.red}❌ Error: Se requiere usuario${colors.reset}`);
                console.log(`${colors.yellow}Uso: node change-profile.js reactivate <usuario> [perfil]${colors.reset}`);
                return;
            }
            const profile = args[2] || 'PLAN_S/. 60.00';
            await reactivateClient(args[1], profile);
            break;
            
        default:
            console.log(`${colors.red}❌ Comando no reconocido: ${command}${colors.reset}`);
            console.log(`${colors.yellow}Comandos disponibles: list, change, suspend, reactivate${colors.reset}`);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch(error => {
        console.error(`${colors.red}💥 Error fatal: ${error.message}${colors.reset}`);
    });
}

module.exports = {
    changeClientProfile,
    suspendClient,
    reactivateClient,
    listActiveClients
};
