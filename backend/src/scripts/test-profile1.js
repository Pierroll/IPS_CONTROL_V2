/**
 * Script para probar cambio de perfil a profile1
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

async function testProfile1Change() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  PRUEBA DE CAMBIO A PROFILE1                            ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikConnection();
    
    try {
        await mikrotik.connect();
        
        const username = 'M_DonGato';
        const newProfile = 'profile1';
        
        console.log(`${colors.yellow}🎯 Cliente: ${username}${colors.reset}`);
        console.log(`${colors.yellow}🎯 Nuevo perfil: ${newProfile}${colors.reset}\n`);
        
        // 1. Verificar que profile1 existe
        console.log(`${colors.blue}1️⃣ VERIFICANDO PERFILES DISPONIBLES:${colors.reset}`);
        const profiles = await mikrotik.executeCommand('/ppp/profile/print', {
            '.proplist': 'name'
        });
        
        const profileNames = profiles.map(p => p.name);
        console.log(`${colors.cyan}Perfiles disponibles:${colors.reset}`);
        profileNames.forEach((name, index) => {
            const isTarget = name === newProfile;
            const color = isTarget ? colors.green : colors.white;
            console.log(`   ${color}${index + 1}. ${name}${isTarget ? ' ← TARGET' : ''}${colors.reset}`);
        });
        
        if (!profileNames.includes(newProfile)) {
            console.log(`${colors.red}❌ El perfil '${newProfile}' no existe${colors.reset}`);
            return;
        }
        console.log('');
        
        // 2. Obtener información actual del cliente
        console.log(`${colors.blue}2️⃣ INFORMACIÓN ACTUAL:${colors.reset}`);
        const secrets = await mikrotik.executeCommand('/ppp/secret/print', {
            '.proplist': '.id,name,profile,service,disabled'
        });
        
        const secret = secrets.find(s => s.name === username);
        if (!secret) {
            console.log(`${colors.red}❌ Cliente no encontrado${colors.reset}`);
            return;
        }
        
        console.log(`${colors.cyan}Estado actual:${colors.reset}`);
        console.log(`   • ID: ${secret['.id']}`);
        console.log(`   • Nombre: ${secret.name}`);
        console.log(`   • Perfil actual: ${secret.profile}`);
        console.log(`   • Servicio: ${secret.service}`);
        console.log(`   • Deshabilitado: ${secret.disabled === 'true' ? 'Sí' : 'No'}`);
        console.log('');
        
        // 3. Desconectar si está activo
        console.log(`${colors.blue}3️⃣ DESCONECTANDO CLIENTE:${colors.reset}`);
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
            await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
            console.log(`${colors.cyan}ℹ️ Cliente no está activo${colors.reset}`);
        }
        console.log('');
        
        // 4. Cambiar perfil
        console.log(`${colors.blue}4️⃣ CAMBIANDO PERFIL:${colors.reset}`);
        console.log(`${colors.yellow}🔄 Cambiando de '${secret.profile}' a '${newProfile}'${colors.reset}`);
        
        try {
            const result = await mikrotik.executeCommand('/ppp/secret/set', {
                '.id': secret['.id'],
                'profile': newProfile
            });
            console.log(`${colors.green}✅ Comando ejecutado${colors.reset}`);
            console.log(`   Resultado: ${JSON.stringify(result)}`);
        } catch (error) {
            console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            return;
        }
        console.log('');
        
        // 5. Verificar el cambio
        console.log(`${colors.blue}5️⃣ VERIFICANDO CAMBIO:${colors.reset}`);
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
            
            if (updatedSecret.profile === newProfile) {
                console.log(`${colors.green}🎉 ¡CAMBIO EXITOSO!${colors.reset}`);
                console.log(`${colors.green}✅ El perfil se cambió correctamente a '${newProfile}'${colors.reset}`);
            } else {
                console.log(`${colors.red}❌ El perfil no cambió${colors.reset}`);
                console.log(`${colors.yellow}💡 El problema no es específico del perfil 'CORTE MOROSO'${colors.reset}`);
                console.log(`${colors.yellow}💡 Hay un problema general con el cambio de perfiles${colors.reset}`);
            }
        }
        
        // 6. Intentar volver al perfil original
        console.log(`${colors.blue}6️⃣ RESTAURANDO PERFIL ORIGINAL:${colors.reset}`);
        if (updatedSecret?.profile === newProfile) {
            console.log(`${colors.yellow}🔄 Restaurando perfil original: '${secret.profile}'${colors.reset}`);
            
            try {
                await mikrotik.executeCommand('/ppp/secret/set', {
                    '.id': secret['.id'],
                    'profile': secret.profile
                });
                console.log(`${colors.green}✅ Perfil restaurado${colors.reset}`);
            } catch (error) {
                console.log(`${colors.red}❌ Error restaurando: ${error.message}${colors.reset}`);
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
    testProfile1Change().catch(error => {
        console.error(`${colors.red}💥 Error fatal: ${error.message}${colors.reset}`);
    });
}

module.exports = { testProfile1Change };
