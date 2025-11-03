/**
 * Script para listar todos los clientes con sus perfiles
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

function formatBytes(bytes) {
    if (!bytes || bytes === '0') return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function formatUptime(uptime) {
    if (!uptime) return 'N/A';
    return uptime;
}

async function listAllClients() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  LISTADO DE CLIENTES CON PERFILES                        ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikConnection();
    
    try {
        console.log(`${colors.yellow}🔄 Conectando al MikroTik...${colors.reset}`);
        await mikrotik.connect();
        
        console.log(`${colors.yellow}📊 Obteniendo lista de clientes...${colors.reset}\n`);
        const clients = await mikrotik.getClientsWithProfiles();
        
        // Estadísticas generales
        const totalClients = clients.length;
        const activeClients = clients.filter(c => c.status === 'ACTIVO').length;
        const inactiveClients = clients.filter(c => c.status === 'INACTIVO').length;
        const disabledClients = clients.filter(c => c.disabled).length;
        
        console.log(`${colors.green}📈 ESTADÍSTICAS GENERALES:${colors.reset}`);
        console.log(`   • Total de clientes: ${totalClients}`);
        console.log(`   • Clientes activos: ${activeClients}`);
        console.log(`   • Clientes inactivos: ${inactiveClients}`);
        console.log(`   • Clientes deshabilitados: ${disabledClients}\n`);
        
        // Listar todos los clientes
        console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`${colors.magenta}LISTADO COMPLETO DE CLIENTES${colors.reset}`);
        console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
        
        clients.forEach((client, index) => {
            const statusColor = client.status === 'ACTIVO' ? colors.green : colors.red;
            const statusIcon = client.status === 'ACTIVO' ? '🟢' : '🔴';
            const disabledIcon = client.disabled ? ' ⚠️' : '';
            
            console.log(`${colors.bold}${index + 1}. ${client.name}${colors.reset}${disabledIcon}`);
            console.log(`   ${colors.cyan}Perfil:${colors.reset} ${client.profile || 'Sin perfil'}`);
            console.log(`   ${colors.cyan}Estado:${colors.reset} ${statusColor}${statusIcon} ${client.status}${colors.reset}`);
            console.log(`   ${colors.cyan}Servicio:${colors.reset} ${client.service || 'N/A'}`);
            
            if (client.status === 'ACTIVO') {
                console.log(`   ${colors.cyan}IP Actual:${colors.reset} ${client.currentAddress}`);
                console.log(`   ${colors.cyan}Tiempo activo:${colors.reset} ${formatUptime(client.uptime)}`);
                if (client.bytesIn || client.bytesOut) {
                    console.log(`   ${colors.cyan}Tráfico:${colors.reset} ↓${formatBytes(client.bytesIn)} ↑${formatBytes(client.bytesOut)}`);
                }
            } else {
                console.log(`   ${colors.cyan}IP Configurada:${colors.reset} ${client.remoteAddress || 'N/A'}`);
            }
            
            console.log(`   ${colors.cyan}IP Local:${colors.reset} ${client.localAddress || 'N/A'}`);
            console.log('');
        });
        
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    } finally {
        await mikrotik.disconnect();
    }
}

async function listClientsByProfile() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  CLIENTES AGRUPADOS POR PERFIL                           ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikConnection();
    
    try {
        console.log(`${colors.yellow}🔄 Conectando al MikroTik...${colors.reset}`);
        await mikrotik.connect();
        
        console.log(`${colors.yellow}📊 Obteniendo clientes agrupados por perfil...${colors.reset}\n`);
        const clientsByProfile = await mikrotik.getClientsByProfile();
        
        // Ordenar perfiles por número de clientes
        const sortedProfiles = Object.values(clientsByProfile).sort((a, b) => b.totalClients - a.totalClients);
        
        sortedProfiles.forEach((profileGroup, index) => {
            console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
            console.log(`${colors.bold}${colors.blue}PERFIL: ${profileGroup.profile}${colors.reset}`);
            console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
            console.log(`${colors.cyan}Total: ${profileGroup.totalClients} | Activos: ${profileGroup.activeClients} | Inactivos: ${profileGroup.inactiveClients}${colors.reset}\n`);
            
            profileGroup.clients.forEach((client, clientIndex) => {
                const statusColor = client.status === 'ACTIVO' ? colors.green : colors.red;
                const statusIcon = client.status === 'ACTIVO' ? '🟢' : '🔴';
                const disabledIcon = client.disabled ? ' ⚠️' : '';
                
                console.log(`   ${colors.bold}${clientIndex + 1}. ${client.name}${colors.reset}${disabledIcon}`);
                console.log(`      ${colors.cyan}Estado:${colors.reset} ${statusColor}${statusIcon} ${client.status}${colors.reset}`);
                
                if (client.status === 'ACTIVO') {
                    console.log(`      ${colors.cyan}IP:${colors.reset} ${client.currentAddress}`);
                    console.log(`      ${colors.cyan}Tiempo:${colors.reset} ${formatUptime(client.uptime)}`);
                } else {
                    console.log(`      ${colors.cyan}IP Config:${colors.reset} ${client.remoteAddress || 'N/A'}`);
                }
                console.log('');
            });
        });
        
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    } finally {
        await mikrotik.disconnect();
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--by-profile') || args.includes('-p')) {
        await listClientsByProfile();
    } else {
        await listAllClients();
    }
    
    console.log(`\n${colors.green}✅ Listado completado${colors.reset}`);
    console.log(`${colors.yellow}💡 Usa --by-profile o -p para agrupar por perfil${colors.reset}`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch(error => {
        console.error(`${colors.red}💥 Error fatal: ${error.message}${colors.reset}`);
    });
}

module.exports = {
    listAllClients,
    listClientsByProfile
};
