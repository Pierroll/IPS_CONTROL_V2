/**
 * Script mejorado para la API de MikroTik - Enfoque v2
 * Basado en documentación oficial y mejores prácticas
 */

const { RouterOSAPI } = require('node-routeros');

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

// Configuración del MikroTik
const MIKROTIK_CONFIG = {
    host: '45.5.56.186',
    port: 3582,
    user: 'apiuser',
    password: 'TuPasswordSeguro',
    timeout: 15,
    tls: false
};

class MikrotikAPIV2 {
    constructor() {
        this.connection = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            console.log(`${colors.yellow}🔄 Conectando a MikroTik...${colors.reset}`);
            console.log(`   Host: ${MIKROTIK_CONFIG.host}:${MIKROTIK_CONFIG.port}`);
            console.log(`   Usuario: ${MIKROTIK_CONFIG.user}`);
            
            this.connection = new RouterOSAPI(MIKROTIK_CONFIG);
            await this.connection.connect();
            this.isConnected = true;
            
            console.log(`${colors.green}✅ Conectado exitosamente${colors.reset}`);
            return true;
        } catch (error) {
            console.error(`${colors.red}❌ Error de conexión: ${error.message}${colors.reset}`);
            this.isConnected = false;
            return false;
        }
    }

    async disconnect() {
        try {
            if (this.connection && this.isConnected) {
                await this.connection.close();
                this.isConnected = false;
                console.log(`${colors.green}✅ Desconectado${colors.reset}`);
            }
        } catch (error) {
            console.error(`${colors.red}❌ Error al desconectar: ${error.message}${colors.reset}`);
        }
    }

    /**
     * Ejecuta un comando de lectura
     */
    async read(command, params = {}) {
        if (!this.isConnected) {
            throw new Error('No hay conexión activa');
        }

        try {
            console.log(`${colors.cyan}📖 Leyendo: ${command}${colors.reset}`);
            if (Object.keys(params).length > 0) {
                console.log(`${colors.cyan}   Parámetros: ${JSON.stringify(params)}${colors.reset}`);
            }
            
            const result = await this.connection.write(command, params);
            console.log(`${colors.green}✅ Lectura exitosa${colors.reset}`);
            return result;
        } catch (error) {
            console.error(`${colors.red}❌ Error en lectura: ${error.message}${colors.reset}`);
            throw error;
        }
    }

    /**
     * Ejecuta un comando de escritura
     */
    async write(command, params = {}) {
        if (!this.isConnected) {
            throw new Error('No hay conexión activa');
        }

        try {
            console.log(`${colors.cyan}✏️ Escribiendo: ${command}${colors.reset}`);
            console.log(`${colors.cyan}   Parámetros: ${JSON.stringify(params)}${colors.reset}`);
            
            const result = await this.connection.write(command, params);
            console.log(`${colors.green}✅ Escritura exitosa${colors.reset}`);
            console.log(`${colors.cyan}   Resultado: ${JSON.stringify(result)}${colors.reset}`);
            return result;
        } catch (error) {
            console.error(`${colors.red}❌ Error en escritura: ${error.message}${colors.reset}`);
            throw error;
        }
    }

    /**
     * Método 1: Deshabilitar cliente usando .id
     */
    async disableClientById(username) {
        try {
            console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
            console.log(`${colors.magenta}MÉTODO 1: Deshabilitar con .id${colors.reset}`);
            console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

            // 1. Obtener información del secreto
            const secrets = await this.read('/ppp/secret/print', {
                '.proplist': '.id,name,disabled,profile'
            });

            const secret = secrets.find(s => s.name === username);
            if (!secret) {
                throw new Error(`Cliente ${username} no encontrado`);
            }

            console.log(`${colors.cyan}Secreto encontrado:${colors.reset}`);
            console.log(`   • ID: ${secret['.id']}`);
            console.log(`   • Estado: ${secret.disabled === 'true' ? 'Deshabilitado' : 'Habilitado'}`);
            console.log(`   • Perfil: ${secret.profile}`);

            // 2. Desconectar si está activo
            const activeUsers = await this.read('/ppp/active/print', {
                '.proplist': '.id,name,address'
            });

            const activeUser = activeUsers.find(u => u.name === username);
            if (activeUser) {
                console.log(`${colors.yellow}📴 Desconectando cliente activo...${colors.reset}`);
                await this.write('/ppp/active/remove', {
                    '.id': activeUser['.id']
                });
                console.log(`${colors.green}✅ Cliente desconectado${colors.reset}`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // 3. Deshabilitar usando .id
            console.log(`${colors.yellow}🔧 Deshabilitando secreto...${colors.reset}`);
            const result = await this.write('/ppp/secret/set', {
                '.id': secret['.id'],
                'disabled': 'yes'
            });

            // 4. Verificar
            await new Promise(resolve => setTimeout(resolve, 2000));
            const verify = await this.read('/ppp/secret/print', {
                '.proplist': 'name,disabled'
            });

            const updated = verify.find(s => s.name === username);
            const success = updated && updated.disabled === 'true';

            if (success) {
                console.log(`${colors.green}🎉 ¡CLIENTE DESHABILITADO EXITOSAMENTE!${colors.reset}`);
            } else {
                console.log(`${colors.red}❌ El cliente no se deshabilitó${colors.reset}`);
            }

            return success;

        } catch (error) {
            console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return false;
        }
    }

    /**
     * Método 2: Deshabilitar usando numbers
     */
    async disableClientByNumbers(username) {
        try {
            console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
            console.log(`${colors.magenta}MÉTODO 2: Deshabilitar con numbers${colors.reset}`);
            console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

            // Desconectar si está activo
            const activeUsers = await this.read('/ppp/active/print', {
                '.proplist': '.id,name'
            });

            const activeUser = activeUsers.find(u => u.name === username);
            if (activeUser) {
                console.log(`${colors.yellow}📴 Desconectando cliente activo...${colors.reset}`);
                await this.write('/ppp/active/remove', {
                    '.id': activeUser['.id']
                });
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Deshabilitar usando numbers
            console.log(`${colors.yellow}🔧 Deshabilitando con numbers...${colors.reset}`);
            const result = await this.write('/ppp/secret/set', {
                'numbers': username,
                'disabled': 'yes'
            });

            // Verificar
            await new Promise(resolve => setTimeout(resolve, 2000));
            const verify = await this.read('/ppp/secret/print', {
                '.proplist': 'name,disabled'
            });

            const updated = verify.find(s => s.name === username);
            const success = updated && updated.disabled === 'true';

            if (success) {
                console.log(`${colors.green}🎉 ¡CLIENTE DESHABILITADO EXITOSAMENTE!${colors.reset}`);
            } else {
                console.log(`${colors.red}❌ El cliente no se deshabilitó${colors.reset}`);
            }

            return success;

        } catch (error) {
            console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return false;
        }
    }

    /**
     * Método 3: Cambiar perfil usando .id
     */
    async changeProfileById(username, newProfile) {
        try {
            console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
            console.log(`${colors.magenta}MÉTODO 3: Cambiar perfil con .id${colors.reset}`);
            console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

            // 1. Obtener información del secreto
            const secrets = await this.read('/ppp/secret/print', {
                '.proplist': '.id,name,profile'
            });

            const secret = secrets.find(s => s.name === username);
            if (!secret) {
                throw new Error(`Cliente ${username} no encontrado`);
            }

            console.log(`${colors.cyan}Perfil actual: ${secret.profile}${colors.reset}`);
            console.log(`${colors.yellow}🔄 Cambiando a: ${newProfile}${colors.reset}`);

            // 2. Desconectar si está activo
            const activeUsers = await this.read('/ppp/active/print', {
                '.proplist': '.id,name'
            });

            const activeUser = activeUsers.find(u => u.name === username);
            if (activeUser) {
                console.log(`${colors.yellow}📴 Desconectando cliente activo...${colors.reset}`);
                await this.write('/ppp/active/remove', {
                    '.id': activeUser['.id']
                });
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // 3. Cambiar perfil
            const result = await this.write('/ppp/secret/set', {
                '.id': secret['.id'],
                'profile': newProfile
            });

            // 4. Verificar
            await new Promise(resolve => setTimeout(resolve, 2000));
            const verify = await this.read('/ppp/secret/print', {
                '.proplist': 'name,profile'
            });

            const updated = verify.find(s => s.name === username);
            const success = updated && updated.profile === newProfile;

            if (success) {
                console.log(`${colors.green}🎉 ¡PERFIL CAMBIADO EXITOSAMENTE!${colors.reset}`);
                console.log(`${colors.cyan}Nuevo perfil: ${updated.profile}${colors.reset}`);
            } else {
                console.log(`${colors.red}❌ El perfil no cambió${colors.reset}`);
                console.log(`${colors.cyan}Perfil actual: ${updated?.profile || 'N/A'}${colors.reset}`);
            }

            return success;

        } catch (error) {
            console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return false;
        }
    }

    /**
     * Método 4: Usar comando add para crear un nuevo secreto deshabilitado
     */
    async disableClientByRecreation(username) {
        try {
            console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
            console.log(`${colors.magenta}MÉTODO 4: Recrear secreto deshabilitado${colors.reset}`);
            console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

            // 1. Obtener información del secreto actual
            const secrets = await this.read('/ppp/secret/print', {
                '.proplist': '.id,name,password,profile,service,disabled'
            });

            const secret = secrets.find(s => s.name === username);
            if (!secret) {
                throw new Error(`Cliente ${username} no encontrado`);
            }

            console.log(`${colors.cyan}Secreto actual:${colors.reset}`);
            console.log(`   • ID: ${secret['.id']}`);
            console.log(`   • Perfil: ${secret.profile}`);
            console.log(`   • Servicio: ${secret.service}`);
            console.log(`   • Estado: ${secret.disabled === 'true' ? 'Deshabilitado' : 'Habilitado'}`);

            // 2. Desconectar si está activo
            const activeUsers = await this.read('/ppp/active/print', {
                '.proplist': '.id,name'
            });

            const activeUser = activeUsers.find(u => u.name === username);
            if (activeUser) {
                console.log(`${colors.yellow}📴 Desconectando cliente activo...${colors.reset}`);
                await this.write('/ppp/active/remove', {
                    '.id': activeUser['.id']
                });
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // 3. Eliminar el secreto actual
            console.log(`${colors.yellow}🗑️ Eliminando secreto actual...${colors.reset}`);
            await this.write('/ppp/secret/remove', {
                '.id': secret['.id']
            });

            // 4. Crear nuevo secreto deshabilitado
            console.log(`${colors.yellow}➕ Creando nuevo secreto deshabilitado...${colors.reset}`);
            const newSecret = await this.write('/ppp/secret/add', {
                'name': username,
                'password': secret.password || 'password123', // Usar password actual o default
                'profile': secret.profile,
                'service': secret.service || 'pppoe',
                'disabled': 'yes'
            });

            // 5. Verificar
            await new Promise(resolve => setTimeout(resolve, 2000));
            const verify = await this.read('/ppp/secret/print', {
                '.proplist': 'name,disabled'
            });

            const updated = verify.find(s => s.name === username);
            const success = updated && updated.disabled === 'true';

            if (success) {
                console.log(`${colors.green}🎉 ¡CLIENTE DESHABILITADO POR RECREACIÓN!${colors.reset}`);
            } else {
                console.log(`${colors.red}❌ El cliente no se deshabilitó${colors.reset}`);
            }

            return success;

        } catch (error) {
            console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return false;
        }
    }

    /**
     * Probar todos los métodos
     */
    async testAllMethods(username) {
        console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║  API MIKROTIK V2 - PRUEBA COMPLETA                      ║${colors.reset}`);
        console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

        console.log(`${colors.yellow}🎯 Cliente objetivo: ${username}${colors.reset}\n`);

        const results = [];

        // Método 1: Deshabilitar con .id
        const result1 = await this.disableClientById(username);
        results.push({ method: 'Deshabilitar con .id', success: result1 });
        console.log('');

        if (!result1) {
            // Método 2: Deshabilitar con numbers
            const result2 = await this.disableClientByNumbers(username);
            results.push({ method: 'Deshabilitar con numbers', success: result2 });
            console.log('');

            if (!result2) {
                // Método 3: Cambiar perfil
                const result3 = await this.changeProfileById(username, 'CORTE MOROSO');
                results.push({ method: 'Cambiar perfil', success: result3 });
                console.log('');

                if (!result3) {
                    // Método 4: Recrear secreto
                    const result4 = await this.disableClientByRecreation(username);
                    results.push({ method: 'Recrear secreto', success: result4 });
                    console.log('');
                }
            }
        }

        // Resumen final
        console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
        console.log(`${colors.cyan}║  RESUMEN DE RESULTADOS                                   ║${colors.reset}`);
        console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

        results.forEach((result, index) => {
            const status = result.success ? '✅ EXITOSO' : '❌ FALLIDO';
            const color = result.success ? colors.green : colors.red;
            console.log(`${color}${index + 1}. ${result.method}: ${status}${colors.reset}`);
        });

        const successfulMethods = results.filter(r => r.success);
        if (successfulMethods.length > 0) {
            console.log(`\n${colors.green}🎉 ¡AL MENOS UN MÉTODO FUNCIONÓ!${colors.reset}`);
            console.log(`${colors.cyan}Métodos exitosos: ${successfulMethods.length}/${results.length}${colors.reset}`);
        } else {
            console.log(`\n${colors.red}❌ Ningún método funcionó${colors.reset}`);
        }

        return results;
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`${colors.yellow}Uso del script:${colors.reset}`);
        console.log(`  node mikrotik-api-v2.js <usuario>`);
        console.log('');
        console.log(`${colors.cyan}Ejemplos:${colors.reset}`);
        console.log(`  node mikrotik-api-v2.js M_DonGato`);
        return;
    }
    
    const username = args[0];
    const api = new MikrotikAPIV2();
    
    try {
        const connected = await api.connect();
        if (connected) {
            await api.testAllMethods(username);
        }
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    } finally {
        await api.disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main().catch(error => {
        console.error(`${colors.red}💥 Error fatal: ${error.message}${colors.reset}`);
    });
}

module.exports = { MikrotikAPIV2 };
