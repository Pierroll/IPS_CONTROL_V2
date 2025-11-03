const RouterOSAPI = require('node-routeros').RouterOSAPI;
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

async function changeUserProfile(username, newProfile) {
    const conn = new RouterOSAPI({
        host: config.host,
        user: config.user,
        password: config.password,
        port: config.port,
        timeout: 10
    });

    try {
        await conn.connect();
        console.log(`\n🔄 Cambiando perfil de usuario: ${username}`);
        console.log('-'.repeat(50));

        // 1. Buscar el usuario
        const secrets = await conn.write('/ppp/secret/print', [`?name=${username}`]);
        
        if (secrets.length === 0) {
            console.log(`❌ Usuario "${username}" no encontrado`);
            conn.close();
            return;
        }

        const user = secrets[0];
        const oldProfile = user.profile || 'default';
        
        console.log(`📌 Usuario encontrado:`);
        console.log(`   Nombre: ${user.name}`);
        console.log(`   Perfil actual: ${oldProfile}`);
        console.log(`   Service: ${user.service}`);

        // 2. Verificar que el perfil nuevo existe
        const profiles = await conn.write('/ppp/profile/print', [`?name=${newProfile}`]);
        
        if (profiles.length === 0) {
            console.log(`❌ Perfil "${newProfile}" no existe`);
            conn.close();
            return;
        }

        console.log(`\n✅ Perfil destino encontrado: ${newProfile}`);
        console.log(`   Rate Limit: ${profiles[0]['rate-limit'] || 'Sin límite'}`);

        // 3. Cambiar el perfil
        await conn.write('/ppp/secret/set', [
            `=.id=${user['.id']}`,
            `=profile=${newProfile}`
        ]);

        console.log(`\n✅ Perfil cambiado exitosamente!`);
        console.log(`   ${oldProfile} → ${newProfile}`);

        // 4. Si el usuario está conectado, desconectarlo para aplicar cambios
        const activeUsers = await conn.write('/ppp/active/print', [`?name=${username}`]);
        
        if (activeUsers.length > 0) {
            console.log(`\n⚠️  Usuario actualmente conectado`);
            console.log(`   Para aplicar cambios, se debe desconectar y reconectar`);
            console.log(`   ¿Desconectar ahora? (requiere implementación)`);
        }

        conn.close();
        console.log('\n✅ Operación completada\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Uso: node change-profile.js NOMBRE_USUARIO NUEVO_PERFIL
const username = process.argv[2];
const newProfile = process.argv[3];

if (!username || !newProfile) {
    console.log('\n❌ Uso: node change-profile.js NOMBRE_USUARIO NUEVO_PERFIL');
    console.log('\nEjemplo: node change-profile.js AxelMelendez Plan_50Mbps\n');
    process.exit(1);
}

changeUserProfile(username, newProfile);