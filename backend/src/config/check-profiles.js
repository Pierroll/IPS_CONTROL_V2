const RouterOSAPI = require('node-routeros').RouterOSAPI;
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

async function checkProfiles() {
    console.log('\n🔍 ANALIZANDO ESTRUCTURA DE PERFILES PPPoE\n');
    console.log('='.repeat(70));

    const conn = new RouterOSAPI({
        host: config.host,
        user: config.user,
        password: config.password,
        port: config.port,
        timeout: 10
    });

    try {
        await conn.connect();
        console.log('✅ Conectado\n');

        // 1. LISTAR PERFILES DISPONIBLES
        console.log('📋 PERFILES DISPONIBLES:');
        console.log('-'.repeat(70));
        const profiles = await conn.write('/ppp/profile/print');
        
        profiles.forEach((profile, index) => {
            console.log(`\n${index + 1}. Perfil: ${profile.name}`);
            console.log(`   Rate Limit: ${profile['rate-limit'] || 'Sin límite'}`);
            console.log(`   Local Address: ${profile['local-address'] || 'N/A'}`);
            console.log(`   Remote Address: ${profile['remote-address'] || 'N/A'}`);
            console.log(`   Session Timeout: ${profile['session-timeout'] || 'Sin timeout'}`);
        });

        // 2. LISTAR USUARIOS (SECRETS)
        console.log('\n\n👥 USUARIOS PPPoE (Secrets):');
        console.log('-'.repeat(70));
        const secrets = await conn.write('/ppp/secret/print');
        
        // Agrupar por perfil
        const usersByProfile = {};
        secrets.forEach(secret => {
            const profile = secret.profile || 'default';
            if (!usersByProfile[profile]) {
                usersByProfile[profile] = [];
            }
            usersByProfile[profile].push(secret);
        });

        // Mostrar agrupados
        for (const [profileName, users] of Object.entries(usersByProfile)) {
            console.log(`\n📦 Perfil: ${profileName} (${users.length} usuarios)`);
            users.forEach(user => {
                console.log(`   - ${user.name} (${user.service})`);
            });
        }

        // 3. USUARIOS ACTIVOS Y SUS PERFILES
        console.log('\n\n🟢 USUARIOS CONECTADOS ACTUALMENTE:');
        console.log('-'.repeat(70));
        const activeUsers = await conn.write('/ppp/active/print');
        
        activeUsers.forEach(user => {
            // Buscar el secret correspondiente
            const secret = secrets.find(s => s.name === user.name);
            const profile = secret ? secret.profile : 'N/A';
            
            console.log(`\n👤 ${user.name}`);
            console.log(`   IP: ${user.address}`);
            console.log(`   Perfil: ${profile}`);
            console.log(`   Uptime: ${user.uptime}`);
            console.log(`   Caller ID: ${user['caller-id'] || 'N/A'}`);
        });

        // 4. QUEUES (Control de ancho de banda)
        console.log('\n\n🚦 QUEUES (Control de Velocidad):');
        console.log('-'.repeat(70));
        const queues = await conn.write('/queue/simple/print');
        
        if (queues.length === 0) {
            console.log('   ⚠️  No hay queues configuradas (velocidad por perfil)');
        } else {
            queues.forEach(queue => {
                console.log(`\n📊 ${queue.name}`);
                console.log(`   Target: ${queue.target}`);
                console.log(`   Max Limit: ${queue['max-limit']}`);
                console.log(`   Bytes: ↓${queue['bytes'][0]} ↑${queue['bytes'][1]}`);
            });
        }

        // 5. RESUMEN
        console.log('\n\n📈 RESUMEN:');
        console.log('-'.repeat(70));
        console.log(`Total perfiles: ${profiles.length}`);
        console.log(`Total usuarios (secrets): ${secrets.length}`);
        console.log(`Usuarios conectados: ${activeUsers.length}`);
        console.log(`Queues activas: ${queues.length}`);

        conn.close();
        console.log('\n✅ Análisis completado');
        console.log('='.repeat(70) + '\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkProfiles();