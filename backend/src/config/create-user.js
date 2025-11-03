const RouterOSAPI = require('node-routeros').RouterOSAPI;
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

async function crearCliente() {
    const conn = new RouterOSAPI({
        host: config.host,
        user: config.user,
        password: config.password,
        port: config.port,
        timeout: 10
    });

    // ========== CONFIGURACIÓN ==========
    const usuario = 'cliente006';
    const password = 'pass123456';
    const perfil = 'PLAN. S/60.00';

    try {
        console.log('🔌 Conectando al MikroTik...');
        await conn.connect();
        console.log('✅ Conectado\n');

        // Verificar si el usuario existe
        console.log(`🔍 Verificando si "${usuario}" existe...`);
        const existing = await conn.write('/ppp/secret/print', [
            `?name=${usuario}`
        ]);

        if (existing.length > 0) {
            console.log(`❌ El usuario "${usuario}" ya existe`);
            conn.close();
            return;
        }

        console.log('✅ Usuario disponible\n');

        // Verificar que el perfil existe
        console.log(`🔍 Verificando perfil "${perfil}"...`);
        const profiles = await conn.write('/ppp/profile/print', [
            `?name=${perfil}`
        ]);

        if (profiles.length === 0) {
            console.log(`❌ El perfil "${perfil}" no existe\n`);
            console.log('📋 Perfiles disponibles:');
            const allProfiles = await conn.write('/ppp/profile/print');
            allProfiles.forEach(p => console.log(`   - ${p.name}`));
            conn.close();
            return;
        }

        console.log('✅ Perfil encontrado\n');

        // Crear el usuario
        console.log('🆕 Creando usuario...');
        await conn.write('/ppp/secret/add', [
            `=name=${usuario}`,
            `=password=${password}`,
            `=profile=${perfil}`,
            '=service=pppoe'
        ]);

        console.log('✅ Comando de creación ejecutado\n');

        // Esperar un momento
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verificar que se creó
        console.log('🔍 Verificando creación...');
        const verification = await conn.write('/ppp/secret/print', [
            `?name=${usuario}`
        ]);

        if (verification.length > 0) {
            console.log('\n✅ ¡USUARIO CREADO EXITOSAMENTE!');
            console.log('='.repeat(60));
            console.log(`👤 Usuario: ${usuario}`);
            console.log(`🔑 Contraseña: ${password}`);
            console.log(`📦 Perfil: ${perfil}`);
            console.log(`🌐 Servicio: PPPoE`);
            console.log(`🆔 ID MikroTik: ${verification[0]['.id']}`);
            console.log('='.repeat(60));
            console.log('\n📋 Datos verificados en el router');
        } else {
            console.log('\n⚠️  No se pudo verificar la creación del usuario');
            console.log('   Verifica manualmente en Winbox: PPP > Secrets');
        }

        conn.close();
        console.log('\n✅ Conexión cerrada\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\nDetalles técnicos:');
        console.error(error);
        if (conn) conn.close();
        process.exit(1);
    }
}

crearCliente();