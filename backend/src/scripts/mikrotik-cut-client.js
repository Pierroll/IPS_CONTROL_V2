/**
 * Script para cortar/suspender clientes usando la API del MikroTik
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

class MikrotikCutService {
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
     * Método 1: Desconectar cliente activo (corte temporal)
     */
    async cutClientTemporary(username) {
        try {
            console.log(`${colors.yellow}🔌 CORTE TEMPORAL - Desconectando cliente: ${username}${colors.reset}`);
            
            // Obtener usuarios activos
            const activeUsers = await this.mikrotik.executeCommand('/ppp/active/print', {
                '.proplist': '.id,name,address,uptime'
            });
            
            const activeUser = activeUsers.find(u => u.name === username);
            if (!activeUser) {
                console.log(`${colors.cyan}ℹ️ Cliente ${username} no está activo${colors.reset}`);
                return {
                    success: true,
                    message: 'Cliente no estaba activo',
                    type: 'temporary'
                };
            }
            
            console.log(`${colors.cyan}Cliente activo encontrado:${colors.reset}`);
            console.log(`   • IP: ${activeUser.address}`);
            console.log(`   • Tiempo activo: ${activeUser.uptime}`);
            
            // Desconectar
            const result = await this.mikrotik.executeCommand('/ppp/active/remove', {
                '.id': activeUser['.id']
            });
            
            console.log(`${colors.green}✅ Cliente desconectado exitosamente${colors.reset}`);
            
            return {
                success: true,
                message: 'Cliente desconectado (corte temporal)',
                type: 'temporary',
                wasActive: true,
                ip: activeUser.address,
                uptime: activeUser.uptime
            };
            
        } catch (error) {
            console.error(`${colors.red}❌ Error en corte temporal: ${error.message}${colors.reset}`);
            return {
                success: false,
                error: error.message,
                type: 'temporary'
            };
        }
    }

    /**
     * Método 2: Deshabilitar cliente (corte permanente hasta reactivación)
     */
    async cutClientPermanent(username) {
        try {
            console.log(`${colors.yellow}🚫 CORTE PERMANENTE - Deshabilitando cliente: ${username}${colors.reset}`);
            
            // 1. Desconectar si está activo
            const activeUsers = await this.mikrotik.executeCommand('/ppp/active/print', {
                '.proplist': '.id,name'
            });
            
            const activeUser = activeUsers.find(u => u.name === username);
            if (activeUser) {
                console.log(`${colors.cyan}📴 Desconectando cliente activo primero...${colors.reset}`);
                await this.mikrotik.executeCommand('/ppp/active/remove', {
                    '.id': activeUser['.id']
                });
                console.log(`${colors.green}✅ Cliente desconectado${colors.reset}`);
                
                // Esperar un momento
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // 2. Obtener información del secreto
            const secrets = await this.mikrotik.executeCommand('/ppp/secret/print', {
                '.proplist': '.id,name,profile,disabled'
            });
            
            const secret = secrets.find(s => s.name === username);
            if (!secret) {
                throw new Error(`Cliente ${username} no encontrado en secretos PPPoE`);
            }
            
            console.log(`${colors.cyan}Secreto encontrado:${colors.reset}`);
            console.log(`   • ID: ${secret['.id']}`);
            console.log(`   • Perfil: ${secret.profile}`);
            console.log(`   • Estado actual: ${secret.disabled === 'true' ? 'Deshabilitado' : 'Habilitado'}`);
            
            // 3. Deshabilitar el secreto
            console.log(`${colors.yellow}🔧 Deshabilitando secreto PPPoE...${colors.reset}`);
            
            const result = await this.mikrotik.executeCommand('/ppp/secret/set', {
                '.id': secret['.id'],
                'disabled': 'yes'
            });
            
            console.log(`${colors.green}✅ Comando de deshabilitación ejecutado${colors.reset}`);
            
            // 4. Verificar el cambio
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const verifySecrets = await this.mikrotik.executeCommand('/ppp/secret/print', {
                '.proplist': 'name,disabled'
            });
            
            const updatedSecret = verifySecrets.find(s => s.name === username);
            
            if (updatedSecret && updatedSecret.disabled === 'true') {
                console.log(`${colors.green}🎉 ¡CLIENTE CORTADO PERMANENTEMENTE!${colors.reset}`);
                console.log(`${colors.yellow}💡 El cliente no podrá conectarse hasta que sea habilitado nuevamente${colors.reset}`);
                
                return {
                    success: true,
                    message: 'Cliente cortado permanentemente',
                    type: 'permanent',
                    wasActive: !!activeUser,
                    oldStatus: secret.disabled === 'true' ? 'disabled' : 'enabled',
                    newStatus: 'disabled'
                };
            } else {
                console.log(`${colors.red}❌ El cliente no se deshabilitó correctamente${colors.reset}`);
                return {
                    success: false,
                    message: 'No se pudo deshabilitar el cliente',
                    type: 'permanent'
                };
            }
            
        } catch (error) {
            console.error(`${colors.red}❌ Error en corte permanente: ${error.message}${colors.reset}`);
            return {
                success: false,
                error: error.message,
                type: 'permanent'
            };
        }
    }

    /**
     * Método 3: Cambiar a perfil de corte (si funciona)
     */
    async cutClientProfile(username, cutProfile = 'CORTE MOROSO') {
        try {
            console.log(`${colors.yellow}🔄 CORTE POR PERFIL - Cambiando a perfil: ${cutProfile}${colors.reset}`);
            
            // 1. Desconectar si está activo
            const activeUsers = await this.mikrotik.executeCommand('/ppp/active/print', {
                '.proplist': '.id,name'
            });
            
            const activeUser = activeUsers.find(u => u.name === username);
            if (activeUser) {
                console.log(`${colors.cyan}📴 Desconectando cliente activo...${colors.reset}`);
                await this.mikrotik.executeCommand('/ppp/active/remove', {
                    '.id': activeUser['.id']
                });
                console.log(`${colors.green}✅ Cliente desconectado${colors.reset}`);
                
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            
            // 2. Obtener información del secreto
            const secrets = await this.mikrotik.executeCommand('/ppp/secret/print', {
                '.proplist': '.id,name,profile'
            });
            
            const secret = secrets.find(s => s.name === username);
            if (!secret) {
                throw new Error(`Cliente ${username} no encontrado`);
            }
            
            console.log(`${colors.cyan}Perfil actual: ${secret.profile}${colors.reset}`);
            console.log(`${colors.yellow}🔄 Cambiando a perfil: ${cutProfile}${colors.reset}`);
            
            // 3. Cambiar perfil
            const result = await this.mikrotik.executeCommand('/ppp/secret/set', {
                '.id': secret['.id'],
                'profile': cutProfile
            });
            
            console.log(`${colors.green}✅ Comando de cambio de perfil ejecutado${colors.reset}`);
            
            // 4. Verificar el cambio
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const verifySecrets = await this.mikrotik.executeCommand('/ppp/secret/print', {
                '.proplist': 'name,profile'
            });
            
            const updatedSecret = verifySecrets.find(s => s.name === username);
            
            if (updatedSecret && updatedSecret.profile === cutProfile) {
                console.log(`${colors.green}🎉 ¡PERFIL CAMBIADO EXITOSAMENTE!${colors.reset}`);
                return {
                    success: true,
                    message: `Perfil cambiado a ${cutProfile}`,
                    type: 'profile',
                    oldProfile: secret.profile,
                    newProfile: updatedSecret.profile
                };
            } else {
                console.log(`${colors.red}❌ El perfil no cambió${colors.reset}`);
                return {
                    success: false,
                    message: 'No se pudo cambiar el perfil',
                    type: 'profile'
                };
            }
            
        } catch (error) {
            console.error(`${colors.red}❌ Error en cambio de perfil: ${error.message}${colors.reset}`);
            return {
                success: false,
                error: error.message,
                type: 'profile'
            };
        }
    }

    /**
     * Método combinado: Probar todos los métodos
     */
    async cutClientAllMethods(username) {
        console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║  CORTE DE CLIENTE - MÚLTIPLES MÉTODOS                    ║${colors.reset}`);
        console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

        const results = [];
        
        // Método 1: Corte temporal
        console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`${colors.magenta}MÉTODO 1: CORTE TEMPORAL${colors.reset}`);
        console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        const tempResult = await this.cutClientTemporary(username);
        results.push(tempResult);
        console.log('');
        
        // Método 2: Corte permanente
        console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`${colors.magenta}MÉTODO 2: CORTE PERMANENTE${colors.reset}`);
        console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        const permResult = await this.cutClientPermanent(username);
        results.push(permResult);
        console.log('');
        
        // Método 3: Cambio de perfil
        console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        console.log(`${colors.magenta}MÉTODO 3: CAMBIO DE PERFIL${colors.reset}`);
        console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        const profileResult = await this.cutClientProfile(username);
        results.push(profileResult);
        console.log('');
        
        // Resumen
        console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║  RESUMEN DE RESULTADOS                                   ║${colors.reset}`);
        console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);
        
        results.forEach((result, index) => {
            const methodName = ['Corte Temporal', 'Corte Permanente', 'Cambio de Perfil'][index];
            const status = result.success ? '✅ EXITOSO' : '❌ FALLIDO';
            const color = result.success ? colors.green : colors.red;
            
            console.log(`${color}${methodName}: ${status}${colors.reset}`);
            if (result.success) {
                console.log(`   ${colors.cyan}Mensaje: ${result.message}${colors.reset}`);
            } else {
                console.log(`   ${colors.red}Error: ${result.error || result.message}${colors.reset}`);
            }
            console.log('');
        });
        
        return results;
    }
}

