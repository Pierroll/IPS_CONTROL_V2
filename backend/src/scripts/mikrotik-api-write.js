/**
 * Script para ejecutar comandos de escritura usando la API del MikroTik
 * Enfoque mejorado para comandos que requieren escritura
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

class MikrotikAPIWrite {
    constructor() {
        this.mikrotik = new MikrotikConnection();
    }

    async connect() {
        return await this.mikrotik.connect();
    }

    async disconnect() {
        return await this.mikrotik.disconnect();
    }

    /**
     * Ejecuta un comando de escritura usando diferentes métodos
     */
    async executeWriteCommand(command, params = {}) {
        try {
            console.log(`${colors.cyan}🔧 Ejecutando: ${command}${colors.reset}`);
            console.log(`${colors.cyan}📋 Parámetros: ${JSON.stringify(params)}${colors.reset}`);
            
            // Método 1: Usando write directamente
            const result = await this.mikrotik.connection.write(command, params);
            
            console.log(`${colors.green}✅ Comando ejecutado${colors.reset}`);
            console.log(`${colors.cyan}📤 Resultado: ${JSON.stringify(result)}${colors.reset}`);
            
            return {
                success: true,
                result: result,
                method: 'write'
            };
            
        } catch (error) {
            console.log(`${colors.red}❌ Error con método write: ${error.message}${colors.reset}`);
            
            // Método 2: Usando executeCommand
            try {
                console.log(`${colors.yellow}🔄 Intentando con executeCommand...${colors.reset}`);
                const result2 = await this.mikrotik.executeCommand(command, params);
                
                console.log(`${colors.green}✅ Comando ejecutado con executeCommand${colors.reset}`);
                console.log(`${colors.cyan}📤 Resultado: ${JSON.stringify(result2)}${colors.reset}`);
                
                return {
                    success: true,
                    result: result2,
                    method: 'executeCommand'
                };
                
            } catch (error2) {
                console.log(`${colors.red}❌ Error con executeCommand: ${error2.message}${colors.reset}`);
                
                return {
                    success: false,
                    error: error2.message,
                    method: 'both_failed'
                };
            }
        }
    }

    /**
     * Cambia el perfil de un cliente usando múltiples enfoques
     */
    async changeClientProfile(username, newProfile) {
        try {
            console.log(`${colors.yellow}🔄 Cambiando perfil de ${username} a ${newProfile}${colors.reset}\n`);
            
            // 1. Desconectar cliente si está activo
            console.log(`${colors.blue}1️⃣ Desconectando cliente si está activo...${colors.reset}`);
            const activeUsers = await this.mikrotik.executeCommand('/ppp/active/print', {
                '.proplist': '.id,name'
            });
            
            const activeUser = activeUsers.find(u => u.name === username);
            if (activeUser) {
                console.log(`${colors.yellow}📴 Cliente activo encontrado, desconectando...${colors.reset}`);
                await this.mikrotik.executeCommand('/ppp/active/remove', {
                    '.id': activeUser['.id']
                });
                console.log(`${colors.green}✅ Cliente desconectado${colors.reset}`);
                
                // Esperar
                await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
                console.log(`${colors.cyan}ℹ️ Cliente no está activo${colors.reset}`);
            }
            console.log('');
            
            // 2. Obtener información del secreto
            console.log(`${colors.blue}2️⃣ Obteniendo información del secreto...${colors.reset}`);
            const secrets = await this.mikrotik.executeCommand('/ppp/secret/print', {
                '.proplist': '.id,name,profile'
            });
            
            const secret = secrets.find(s => s.name === username);
            if (!secret) {
                throw new Error(`Cliente ${username} no encontrado`);
            }
            
            console.log(`${colors.cyan}Secreto encontrado:${colors.reset}`);
            console.log(`   • ID: ${secret['.id']}`);
            console.log(`   • Nombre: ${secret.name}`);
            console.log(`   • Perfil actual: ${secret.profile}`);
            console.log('');
            
            // 3. Intentar diferentes métodos de cambio
            console.log(`${colors.blue}3️⃣ Intentando cambio de perfil...${colors.reset}`);
            
            const methods = [
                {
                    name: 'Método 1: .id con profile',
                    command: '/ppp/secret/set',
                    params: { '.id': secret['.id'], 'profile': newProfile }
                },
                {
                    name: 'Método 2: numbers con profile',
                    command: '/ppp/secret/set',
                    params: { 'numbers': username, 'profile': newProfile }
                },
                {
                    name: 'Método 3: where con profile',
                    command: '/ppp/secret/set',
                    params: { 'where': `name="${username}"`, 'profile': newProfile }
                },
                {
                    name: 'Método 4: .id con profile (sin espacios)',
                    command: '/ppp/secret/set',
                    params: { '.id': secret['.id'], 'profile': newProfile.replace(/\s+/g, '_') }
                }
            ];
            
            for (const method of methods) {
                console.log(`${colors.yellow}${method.name}:${colors.reset}`);
                
                const result = await this.executeWriteCommand(method.command, method.params);
                
                if (result.success) {
                    // Verificar el cambio
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    const check = await this.mikrotik.executeCommand('/ppp/secret/print', {
                        '.proplist': 'name,profile'
                    });
                    
                    const updated = check.find(s => s.name === username);
                    console.log(`   Perfil después: ${updated?.profile || 'N/A'}`);
                    
                    if (updated?.profile === newProfile || updated?.profile === newProfile.replace(/\s+/g, '_')) {
                        console.log(`${colors.green}🎉 ¡ÉXITO! Perfil cambiado correctamente${colors.reset}`);
                        return {
                            success: true,
                            method: method.name,
                            oldProfile: secret.profile,
                            newProfile: updated.profile
                        };
                    }
                }
                
                console.log('');
            }
            
            console.log(`${colors.red}❌ Ningún método funcionó${colors.reset}`);
            return {
                success: false,
                message: 'Ningún método de cambio de perfil funcionó'
            };
            
        } catch (error) {
            console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Deshabilita un cliente
     */
    async disableClient(username) {
        try {
            console.log(`${colors.yellow}🚫 Deshabilitando cliente: ${username}${colors.reset}\n`);
            
            // 1. Desconectar si está activo
            const activeUsers = await this.mikrotik.executeCommand('/ppp/active/print', {
                '.proplist': '.id,name'
            });
            
            const activeUser = activeUsers.find(u => u.name === username);
            if (activeUser) {
                await this.mikrotik.executeCommand('/ppp/active/remove', {
                    '.id': activeUser['.id']
                });
                console.log(`${colors.green}✅ Cliente desconectado${colors.reset}`);
            }
            
            // 2. Deshabilitar
            const result = await this.executeWriteCommand('/ppp/secret/set', {
                'numbers': username,
                'disabled': 'yes'
            });
            
            if (result.success) {
                // Verificar
                await new Promise(resolve => setTimeout(resolve, 2000));
                const verify = await this.mikrotik.executeCommand('/ppp/secret/print', {
                    '.proplist': 'name,disabled'
                });
                
                const updated = verify.find(s => s.name === username);
                if (updated?.disabled === 'true') {
                    console.log(`${colors.green}🎉 ¡CLIENTE DESHABILITADO EXITOSAMENTE!${colors.reset}`);
                    return { success: true, message: 'Cliente deshabilitado' };
                }
            }
            
            return { success: false, message: 'No se pudo deshabilitar' };
            
        } catch (error) {
            console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return { success: false, error: error.message };
        }
    }
}

async function testAPIWrite() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  PRUEBA DE ESCRITURA VÍA API                            ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikAPIWrite();
    
    try {
        await mikrotik.connect();
        
        const username = 'M_DonGato';
        const newProfile = 'profile1';
        
        console.log(`${colors.yellow}🎯 Probando cambio de perfil vía API mejorada${colors.reset}`);
        console.log(`${colors.yellow}👤 Cliente: ${username}${colors.reset}`);
        console.log(`${colors.yellow}🎯 Nuevo perfil: ${newProfile}${colors.reset}\n`);
        
        const result = await mikrotik.changeClientProfile(username, newProfile);
        
        if (result.success) {
            console.log(`${colors.green}🎉 ¡ÉXITO! El cambio de perfil funciona vía API mejorada${colors.reset}`);
            console.log(`${colors.cyan}Método exitoso: ${result.method}${colors.reset}`);
        } else {
            console.log(`${colors.red}❌ El cambio de perfil no funcionó: ${result.message || result.error}${colors.reset}`);
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
        console.log(`  node mikrotik-api-write.js <comando> [argumentos]`);
        console.log('');
        console.log(`${colors.cyan}Comandos disponibles:${colors.reset}`);
        console.log(`  test                    - Probar cambio de perfil`);
        console.log(`  change <usuario> <perfil> - Cambiar perfil de cliente`);
        console.log(`  disable <usuario>      - Deshabilitar cliente`);
        console.log('');
        console.log(`${colors.cyan}Ejemplos:${colors.reset}`);
        console.log(`  node mikrotik-api-write.js test`);
        console.log(`  node mikrotik-api-write.js change M_DonGato "CORTE MOROSO"`);
        console.log(`  node mikrotik-api-write.js disable M_DonGato`);
        return;
    }
    
    const command = args[0];
    
    switch (command) {
        case 'test':
            await testAPIWrite();
            break;
            
        case 'change':
            if (args.length < 3) {
                console.log(`${colors.red}❌ Error: Se requiere usuario y perfil${colors.reset}`);
                return;
            }
            const mikrotik = new MikrotikAPIWrite();
            await mikrotik.connect();
            await mikrotik.changeClientProfile(args[1], args[2]);
            await mikrotik.disconnect();
            break;
            
        case 'disable':
            if (args.length < 2) {
                console.log(`${colors.red}❌ Error: Se requiere usuario${colors.reset}`);
                return;
            }
            const mikrotikDisable = new MikrotikAPIWrite();
            await mikrotikDisable.connect();
            await mikrotikDisable.disableClient(args[1]);
            await mikrotikDisable.disconnect();
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

module.exports = { MikrotikAPIWrite, testAPIWrite };
