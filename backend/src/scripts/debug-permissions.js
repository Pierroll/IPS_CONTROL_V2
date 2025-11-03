/**
 * Script para debuggear permisos y probar diferentes comandos
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

async function debugPermissions() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  DEBUG DE PERMISOS Y COMANDOS                           ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikConnection();
    
    try {
        await mikrotik.connect();
        
        // 1. Verificar información del usuario actual
        console.log(`${colors.blue}1️⃣ INFORMACIÓN DEL USUARIO ACTUAL:${colors.reset}`);
        try {
            const users = await mikrotik.executeCommand('/user/print', {
                '.proplist': 'name,group,disabled'
            });
            
            const currentUser = users.find(u => u.name === 'apiuser');
            if (currentUser) {
                console.log(`${colors.cyan}Usuario apiuser:${colors.reset}`);
                console.log(`   • Nombre: ${currentUser.name}`);
                console.log(`   • Grupo: ${currentUser.group}`);
                console.log(`   • Deshabilitado: ${currentUser.disabled === 'true' ? 'Sí' : 'No'}`);
            } else {
                console.log(`${colors.red}❌ Usuario apiuser no encontrado${colors.reset}`);
            }
        } catch (error) {
            console.log(`${colors.red}❌ Error obteniendo usuarios: ${error.message}${colors.reset}`);
        }
        console.log('');
        
        // 2. Probar comandos de lectura
        console.log(`${colors.blue}2️⃣ PROBANDO COMANDOS DE LECTURA:${colors.reset}`);
        try {
            const systemInfo = await mikrotik.executeCommand('/system/resource/print');
            console.log(`${colors.green}✅ Lectura de recursos: OK${colors.reset}`);
        } catch (error) {
            console.log(`${colors.red}❌ Error lectura: ${error.message}${colors.reset}`);
        }
        console.log('');
        
        // 3. Probar comando de escritura simple
        console.log(`${colors.blue}3️⃣ PROBANDO COMANDO DE ESCRITURA SIMPLE:${colors.reset}`);
        try {
            // Intentar cambiar el comentario de un secreto (operación menos crítica)
            const secrets = await mikrotik.executeCommand('/ppp/secret/print', {
                '.proplist': '.id,name,comment'
            });
            
            const testSecret = secrets.find(s => s.name === 'M_DonGato');
            if (testSecret) {
                console.log(`${colors.yellow}Probando cambio de comentario...${colors.reset}`);
                const result = await mikrotik.executeCommand('/ppp/secret/set', {
                    '.id': testSecret['.id'],
                    'comment': 'Test comment ' + new Date().toISOString()
                });
                console.log(`${colors.green}✅ Cambio de comentario: OK${colors.reset}`);
                console.log(`   Resultado: ${JSON.stringify(result)}`);
            }
        } catch (error) {
            console.log(`${colors.red}❌ Error escritura: ${error.message}${colors.reset}`);
        }
        console.log('');
        
        // 4. Probar diferentes sintaxis para cambio de perfil
        console.log(`${colors.blue}4️⃣ PROBANDO DIFERENTES SINTAXIS:${colors.reset}`);
        
        const username = 'M_DonGato';
        const newProfile = 'CORTE MOROSO';
        
        // Obtener el secreto
        const secrets = await mikrotik.executeCommand('/ppp/secret/print', {
            '.proplist': '.id,name,profile'
        });
        
        const secret = secrets.find(s => s.name === username);
        if (!secret) {
            console.log(`${colors.red}❌ Secreto no encontrado${colors.reset}`);
            return;
        }
        
        console.log(`${colors.cyan}Secreto encontrado:${colors.reset}`);
        console.log(`   • ID: ${secret['.id']}`);
        console.log(`   • Nombre: ${secret.name}`);
        console.log(`   • Perfil actual: ${secret.profile}`);
        console.log('');
        
        // Probar diferentes métodos
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
                params: { '.id': secret['.id'], 'profile': 'CORTE_MOROSO' }
            }
        ];
        
        for (const method of methods) {
            console.log(`${colors.yellow}${method.name}:${colors.reset}`);
            try {
                const result = await mikrotik.executeCommand(method.command, method.params);
                console.log(`${colors.green}✅ Comando ejecutado${colors.reset}`);
                console.log(`   Parámetros: ${JSON.stringify(method.params)}`);
                console.log(`   Resultado: ${JSON.stringify(result)}`);
                
                // Verificar cambio
                await new Promise(resolve => setTimeout(resolve, 1000));
                const check = await mikrotik.executeCommand('/ppp/secret/print', {
                    '.proplist': 'name,profile'
                });
                const updated = check.find(s => s.name === username);
                console.log(`   Perfil después: ${updated?.profile || 'N/A'}`);
                
                if (updated?.profile === newProfile || updated?.profile === 'CORTE_MOROSO') {
                    console.log(`${colors.green}🎉 ¡ÉXITO!${colors.reset}`);
                    break;
                }
                
            } catch (error) {
                console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            }
            console.log('');
        }
        
        // 5. Verificar estado final
        console.log(`${colors.blue}5️⃣ ESTADO FINAL:${colors.reset}`);
        const finalCheck = await mikrotik.executeCommand('/ppp/secret/print', {
            '.proplist': 'name,profile,service,disabled'
        });
        
        const finalSecret = finalCheck.find(s => s.name === username);
        if (finalSecret) {
            console.log(`${colors.cyan}Estado final de ${username}:${colors.reset}`);
            console.log(`   • Perfil: ${finalSecret.profile}`);
            console.log(`   • Servicio: ${finalSecret.service}`);
            console.log(`   • Deshabilitado: ${finalSecret.disabled === 'true' ? 'Sí' : 'No'}`);
        }
        
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    } finally {
        await mikrotik.disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    debugPermissions().catch(error => {
        console.error(`${colors.red}💥 Error fatal: ${error.message}${colors.reset}`);
    });
}

module.exports = { debugPermissions };