async function testCutClient() {
    const cutService = new MikrotikCutService();
    
    try {
        await cutService.connect();
        
        const username = 'M_DonGato';
        
        console.log(`${colors.yellow}🎯 Probando corte de cliente: ${username}${colors.reset}\n`);
        
        const results = await cutService.cutClientAllMethods(username);
        
        // Verificar cuáles métodos funcionaron
        const successfulMethods = results.filter(r => r.success);
        
        if (successfulMethods.length > 0) {
            console.log(`${colors.green}🎉 ¡AL MENOS UN MÉTODO FUNCIONÓ!${colors.reset}`);
            console.log(`${colors.cyan}Métodos exitosos: ${successfulMethods.length}/3${colors.reset}`);
        } else {
            console.log(`${colors.red}❌ Ningún método funcionó${colors.reset}`);
        }
        
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    } finally {
        await cutService.disconnect();
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`${colors.yellow}Uso del script:${colors.reset}`);
        console.log(`  node mikrotik-cut-client.js <comando> [argumentos]`);
        console.log('');
        console.log(`${colors.cyan}Comandos disponibles:${colors.reset}`);
        console.log(`  test                    - Probar todos los métodos de corte`);
        console.log(`  temp <usuario>         - Corte temporal (desconectar)`);
        console.log(`  perm <usuario>         - Corte permanente (deshabilitar)`);
        console.log(`  profile <usuario> [perfil] - Cambio de perfil`);
        console.log(`  all <usuario>          - Probar todos los métodos`);
        console.log('');
        console.log(`${colors.cyan}Ejemplos:${colors.reset}`);
        console.log(`  node mikrotik-cut-client.js test`);
        console.log(`  node mikrotik-cut-client.js temp M_DonGato`);
        console.log(`  node mikrotik-cut-client.js perm M_DonGato`);
        console.log(`  node mikrotik-cut-client.js profile M_DonGato "CORTE MOROSO"`);
        console.log(`  node mikrotik-cut-client.js all M_DonGato`);
        return;
    }
    
    const command = args[0];
    const cutService = new MikrotikCutService();
    
    try {
        await cutService.connect();
        
        switch (command) {
            case 'test':
                await testCutClient();
                break;
                
            case 'temp':
                if (args.length < 2) {
                    console.log(`${colors.red}❌ Error: Se requiere usuario${colors.reset}`);
                    return;
                }
                await cutService.cutClientTemporary(args[1]);
                break;
                
            case 'perm':
                if (args.length < 2) {
                    console.log(`${colors.red}❌ Error: Se requiere usuario${colors.reset}`);
                    return;
                }
                await cutService.cutClientPermanent(args[1]);
                break;
                
            case 'profile':
                if (args.length < 2) {
                    console.log(`${colors.red}❌ Error: Se requiere usuario${colors.reset}`);
                    return;
                }
                const profile = args[2] || 'CORTE MOROSO';
                await cutService.cutClientProfile(args[1], profile);
                break;
                
            case 'all':
                if (args.length < 2) {
                    console.log(`${colors.red}❌ Error: Se requiere usuario${colors.reset}`);
                    return;
                }
                await cutService.cutClientAllMethods(args[1]);
                break;
                
            default:
                console.log(`${colors.red}❌ Comando no reconocido: ${command}${colors.reset}`);
        }
        
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    } finally {
        await cutService.disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch(error => {
        console.error(`${colors.red}💥 Error fatal: ${error.message}${colors.reset}`);
    });
}

module.exports = { MikrotikCutService, testCutClient };
