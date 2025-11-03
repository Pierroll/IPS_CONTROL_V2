/**
 * Script para probar diferentes métodos de cambio de perfil
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

async function testProfileChange() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  PRUEBA DE CAMBIO DE PERFIL                              ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikConnection();
    
    try {
        await mikrotik.connect();
        
        const username = 'M_DonGato';
        const newProfile = 'CORTE MOROSO';
        
        console.log(`${colors.yellow}🎯 Probando cambio de perfil para: ${username}${colors.reset}`);
        console.log(`${colors.yellow}🎯 Nuevo perfil: ${newProfile}${colors.reset}\n`);
        
        // 1. Obtener información actual
        console.log(`${colors.blue}1️⃣ INFORMACIÓN ACTUAL:${colors.reset}`);
        const secrets = await mikrotik.executeCommand('/ppp/secret/print', {
            '.proplist': '.id,name,profile,service,disabled'
        });
        
        const currentSecret = secrets.find(s => s.name === username);
        if (!currentSecret) {
            console.log(`${colors.red}❌ Cliente no encontrado${colors.reset}`);
            return;
        }
        
        console.log(`${colors.cyan}Secreto actual:${colors.reset}`);
        console.log(`   • ID: ${currentSecret['.id']}`);
        console.log(`   • Nombre: ${currentSecret.name}`);
        console.log(`   • Perfil: ${currentSecret.profile}`);
        console.log(`   • Servicio: ${currentSecret.service}`);
        console.log(`   • Deshabilitado: ${currentSecret.disabled === 'true' ? 'Sí' : 'No'}`);
        console.log('');
        
        // 2. Desconectar si está activo
        console.log(`${colors.blue}2️⃣ DESCONECTANDO CLIENTE:${colors.reset}`);
        const activeUsers = await mikrotik.executeCommand('/ppp/active/print', {
            '.proplist': '.id,name,address'
        });
        
        const activeUser = activeUsers.find(u => u.name === username);
        if (activeUser) {
            console.log(`${colors.yellow}📴 Cliente activo encontrado, desconectando...${colors.reset}`);
            console.log(`   • ID activo: ${activeUser['.id']}`);
            console.log(`   • IP: ${activeUser.address}`);
            
            await mikrotik.executeCommand('/ppp/active/remove', {
                '.id': activeUser['.id']
            });
            console.log(`${colors.green}✅ Cliente desconectado${colors.reset}`);
            
            // Esperar
            await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
            console.log(`${colors.cyan}ℹ️ Cliente no está activo${colors.reset}`);
        }
        console.log('');
        
        // 3. Intentar diferentes métodos de cambio
        console.log(`${colors.blue}3️⃣ MÉTODO 1: Usando .id del secreto:${colors.reset}`);
        try {
            const result1 = await mikrotik.executeCommand('/ppp/secret/set', {
                '.id': currentSecret['.id'],
                'profile': newProfile
            });
            console.log(`${colors.green}✅ Comando ejecutado${colors.reset}`);
            console.log(`   Resultado: ${JSON.stringify(result1)}`);
        } catch (error) {
            console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
        }
        console.log('');
        
        // 4. Verificar el cambio
        console.log(`${colors.blue}4️⃣ VERIFICANDO CAMBIO:${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const updatedSecrets = await mikrotik.executeCommand('/ppp/secret/print', {
            '.proplist': '.id,name,profile'
        });
        
        const updatedSecret = updatedSecrets.find(s => s.name === username);
        if (updatedSecret) {
            console.log(`${colors.cyan}Secreto actualizado:${colors.reset}`);
            console.log(`   • ID: ${updatedSecret['.id']}`);
            console.log(`   • Nombre: ${updatedSecret.name}`);
            console.log(`   • Perfil: ${updatedSecret.profile}`);
            
            if (updatedSecret.profile === newProfile) {
                console.log(`${colors.green}✅ ¡Cambio exitoso!${colors.reset}`);
            } else {
                console.log(`${colors.red}❌ El perfil no cambió${colors.reset}`);
                console.log(`${colors.yellow}💡 Intentando método alternativo...${colors.reset}`);
                
                // Método alternativo: usar numbers en lugar de .id
                console.log(`${colors.blue}5️⃣ MÉTODO 2: Usando numbers:${colors.reset}`);
                try {
                    const result2 = await mikrotik.executeCommand('/ppp/secret/set', {
                        'numbers': username,
                        'profile': newProfile
                    });
                    console.log(`${colors.green}✅ Comando ejecutado${colors.reset}`);
                    console.log(`   Resultado: ${JSON.stringify(result2)}`);
                    
                    // Verificar nuevamente
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    const finalSecrets = await mikrotik.executeCommand('/ppp/secret/print', {
                        '.proplist': 'name,profile'
                    });
                    
                    const finalSecret = finalSecrets.find(s => s.name === username);
                    if (finalSecret && finalSecret.profile === newProfile) {
                        console.log(`${colors.green}✅ ¡Cambio exitoso con método alternativo!${colors.reset}`);
                    } else {
                        console.log(`${colors.red}❌ Aún no funciona${colors.reset}`);
                    }
                    
                } catch (error) {
                    console.log(`${colors.red}❌ Error método 2: ${error.message}${colors.reset}`);
                }
            }
        }
        
    } catch (error) {
        console.error(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
    } finally {
        await mikrotik.disconnect();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    testProfileChange().catch(error => {
        console.error(`${colors.red}💥 Error fatal: ${error.message}${colors.reset}`);
    });
}

module.exports = { testProfileChange };
