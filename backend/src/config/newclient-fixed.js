const RouterOSAPI = require('node-routeros').RouterOSAPI;
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Wrapper para manejar respuestas vacías
async function safeWrite(conn, command, params = []) {
    try {
        const result = await conn.write(command, params);
        return result || [];
    } catch (error) {
        // Si es error de respuesta vacía, devolver array vacío
        if (error.errno === 'UNKNOWNREPLY' || 
            (error.message && error.message.includes('!empty'))) {
            return [];
        }
        throw error;
    }
}

async function crearCliente() {
    const conn = new RouterOSAPI({
        host: config.host,
        user: config.user,
        password: config.password,
        port: config.port,
        timeout: 10
    });

    // ========== CONFIGURACIÓN ==========
    const usuario = 'cliente002';  // Cambia el número si quieres
    const password = 'pass123456';
    const perfil = 'PLAN. S/60.00';

    try {
        console.log('🔌 Conectando al MikroTik...');
        await conn.connect();
        console.log('✅ Conectado\n');

        // Verificar si existe
        console.log(`🔍 Verificando si "${usuario}" existe...`);
        const existing = await safeWrite(conn, '/ppp/secret/print', [
            `?name=${usuario}`
        ]);

        if (existing.length > 0) {
            console.log(`❌ El usuario "${usuario}" YA EXISTE`);
            conn.close();
            return;
        }

        console.log('✅ Usuario disponible\n');

        // Verificar perfil
        console.log(`🔍 Verificando perfil "${perfil}"...`);
        const profiles = await safeWrite(conn, '/ppp/profile/print', [
            `?name=${perfil}`
        ]);

        if (profiles.length === 0) {
            console.log(`❌ Perfil "${perfil}" NO EXISTE`);
            console.log('\n📋 Perfiles disponibles:');
            const allProfiles = await safeWrite(conn, '/ppp/profile/print');
            allProfiles.forEach(p => console.log(`   - ${p.name}`));
            conn.close();
            return;
        }

        console.log('✅ Perfil encontrado\n');

        // CREAR USUARIO
        console.log('🆕 Creando usuario...');
        
        await safeWrite(conn, '/ppp/secret/add', [
            `=name=${usuario}`,
            `=password=${password}`,
            `=profile=${perfil}`,
            '=service=pppoe'
        ]);

        // Esperar
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verificar
        console.log('🔍 Verificando creación...\n');
        const verification = await safeWrite(conn, '/ppp/secret/print', [
            `?name=${usuario}`
        ]);

        if (verification.length > 0) {
            console.log('✅ ¡USUARIO CREADO EXITOSAMENTE!');
            console.log('='.repeat(60));
            console.log(`👤 Usuario: ${usuario}`);
            console.log(`🔑 Contraseña: ${password}`);
            console.log(`📦 Perfil: ${perfil}`);
            console.log(`🌐 Servicio: PPPoE`);
            console.log(`🆔 ID MikroTik: ${verification[0]['.id']}`);
            console.log('='.repeat(60));
        } else {
            console.log('⚠️  No se pudo verificar (pero puede haberse creado)');
            console.log('   Revisa en Winbox: PPP > Secrets');
        }

        conn.close();
        console.log('\n✅ Conexión cerrada\n');

    } catch (error) {
        console.error('\n❌ ERROR CRÍTICO:');
        console.error(error.message);
        if (conn) conn.close();
        process.exit(1);
    }
}

crearCliente();