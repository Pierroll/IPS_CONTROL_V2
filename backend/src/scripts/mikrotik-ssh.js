/**
 * Script para ejecutar comandos directamente en el MikroTik vía SSH
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

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

// Configuración SSH del MikroTik
const MIKROTIK_SSH_CONFIG = {
    host: '45.5.56.186',
    port: 22,
    username: 'apiuser',
    password: 'TuPasswordSeguro'
};

class MikrotikSSH {
    constructor() {
        this.config = MIKROTIK_SSH_CONFIG;
    }

    /**
     * Ejecuta un comando en el MikroTik vía SSH
     */
    async executeCommand(command) {
        try {
            // Escapar comillas y caracteres especiales en el comando
            const escapedCommand = command.replace(/"/g, '\\"');
            
            // Construir comando SSH con expect para manejar la contraseña
            const sshCommand = `sshpass -p "${this.config.password}" ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR ${this.config.username}@${this.config.host} "${escapedCommand}"`;
            
            console.log(`${colors.cyan}🔧 Ejecutando: ${command}${colors.reset}`);
            
            const { stdout, stderr } = await execAsync(sshCommand, {
                timeout: 10000 // 10 segundos timeout
            });
            
            if (stderr && !stderr.includes('Warning: Permanently added')) {
                console.log(`${colors.yellow}⚠️ Advertencia: ${stderr}${colors.reset}`);
            }
            
            return {
                success: true,
                output: stdout.trim(),
                error: null
            };
            
        } catch (error) {
            console.log(`${colors.red}❌ Error ejecutando comando: ${error.message}${colors.reset}`);
            return {
                success: false,
                output: null,
                error: error.message
            };
        }
    }

    /**
     * Cambia el perfil de un cliente
     */
    async changeClientProfile(username, newProfile) {
        try {
            console.log(`${colors.yellow}🔄 Cambiando perfil de ${username} a ${newProfile}${colors.reset}`);
            
            // 1. Desconectar cliente si está activo
            console.log(`${colors.blue}1️⃣ Desconectando cliente si está activo...${colors.reset}`);
            const disconnectResult = await this.executeCommand(`/ppp active remove [find name="${username}"]`);
            
            if (disconnectResult.success) {
                console.log(`${colors.green}✅ Cliente desconectado${colors.reset}`);
            }
            
            // Esperar un momento
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 2. Cambiar el perfil
            console.log(`${colors.blue}2️⃣ Cambiando perfil...${colors.reset}`);
            const changeResult = await this.executeCommand(`/ppp secret set [find name="${username}"] profile="${newProfile}"`);
            
            if (changeResult.success) {
                console.log(`${colors.green}✅ Comando de cambio ejecutado${colors.reset}`);
            } else {
                throw new Error(`Error cambiando perfil: ${changeResult.error}`);
            }
            
            // 3. Verificar el cambio
            console.log(`${colors.blue}3️⃣ Verificando cambio...${colors.reset}`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const verifyResult = await this.executeCommand(`/ppp secret print where name="${username}"`);
            
            if (verifyResult.success) {
                console.log(`${colors.cyan}Resultado de verificación:${colors.reset}`);
                console.log(verifyResult.output);
                
                // Buscar el perfil en la salida
                if (verifyResult.output.includes(`profile=${newProfile}`)) {
                    console.log(`${colors.green}🎉 ¡CAMBIO EXITOSO!${colors.reset}`);
                    return {
                        success: true,
                        message: `Perfil cambiado a ${newProfile}`,
                        output: verifyResult.output
                    };
                } else {
                    console.log(`${colors.red}❌ El perfil no cambió${colors.reset}`);
                    return {
                        success: false,
                        message: 'El perfil no cambió',
                        output: verifyResult.output
                    };
                }
            }
            
        } catch (error) {
            console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return {
                success: false,
                message: error.message,
                output: null
            };
        }
    }

    /**
     * Deshabilita un cliente
     */
    async disableClient(username) {
        try {
            console.log(`${colors.yellow}🚫 Deshabilitando cliente: ${username}${colors.reset}`);
            
            // 1. Desconectar si está activo
            await this.executeCommand(`/ppp active remove [find name="${username}"]`);
            
            // 2. Deshabilitar
            const result = await this.executeCommand(`/ppp secret set [find name="${username}"] disabled=yes`);
            
            if (result.success) {
                console.log(`${colors.green}✅ Cliente deshabilitado${colors.reset}`);
                
                // Verificar
                const verify = await this.executeCommand(`/ppp secret print where name="${username}"`);
                if (verify.output.includes('disabled=yes')) {
                    console.log(`${colors.green}🎉 ¡CLIENTE DESHABILITADO EXITOSAMENTE!${colors.reset}`);
                    return { success: true, message: 'Cliente deshabilitado' };
                }
            }
            
            return { success: false, message: 'No se pudo deshabilitar' };
            
        } catch (error) {
            console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * Habilita un cliente
     */
    async enableClient(username) {
        try {
            console.log(`${colors.yellow}✅ Habilitando cliente: ${username}${colors.reset}`);
            
            const result = await this.executeCommand(`/ppp secret set [find name="${username}"] disabled=no`);
            
            if (result.success) {
                console.log(`${colors.green}✅ Cliente habilitado${colors.reset}`);
                
                // Verificar
                const verify = await this.executeCommand(`/ppp secret print where name="${username}"`);
                if (verify.output.includes('disabled=no')) {
                    console.log(`${colors.green}🎉 ¡CLIENTE HABILITADO EXITOSAMENTE!${colors.reset}`);
                    return { success: true, message: 'Cliente habilitado' };
                }
            }
            
            return { success: false, message: 'No se pudo habilitar' };
            
        } catch (error) {
            console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * Lista clientes con sus perfiles
     */
    async listClients() {
        try {
            console.log(`${colors.yellow}📋 Listando clientes...${colors.reset}`);
            
            const result = await this.executeCommand('/ppp secret print');
            
            if (result.success) {
                console.log(`${colors.cyan}Clientes PPPoE:${colors.reset}`);
                console.log(result.output);
                return { success: true, output: result.output };
            }
            
            return { success: false, output: null };
            
        } catch (error) {
            console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return { success: false, output: null };
        }
    }
}

async function testSSHConnection() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  PRUEBA DE CONEXIÓN SSH A MIKROTIK                      ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikSSH();
    
    try {
        // Probar conexión básica
        console.log(`${colors.yellow}🔄 Probando conexión SSH...${colors.reset}`);
        const result = await mikrotik.executeCommand('/system identity print');
        
        if (result.success) {
            console.log(`${colors.green}✅ Conexión SSH exitosa${colors.reset}`);
            console.log(`${colors.cyan}Identidad del sistema:${colors.reset}`);
            console.log(result.output);
            console.log('');
            
            // Probar listado de clientes
            console.log(`${colors.yellow}📋 Probando listado de clientes...${colors.reset}`);
            const clientsResult = await mikrotik.listClients();
            
            if (clientsResult.success) {
                console.log(`${colors.green}✅ Listado de clientes exitoso${colors.reset}`);
            }
            
        } else {
            console.log(`${colors.red}❌ Error de conexión: ${result.error}${colors.reset}`);
        }
        
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    }
}

async function testProfileChange() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  PRUEBA DE CAMBIO DE PERFIL VÍA SSH                     ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikSSH();
    
    try {
        const username = 'M_DonGato';
        const newProfile = 'profile1';
        
        console.log(`${colors.yellow}🎯 Probando cambio de perfil vía SSH${colors.reset}`);
        console.log(`${colors.yellow}👤 Cliente: ${username}${colors.reset}`);
        console.log(`${colors.yellow}🎯 Nuevo perfil: ${newProfile}${colors.reset}\n`);
        
        const result = await mikrotik.changeClientProfile(username, newProfile);
        
        if (result.success) {
            console.log(`${colors.green}🎉 ¡ÉXITO! El cambio de perfil funciona vía SSH${colors.reset}`);
        } else {
            console.log(`${colors.red}❌ El cambio de perfil no funcionó: ${result.message}${colors.reset}`);
        }
        
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`${colors.yellow}Uso del script:${colors.reset}`);
        console.log(`  node mikrotik-ssh.js <comando> [argumentos]`);
        console.log('');
        console.log(`${colors.cyan}Comandos disponibles:${colors.reset}`);
        console.log(`  test                    - Probar conexión SSH`);
        console.log(`  test-change            - Probar cambio de perfil`);
        console.log(`  change <usuario> <perfil> - Cambiar perfil de cliente`);
        console.log(`  disable <usuario>      - Deshabilitar cliente`);
        console.log(`  enable <usuario>       - Habilitar cliente`);
        console.log(`  list                   - Listar clientes`);
        console.log('');
        console.log(`${colors.cyan}Ejemplos:${colors.reset}`);
        console.log(`  node mikrotik-ssh.js test`);
        console.log(`  node mikrotik-ssh.js change M_DonGato "CORTE MOROSO"`);
        console.log(`  node mikrotik-ssh.js disable M_DonGato`);
        return;
    }
    
    const command = args[0];
    
    switch (command) {
        case 'test':
            await testSSHConnection();
            break;
            
        case 'test-change':
            await testProfileChange();
            break;
            
        case 'change':
            if (args.length < 3) {
                console.log(`${colors.red}❌ Error: Se requiere usuario y perfil${colors.reset}`);
                return;
            }
            const mikrotik = new MikrotikSSH();
            await mikrotik.changeClientProfile(args[1], args[2]);
            break;
            
        case 'disable':
            if (args.length < 2) {
                console.log(`${colors.red}❌ Error: Se requiere usuario${colors.reset}`);
                return;
            }
            const mikrotikDisable = new MikrotikSSH();
            await mikrotikDisable.disableClient(args[1]);
            break;
            
        case 'enable':
            if (args.length < 2) {
                console.log(`${colors.red}❌ Error: Se requiere usuario${colors.reset}`);
                return;
            }
            const mikrotikEnable = new MikrotikSSH();
            await mikrotikEnable.enableClient(args[1]);
            break;
            
        case 'list':
            const mikrotikList = new MikrotikSSH();
            await mikrotikList.listClients();
            break;
            
        default:
            console.log(`${colors.red}❌ Comando no reconocido: ${command}${colors.reset}`);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch(error => {
        console.error(`${colors.red}💥 Error fatal: ${error.message}${colors.reset}`);
    });
}

module.exports = { MikrotikSSH, testSSHConnection, testProfileChange };
