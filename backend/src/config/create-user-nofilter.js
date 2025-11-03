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

    const usuario = 'cliente009';
    const password = 'pass123456';
    const perfil = 'PLAN. S/60.00';

    try {
        console.log('🔌 Conectando...');
        await conn.connect();
        console.log('✅ Conectado\n');

        // Obtener TODOS los usuarios (sin filtro)
        console.log('🔍 Obteniendo usuarios...');
        const allUsers = await conn.write('/ppp/secret/print');
        const existe = allUsers.find(u => u.name === usuario);

        if (existe) {
            console.log(`❌ Usuario "${usuario}" ya existe`);
            conn.close();
            return;
        }
        console.log('✅ Disponible\n');

        // Crear (ignorar error !empty si ocurre)
        console.log('🆕 Creando usuario...');
        try {
            await conn.write('/ppp/secret/add', [
                `=name=${usuario}`,
                `=password=${password}`,
                `=profile=${perfil}`,
                '=service=pppoe'
            ]);
        } catch (err) {
            // Ignorar solo si es !empty
            if (!err.message || !err.message.includes('!empty')) {
                throw err;
            }
        }

        // Verificar
        await new Promise(r => setTimeout(r, 1000));
        const users = await conn.write('/ppp/secret/print');
        const creado = users.find(u => u.name === usuario);

        if (creado) {
            console.log('\n✅ ¡USUARIO CREADO!');
            console.log('='.repeat(60));
            console.log(`👤 Usuario: ${usuario}`);
            console.log(`🔑 Password: ${password}`);
            console.log(`📦 Perfil: ${perfil}`);
            console.log('='.repeat(60));
        }

        conn.close();
        console.log('\n✅ Cerrado\n');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (conn) conn.close();
    }
}

crearCliente();