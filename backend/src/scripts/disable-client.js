/**
 * Script para deshabilitar/habilitar clientes (método alternativo a cambiar perfil)
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

async function disableClient(username) {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  DESHABILITAR CLIENTE                                    ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikConnection();
    
    try {
        await mikrotik.connect();
        
        console.log(`${colors.yellow}🎯 Deshabilitando cliente: ${username}${colors.reset}\n`);
        
        // 1. Obtener información del secreto
        console.log(`${colors.blue}1️⃣ INFORMACIÓN ACTUAL:${colors.reset}`);
        const secrets = await mikrotik.executeCommand('/ppp/secret/print', {
            '.proplist': '.id,name,profile,service,disabled'
        });
        
        const secret = secrets.find(s => s.name === username);
        if (!secret) {
            console.log(`${colors.red}❌ Cliente no encontrado${colors.reset}`);
            return;
        }
        
        console.log(`${colors.cyan}Estado actual:${colors.reset}`);
        console.log(`   • Nombre: ${secret.name}`);
        console.log(`   • Perfil: ${secret.profile}`);
        console.log(`   • Servicio: ${secret.service}`);
        console.log(`   • Deshabilitado: ${secret.disabled === 'true' ? 'Sí' : 'No'}`);
        console.log('');
        
        // 2. Desconectar si está activo
        console.log(`${colors.blue}2️⃣ DESCONECTANDO CLIENTE:${colors.reset}`);
        const activeUsers = await mikrotik.executeCommand('/ppp/active/print', {
            '.proplist': '.id,name,address'
        });
        
        const activeUser = activeUsers.find(u => u.name === username);
        if (activeUser) {
            console.log(`${colors.yellow}📴 Cliente activo encontrado, desconectando...${colors.reset}`);
            console.log(`   • IP: ${activeUser.address}`);
            
            await mikrotik.executeCommand('/ppp/active/remove', {
                '.id': activeUser['.id']
            });
            console.log(`${colors.green}✅ Cliente desconectado${colors.reset}`);
            
            // Esperar
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.log(`${colors.cyan}ℹ️ Cliente no está activo${colors.reset}`);
        }
        console.log('');
        
        // 3. Deshabilitar el secreto
        console.log(`${colors.blue}3️⃣ DESHABILITANDO SECRETO:${colors.reset}`);
        try {
            const result = await mikrotik.executeCommand('/ppp/secret/set', {
                '.id': secret['.id'],
                'disabled': 'yes'
            });
            console.log(`${colors.green}✅ Secreto deshabilitado${colors.reset}`);
        } catch (error) {
            console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return;
        }
        console.log('');
        
        // 4. Verificar el cambio
        console.log(`${colors.blue}4️⃣ VERIFICANDO CAMBIO:${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const updatedSecrets = await mikrotik.executeCommand('/ppp/secret/print', {
            '.proplist': 'name,profile,service,disabled'
        });
        
        const updatedSecret = updatedSecrets.find(s => s.name === username);
        if (updatedSecret) {
            console.log(`${colors.cyan}Estado actualizado:${colors.reset}`);
            console.log(`   • Nombre: ${updatedSecret.name}`);
            console.log(`   • Perfil: ${updatedSecret.profile}`);
            console.log(`   • Servicio: ${updatedSecret.service}`);
            console.log(`   • Deshabilitado: ${updatedSecret.disabled === 'true' ? 'Sí' : 'No'}`);
            
            if (updatedSecret.disabled === 'true') {
                console.log(`${colors.green}✅ ¡CLIENTE DESHABILITADO EXITOSAMENTE!${colors.reset}`);
                console.log(`${colors.yellow}💡 El cliente no podrá conectarse hasta que sea habilitado nuevamente${colors.reset}`);
            } else {
                console.log(`${colors.red}❌ El cliente no se deshabilitó${colors.reset}`);
            }
        }
        
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    } finally {
        await mikrotik.disconnect();
    }
}

async function enableClient(username) {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  HABILITAR CLIENTE                                       ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikConnection();
    
    try {
        await mikrotik.connect();
        
        console.log(`${colors.yellow}🎯 Habilitando cliente: ${username}${colors.reset}\n`);
        
        // 1. Obtener información del secreto
        const secrets = await mikrotik.executeCommand('/ppp/secret/print', {
            '.proplist': '.id,name,profile,service,disabled'
        });
        
        const secret = secrets.find(s => s.name === username);
        if (!secret) {
            console.log(`${colors.red}❌ Cliente no encontrado${colors.reset}`);
            return;
        }
        
        console.log(`${colors.cyan}Estado actual:${colors.reset}`);
        console.log(`   • Nombre: ${secret.name}`);
        console.log(`   • Perfil: ${secret.profile}`);
        console.log(`   • Deshabilitado: ${secret.disabled === 'true' ? 'Sí' : 'No'}`);
        console.log('');
        
        // 2. Habilitar el secreto
        console.log(`${colors.blue}2️⃣ HABILITANDO SECRETO:${colors.reset}`);
        try {
            const result = await mikrotik.executeCommand('/ppp/secret/set', {
                '.id': secret['.id'],
                'disabled': 'no'
            });
            console.log(`${colors.green}✅ Secreto habilitado${colors.reset}`);
        } catch (error) {
            console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return;
        }
        console.log('');
        
        // 3. Verificar el cambio
        console.log(`${colors.blue}3️⃣ VERIFICANDO CAMBIO:${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const updatedSecrets = await mikrotik.executeCommand('/ppp/secret/print', {
            '.proplist': 'name,profile,service,disabled'
        });
        
        const updatedSecret = updatedSecrets.find(s => s.name === username);
        if (updatedSecret) {
            console.log(`${colors.cyan}Estado actualizado:${colors.reset}`);
            console.log(`   • Nombre: ${updatedSecret.name}`);
            console.log(`   • Perfil: ${updatedSecret.profile}`);
            console.log(`   • Deshabilitado: ${updatedSecret.disabled === 'true' ? 'Sí' : 'No'}`);
            
            if (updatedSecret.disabled === 'false') {
                console.log(`${colors.green}✅ ¡CLIENTE HABILITADO EXITOSAMENTE!${colors.reset}`);
                console.log(`${colors.yellow}💡 El cliente puede conectarse nuevamente${colors.reset}`);
            } else {
                console.log(`${colors.red}❌ El cliente no se habilitó${colors.reset}`);
            }
        }
        
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
        console.log(`  node disable-client.js <comando> <usuario>`);
        console.log('');
        console.log(`${colors.cyan}Comandos disponibles:${colors.reset}`);
        console.log(`  disable <usuario>  - Deshabilita un cliente`);
        console.log(`  enable <usuario>   - Habilita un cliente`);
        console.log('');
        console.log(`${colors.cyan}Ejemplos:${colors.reset}`);
        console.log(`  node disable-client.js disable M_DonGato`);
        console.log(`  node disable-client.js enable M_DonGato`);
        return;
    }
    
    const command = args[0];
    const username = args[1];
    
    if (!username) {
        console.log(`${colors.red}❌ Error: Se requiere nombre de usuario${colors.reset}`);
        return;
    }
    
    switch (command) {
        case 'disable':
            await disableClient(username);
            break;
            
        case 'enable':
            await enableClient(username);
            break;
            
        default:
            console.log(`${colors.red}❌ Comando no reconocido: ${command}${colors.reset}`);
            console.log(`${colors.yellow}Comandos disponibles: disable, enable${colors.reset}`);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch(error => {
        console.error(`${colors.red}💥 Error fatal: ${error.message}${colors.reset}`);
    });
}

module.exports = {
    disableClient,
    enableClient
};
