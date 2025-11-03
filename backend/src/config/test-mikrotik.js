const RouterOSAPI = require('node-routeros').RouterOSAPI;
const fs = require('fs');

// Cargar configuración
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

async function testMariategui() {
    console.log('\n🚀 PROBANDO CONEXIÓN A MARIATEGUI\n');
    console.log('============================================================');

    const conn = new RouterOSAPI({
        host: config.host,
        user: config.user,
        password: config.password,
        port: config.port,
        timeout: 10
    });

    try {
        // 1. CONECTAR
        console.log('\n🔄 Conectando...');
        await conn.connect();
        console.log('✅ Conexión exitosa!\n');

        // 2. INFORMACIÓN DEL SISTEMA
        console.log('📊 INFORMACIÓN DEL SISTEMA:');
        const identity = await conn.write('/system/identity/print');
        const resource = await conn.write('/system/resource/print');
        
        console.log(`   Nombre: ${identity[0].name}`);
        console.log(`   Uptime: ${resource[0].uptime}`);
        console.log(`   CPU: ${resource[0]['cpu-load']}%`);
        console.log(`   Memoria libre: ${resource[0]['free-memory']}`);
        console.log(`   Versión: ${resource[0].version}`);

        // 3. INTERFACES
        console.log('\n🔌 INTERFACES:');
        const interfaces = await conn.write('/interface/print');
        interfaces.forEach((iface) => {
            const status = iface.running === 'true' ? '● ON ' : '○ OFF';
            console.log(`   ${status} ${iface.name} (${iface.type})`);
        });

        // 4. DIRECCIONES IP
        console.log('\n🌐 DIRECCIONES IP:');
        const addresses = await conn.write('/ip/address/print');
        addresses.forEach((addr) => {
            console.log(`   ${addr.address} → ${addr.interface}`);
        });

        // 5. REGLAS DE FIREWALL (input)
        console.log('\n🛡️  REGLAS DE FIREWALL (chain=input):');
        const firewallRules = await conn.write('/ip/firewall/filter/print', [
            '?chain=input'
        ]);
        
        firewallRules.slice(0, 5).forEach((rule, index) => {
            const port = rule['dst-port'] ? ':' + rule['dst-port'] : '';
            console.log(`   ${index}. ${rule.action} - ${rule.protocol || 'any'}${port}`);
        });
        console.log(`   ... (${firewallRules.length} reglas en total)`);

        // 6. SERVICIOS
        console.log('\n🔧 SERVICIOS:');
        const services = await conn.write('/ip/service/print');
        services.forEach((service) => {
            const status = service.disabled === 'true' ? '○ OFF' : '● ON ';
            console.log(`   ${status} ${service.name.padEnd(10)} → Puerto ${service.port}`);
        });

        // 7. USUARIOS PPPOE CONECTADOS
        console.log('\n👥 USUARIOS PPPOE CONECTADOS:');
        const pppoeActive = await conn.write('/ppp/active/print');
        console.log(`   Total: ${pppoeActive.length} usuarios activos`);
        pppoeActive.slice(0, 5).forEach((user) => {
            console.log(`   - ${user.name} (${user.address})`);
        });
        if (pppoeActive.length > 5) {
            console.log(`   ... y ${pppoeActive.length - 5} más`);
        }

        // 8. RUTAS
        console.log('\n🗺️  RUTAS:');
        const routes = await conn.write('/ip/route/print');
        routes.slice(0, 3).forEach((route) => {
            console.log(`   ${route['dst-address']} → ${route.gateway || 'local'}`);
        });

        // 9. INFORMACIÓN ADICIONAL
        console.log('\n📈 ESTADÍSTICAS:');
        console.log(`   Total interfaces: ${interfaces.length}`);
        console.log(`   Total IPs: ${addresses.length}`);
        console.log(`   Total reglas firewall: ${firewallRules.length}`);
        console.log(`   Usuarios PPPoE activos: ${pppoeActive.length}`);

        // DESCONECTAR
        conn.close();
        console.log('\n✅ Prueba completada exitosamente');
        console.log('============================================================\n');

    } catch (error) {
        console.log('\n❌ ERROR:', error.message);
        console.log('\nDetalles del error:');
        console.error(error);
        process.exit(1);
    }
}

// Ejecutar
testMariategui();