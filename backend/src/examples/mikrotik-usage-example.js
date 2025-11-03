/**
 * Ejemplo de uso de la conexión MikroTik MARIATEGUI
 * Este archivo muestra cómo usar la configuración que funciona
 */

const { MikrotikConnection } = require('../config/mikrotik-config');

async function ejemploUsoBasico() {
    console.log('🚀 Ejemplo de uso básico de MikroTik\n');
    
    const mikrotik = new MikrotikConnection();
    
    try {
        // 1. Conectar
        console.log('1️⃣ Conectando al MikroTik...');
        const connected = await mikrotik.connect();
        
        if (!connected) {
            console.log('❌ No se pudo conectar');
            return;
        }
        
        // 2. Obtener información del sistema
        console.log('\n2️⃣ Obteniendo información del sistema...');
        const systemInfo = await mikrotik.getSystemInfo();
        console.log('📋 Información del sistema:');
        console.log(`   • Identidad: ${systemInfo.identity}`);
        console.log(`   • Versión: ${systemInfo.version}`);
        console.log(`   • Tiempo activo: ${systemInfo.uptime}`);
        
        // 3. Obtener usuarios activos
        console.log('\n3️⃣ Obteniendo usuarios activos...');
        const activeUsers = await mikrotik.getActiveUsers();
        console.log(`📊 Usuarios activos: ${activeUsers.length}`);
        
        if (activeUsers.length > 0) {
            console.log('👥 Primeros 5 usuarios:');
            activeUsers.slice(0, 5).forEach((user, index) => {
                console.log(`   ${index + 1}. ${user.name} - ${user.address} (${user.uptime})`);
            });
        }
        
        // 4. Obtener estadísticas
        console.log('\n4️⃣ Obteniendo estadísticas de red...');
        const stats = await mikrotik.getNetworkStats();
        console.log('📈 Estadísticas:');
        console.log(`   • Conexiones activas: ${stats.activeConnections}`);
        console.log(`   • Clientes DHCP: ${stats.boundLeases}`);
        console.log(`   • Total clientes: ${stats.totalClients}`);
        
        // 5. Obtener perfiles PPPoE
        console.log('\n5️⃣ Obteniendo perfiles PPPoE...');
        const profiles = await mikrotik.getPPPoEProfiles();
        console.log(`🔧 Perfiles disponibles: ${profiles.length}`);
        
        if (profiles.length > 0) {
            console.log('📋 Perfiles:');
            profiles.forEach((profile, index) => {
                console.log(`   ${index + 1}. ${profile.name} - ${profile.localAddress}`);
            });
        }
        
        console.log('\n✅ Ejemplo completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error durante el ejemplo:', error.message);
    } finally {
        // 6. Desconectar
        console.log('\n6️⃣ Desconectando...');
        await mikrotik.disconnect();
    }
}

async function ejemploGestionUsuarios() {
    console.log('\n🔧 Ejemplo de gestión de usuarios\n');
    
    const mikrotik = new MikrotikConnection();
    
    try {
        await mikrotik.connect();
        
        // Obtener usuarios activos
        const activeUsers = await mikrotik.getActiveUsers();
        console.log(`👥 Usuarios activos: ${activeUsers.length}`);
        
        if (activeUsers.length > 0) {
            const firstUser = activeUsers[0];
            console.log(`\n📋 Información del primer usuario:`);
            console.log(`   • Nombre: ${firstUser.name}`);
            console.log(`   • IP: ${firstUser.address}`);
            console.log(`   • Tiempo activo: ${firstUser.uptime}`);
            console.log(`   • Bytes recibidos: ${firstUser.bytesIn}`);
            console.log(`   • Bytes enviados: ${firstUser.bytesOut}`);
            
            // NOTA: No desconectamos al usuario en este ejemplo
            // Para desconectar usar: await mikrotik.disconnectUser(firstUser.name);
            console.log('\n💡 Para desconectar este usuario, usar:');
            console.log(`   await mikrotik.disconnectUser('${firstUser.name}');`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mikrotik.disconnect();
    }
}

async function ejemploComandoPersonalizado() {
    console.log('\n⚙️ Ejemplo de comando personalizado\n');
    
    const mikrotik = new MikrotikConnection();
    
    try {
        await mikrotik.connect();
        
        // Ejecutar comando personalizado
        console.log('🔍 Ejecutando comando personalizado...');
        const result = await mikrotik.executeCommand('/system/identity/print');
        
        console.log('📋 Resultado:');
        console.log(JSON.stringify(result, null, 2));
        
        // Otro comando - obtener interfaces
        console.log('\n🔍 Obteniendo interfaces de red...');
        const interfaces = await mikrotik.executeCommand('/interface/print', {
            '.proplist': 'name,type,mtu,running'
        });
        
        console.log('🌐 Interfaces:');
        interfaces.forEach((iface, index) => {
            console.log(`   ${index + 1}. ${iface.name} (${iface.type}) - ${iface.running ? 'Activa' : 'Inactiva'}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mikrotik.disconnect();
    }
}

// Función principal
async function main() {
    console.log('🎯 EJEMPLOS DE USO MIKROTIK MARIATEGUI');
    console.log('=====================================\n');
    
    try {
        await ejemploUsoBasico();
        await ejemploGestionUsuarios();
        await ejemploComandoPersonalizado();
        
        console.log('\n🎉 Todos los ejemplos completados');
        
    } catch (error) {
        console.error('💥 Error general:', error.message);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    main();
}

module.exports = {
    ejemploUsoBasico,
    ejemploGestionUsuarios,
    ejemploComandoPersonalizado
};
