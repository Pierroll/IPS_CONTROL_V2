/**
 * Script para forzar el cambio de perfil usando diferentes enfoques
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

async function forceProfileChange() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  CAMBIO FORZADO DE PERFIL                                ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);

    const mikrotik = new MikrotikConnection();
    
    try {
        await mikrotik.connect();
        
        const username = 'M_DonGato';
        const newProfile = 'CORTE MOROSO';
        
        console.log(`${colors.yellow}🎯 Cliente: ${username}${colors.reset}`);
        console.log(`${colors.yellow}🎯 Nuevo perfil: ${newProfile}${colors.reset}\n`);
        
        // 1. Verificar que el perfil existe
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
            console.log(`${colors.yellow}💡 Usando el perfil más cercano...${colors.reset}`);
        }
        console.log('');
        
        // 2. Obtener información del secreto
        console.log(`${colors.blue}2️⃣ INFORMACIÓN DEL SECRETO:${colors.reset}`);
        const secrets = await mikrotik.executeCommand('/ppp/secret/print', {
            '.proplist': '.id,name,profile,service,disabled,local-address,remote-address'
        });
        
        const secret = secrets.find(s => s.name === username);
        if (!secret) {
            console.log(`${colors.red}❌ Secreto no encontrado${colors.reset}`);
            return;
        }
        
        console.log(`${colors.cyan}Secreto actual:${colors.reset}`);
        console.log(`   • ID: ${secret['.id']}`);
        console.log(`   • Nombre: ${secret.name}`);
        console.log(`   • Perfil actual: ${secret.profile}`);
        console.log(`   • Servicio: ${secret.service}`);
        console.log(`   • Deshabilitado: ${secret.disabled === 'true' ? 'Sí' : 'No'}`);
        console.log(`   • IP Local: ${secret['local-address'] || 'N/A'}`);
        console.log(`   • IP Remota: ${secret['remote-address'] || 'N/A'}`);
        console.log('');
        
        // 3. Desconectar cliente si está activo
        console.log(`${colors.blue}3️⃣ DESCONECTANDO CLIENTE:${colors.reset}`);
        const activeUsers = await mikrotik.executeCommand('/ppp/active/print', {
            '.proplist': '.id,name,address'
        });
        
        const activeUser = activeUsers.find(u => u.name === username);
        if (activeUser) {
            console.log(`${colors.yellow}📴 Desconectando cliente activo...${colors.reset}`);
            await mikrotik.executeCommand('/ppp/active/remove', {
                '.id': activeUser['.id']
            });
            console.log(`${colors.green}✅ Cliente desconectado${colors.reset}`);
            await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
            console.log(`${colors.cyan}ℹ️ Cliente no está activo${colors.reset}`);
        }
        console.log('');
        
        // 4. Intentar cambio con diferentes parámetros
        console.log(`${colors.blue}4️⃣ INTENTANDO CAMBIO DE PERFIL:${colors.reset}`);
        
        // Método 1: Usando .id
        console.log(`${colors.yellow}Método 1: Usando .id${colors.reset}`);
        try {
            const result1 = await mikrotik.executeCommand('/ppp/secret/set', {
                '.id': secret['.id'],
                'profile': newProfile
            });
            console.log(`${colors.green}✅ Comando ejecutado${colors.reset}`);
        } catch (error) {
            console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
        }
        
        // Verificar
        await new Promise(resolve => setTimeout(resolve, 2000));
        const check1 = await mikrotik.executeCommand('/ppp/secret/print', {
            '.proplist': 'name,profile'
        });
        const updated1 = check1.find(s => s.name === username);
        console.log(`   Perfil después del método 1: ${updated1?.profile || 'N/A'}`);
        
        if (updated1?.profile !== newProfile) {
            // Método 2: Usando numbers
            console.log(`${colors.yellow}Método 2: Usando numbers${colors.reset}`);
            try {
                const result2 = await mikrotik.executeCommand('/ppp/secret/set', {
                    'numbers': username,
                    'profile': newProfile
                });
                console.log(`${colors.green}✅ Comando ejecutado${colors.reset}`);
            } catch (error) {
                console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
            }
            
            // Verificar
            await new Promise(resolve => setTimeout(resolve, 2000));
            const check2 = await mikrotik.executeCommand('/ppp/secret/print', {
                '.proplist': 'name,profile'
            });
            const updated2 = check2.find(s => s.name === username);
            console.log(`   Perfil después del método 2: ${updated2?.profile || 'N/A'}`);
            
            if (updated2?.profile !== newProfile) {
                // Método 3: Usando where
                console.log(`${colors.yellow}Método 3: Usando where${colors.reset}`);
                try {
                    const result3 = await mikrotik.executeCommand('/ppp/secret/set', {
                        'where': `name="${username}"`,
                        'profile': newProfile
                    });
                    console.log(`${colors.green}✅ Comando ejecutado${colors.reset}`);
                } catch (error) {
                    console.log(`${colors.red}❌ Error: ${error.message}${colors.reset}`);
                }
                
                // Verificar
                await new Promise(resolve => setTimeout(resolve, 2000));
                const check3 = await mikrotik.executeCommand('/ppp/secret/print', {
                    '.proplist': 'name,profile'
                });
                const updated3 = check3.find(s => s.name === username);
                console.log(`   Perfil después del método 3: ${updated3?.profile || 'N/A'}`);
            }
        }
        
        // 5. Verificación final
        console.log(`${colors.blue}5️⃣ VERIFICACIÓN FINAL:${colors.reset}`);
        const finalCheck = await mikrotik.executeCommand('/ppp/secret/print', {
            '.proplist': 'name,profile,service,disabled'
        });
        
        const finalSecret = finalCheck.find(s => s.name === username);
        if (finalSecret) {
            console.log(`${colors.cyan}Estado final:${colors.reset}`);
            console.log(`   • Nombre: ${finalSecret.name}`);
            console.log(`   • Perfil: ${finalSecret.profile}`);
            console.log(`   • Servicio: ${finalSecret.service}`);
            console.log(`   • Deshabilitado: ${finalSecret.disabled === 'true' ? 'Sí' : 'No'}`);
            
            if (finalSecret.profile === newProfile) {
                console.log(`${colors.green}✅ ¡CAMBIO EXITOSO!${colors.reset}`);
            } else {
                console.log(`${colors.red}❌ El perfil no cambió${colors.reset}`);
                console.log(`${colors.yellow}💡 Posibles causas:${colors.reset}`);
                console.log(`   • El perfil '${newProfile}' no existe`);
                console.log(`   • Permisos insuficientes`);
                console.log(`   • Configuración del MikroTik`);
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
    forceProfileChange().catch(error => {
        console.error(`${colors.red}💥 Error fatal: ${error.message}${colors.reset}`);
    });
}

module.exports = { forceProfileChange };
