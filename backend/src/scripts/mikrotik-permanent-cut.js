/**
 * Script específico para corte permanente de clientes
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

class MikrotikPermanentCut {
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
     * Método 1: Deshabilitar usando .id
     */
    async disableWithId(username) {
        try {
            console.log(`${colors.yellow}🔧 MÉTODO 1: Deshabilitando con .id${colors.reset}`);
            
            // Obtener el secreto
            const secrets = await this.mikrotik.executeCommand('/ppp/secret/print', {
                '.proplist': '.id,name,disabled'
            });
            
            const secret = secrets.find(s => s.name === username);
            if (!secret) {
                throw new Error(`Cliente ${username} no encontrado`);
            }
            
            console.log(`${colors.cyan}Secreto encontrado:${colors.reset}`);
            console.log(`   • ID: ${secret['.id']}`);
            console.log(`   • Estado actual: ${secret.disabled === 'true' ? 'Deshabilitado' : 'Habilitado'}`);
            
            // Deshabilitar
            const result = await this.mikrotik.executeCommand('/ppp/secret/set', {
                '.id': secret['.id'],
                'disabled': 'yes'
            });
            
            console.log(`${colors.green}✅ Comando ejecutado${colors.reset}`);
            console.log(`   Resultado: ${JSON.stringify(result)}`);
            
            // Verificar
            await new Promise(resolve => setTimeout(resolve, 2000));
            const verify = await this.mikrotik.executeCommand('/ppp/secret/print', {
                '.proplist': 'name,disabled'
            });
            
            const updated = verify.find(s => s.name === username);
            console.log(`${colors.cyan}Estado después: ${updated?.disabled === 'true' ? 'Deshabilitado' : 'Habilitado'}${colors.reset}`);
            
            return updated?.disabled === 'true';
            
        } catch (error) {
            console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return false;
        }
    }

    /**
     * Método 2: Deshabilitar usando numbers
     */
    async disableWithNumbers(username) {
        try {
            console.log(`${colors.yellow}🔧 MÉTODO 2: Deshabilitando con numbers${colors.reset}`);
            
            const result = await this.mikrotik.executeCommand('/ppp/secret/set', {
                'numbers': username,
                'disabled': 'yes'
            });
            
            console.log(`${colors.green}✅ Comando ejecutado${colors.reset}`);
            console.log(`   Resultado: ${JSON.stringify(result)}`);
            
            // Verificar
            await new Promise(resolve => setTimeout(resolve, 2000));
            const verify = await this.mikrotik.executeCommand('/ppp/secret/print', {
                '.proplist': 'name,disabled'
            });
            
            const updated = verify.find(s => s.name === username);
            console.log(`${colors.cyan}Estado después: ${updated?.disabled === 'true' ? 'Deshabilitado' : 'Habilitado'}${colors.reset}`);
            
            return updated?.disabled === 'true';
            
        } catch (error) {
            console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return false;
        }
    }

    /**
     * Método 3: Deshabilitar usando where
     */
    async disableWithWhere(username) {
        try {
            console.log(`${colors.yellow}🔧 MÉTODO 3: Deshabilitando con where${colors.reset}`);
            
            const result = await this.mikrotik.executeCommand('/ppp/secret/set', {
                'where': `name="${username}"`,
                'disabled': 'yes'
            });
            
            console.log(`${colors.green}✅ Comando ejecutado${colors.reset}`);
            console.log(`   Resultado: ${JSON.stringify(result)}`);
            
            // Verificar
            await new Promise(resolve => setTimeout(resolve, 2000));
            const verify = await this.mikrotik.executeCommand('/ppp/secret/print', {
                '.proplist': 'name,disabled'
            });
            
            const updated = verify.find(s => s.name === username);
            console.log(`${colors.cyan}Estado después: ${updated?.disabled === 'true' ? 'Deshabilitado' : 'Habilitado'}${colors.reset}`);
            
            return updated?.disabled === 'true';
            
        } catch (error) {
            console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return false;
        }
    }

    /**
     * Método 4: Usando write directamente
     */
    async disableWithWrite(username) {
        try {
            console.log(`${colors.yellow}🔧 MÉTODO 4: Deshabilitando con write directo${colors.reset}`);
            
            // Obtener el secreto
            const secrets = await this.mikrotik.executeCommand('/ppp/secret/print', {
                '.proplist': '.id,name,disabled'
            });
            
            const secret = secrets.find(s => s.name === username);
            if (!secret) {
                throw new Error(`Cliente ${username} no encontrado`);
            }
            
            // Usar write directamente
            const result = await this.mikrotik.connection.write('/ppp/secret/set', {
                '.id': secret['.id'],
                'disabled': 'yes'
            });
            
            console.log(`${colors.green}✅ Comando ejecutado${colors.reset}`);
            console.log(`   Resultado: ${JSON.stringify(result)}`);
            
            // Verificar
            await new Promise(resolve => setTimeout(resolve, 2000));
            const verify = await this.mikrotik.executeCommand('/ppp/secret/print', {
                '.proplist': 'name,disabled'
            });
            
            const updated = verify.find(s => s.name === username);
            console.log(`${colors.cyan}Estado después: ${updated?.disabled === 'true' ? 'Deshabilitado' : 'Habilitado'}${colors.reset}`);
            
            return updated?.disabled === 'true';
            
        } catch (error) {
            console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return false;
        }
    }

    /**
     * Método 5: Verificar permisos del usuario
     */
    async checkUserPermissions() {
        try {
            console.log(`${colors.yellow}🔧 MÉTODO 5: Verificando permisos del usuario${colors.reset}`);
            
            const users = await this.mikrotik.executeCommand('/user/print', {
                '.proplist': 'name,group,disabled'
            });
            
            const currentUser = users.find(u => u.name === 'apiuser');
            if (currentUser) {
                console.log(`${colors.cyan}Usuario apiuser:${colors.reset}`);
                console.log(`   • Nombre: ${currentUser.name}`);
                console.log(`   • Grupo: ${currentUser.group}`);
                console.log(`   • Deshabilitado: ${currentUser.disabled === 'true' ? 'Sí' : 'No'}`);
                
                if (currentUser.group === 'full') {
                    console.log(`${colors.green}✅ Usuario tiene permisos completos${colors.reset}`);
                } else {
                    console.log(`${colors.red}❌ Usuario no tiene permisos completos${colors.reset}`);
                }
            }
            
        } catch (error) {
            console.log(`${colors.red}❌ Error verificando permisos: ${error.message}${colors.reset}`);
        }
    }

    /**
     * Probar todos los métodos
     */
    async testAllMethods(username) {
        console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║  CORTE PERMANENTE - MÚLTIPLES MÉTODOS                    ║${colors.reset}`);
        console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

        console.log(`${colors.yellow}🎯 Cliente objetivo: ${username}${colors.reset}\n`);
        
        // Verificar estado inicial
        console.log(`${colors.blue}📋 ESTADO INICIAL:${colors.reset}`);
        const initialSecrets = await this.mikrotik.executeCommand('/ppp/secret/print', {
            '.proplist': 'name,disabled,profile'
        });
        
        const initialSecret = initialSecrets.find(s => s.name === username);
        if (initialSecret) {
            console.log(`${colors.cyan}Estado inicial:${colors.reset}`);
            console.log(`   • Deshabilitado: ${initialSecret.disabled === 'true' ? 'Sí' : 'No'}`);
            console.log(`   • Perfil: ${initialSecret.profile}`);
        }
        console.log('');
        
        // Verificar permisos
        await this.checkUserPermissions();
        console.log('');
        
        // Probar métodos
        const methods = [
            { name: 'Método 1: .id', func: () => this.disableWithId(username) },
            { name: 'Método 2: numbers', func: () => this.disableWithNumbers(username) },
            { name: 'Método 3: where', func: () => this.disableWithWhere(username) },
            { name: 'Método 4: write directo', func: () => this.disableWithWrite(username) }
        ];
        
        const results = [];
        
        for (const method of methods) {
            console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
            console.log(`${colors.magenta}${method.name}${colors.reset}`);
            console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
            
            const success = await method.func();
            results.push({ method: method.name, success });
            
            if (success) {
                console.log(`${colors.green}🎉 ¡ÉXITO! Cliente deshabilitado${colors.reset}`);
                break; // Si uno funciona, no necesitamos probar los demás
            } else {
                console.log(`${colors.red}❌ No funcionó${colors.reset}`);
            }
            
            console.log('');
        }
        
        // Resumen final
        console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║  RESUMEN FINAL                                          ║${colors.reset}`);
        console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);
        
        const successfulMethods = results.filter(r => r.success);
        
        if (successfulMethods.length > 0) {
            console.log(`${colors.green}🎉 ¡CORTE PERMANENTE EXITOSO!${colors.reset}`);
            console.log(`${colors.cyan}Método exitoso: ${successfulMethods[0].method}${colors.reset}`);
        } else {
            console.log(`${colors.red}❌ Ningún método funcionó${colors.reset}`);
            console.log(`${colors.yellow}💡 Posibles causas:${colors.reset}`);
            console.log(`   • Configuración del RouterOS`);
            console.log(`   • Políticas de seguridad`);
            console.log(`   • Versión específica del RouterOS`);
        }
        
        // Verificar estado final
        console.log(`${colors.blue}📋 ESTADO FINAL:${colors.reset}`);
        const finalSecrets = await this.mikrotik.executeCommand('/ppp/secret/print', {
            '.proplist': 'name,disabled,profile'
        });
        
        const finalSecret = finalSecrets.find(s => s.name === username);
        if (finalSecret) {
            console.log(`${colors.cyan}Estado final:${colors.reset}`);
            console.log(`   • Deshabilitado: ${finalSecret.disabled === 'true' ? 'Sí' : 'No'}`);
            console.log(`   • Perfil: ${finalSecret.profile}`);
        }
        
        return results;
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`${colors.yellow}Uso del script:${colors.reset}`);
        console.log(`  node mikrotik-permanent-cut.js <usuario>`);
        console.log('');
        console.log(`${colors.cyan}Ejemplos:${colors.reset}`);
        console.log(`  node mikrotik-permanent-cut.js M_DonGato`);
        return;
    }
    
    const username = args[0];
    const cutService = new MikrotikPermanentCut();
    
    try {
        await cutService.connect();
        await cutService.testAllMethods(username);
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

module.exports = { MikrotikPermanentCut };
