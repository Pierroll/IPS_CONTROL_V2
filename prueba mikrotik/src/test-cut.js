const { RouterOSAPI } = require('node-routeros');

async function testCut() {
    const conn = new RouterOSAPI({
        host: '45.5.56.186',
        user: 'apiuser',
        password: 'TuPasswordSeguro',
        port: 3582,
        timeout: 10
    });

    try {
        console.log('Conectando...');
        await conn.connect();
        console.log('¡Conectado exitosamente!');
        
        const username = 'M_Lili';
        
        // Verificar estado actual
        console.log('\n=== ESTADO ACTUAL ===');
        const secrets = await conn.write('/ppp/secret/print', { '.proplist': 'name,profile' });
        const user = secrets.find(s => s.name === username);
        console.log(`Usuario ${username} tiene perfil: ${user ? user.profile : 'No encontrado'}`);
        
        // Probar corte
        console.log('\n=== PROBANDO CORTE ===');
        console.log(`Cambiando usuario ${username} a perfil CORTE MOROSO`);
        await conn.write('/ppp/secret/set', { numbers: username, profile: 'CORTE MOROSO' });
        console.log('Comando ejecutado');
        
        // Verificar cambio
        console.log('\n=== VERIFICANDO CAMBIO ===');
        const secretsAfter = await conn.write('/ppp/secret/print', { '.proplist': 'name,profile' });
        const userAfter = secretsAfter.find(s => s.name === username);
        console.log(`Usuario ${username} ahora tiene perfil: ${userAfter ? userAfter.profile : 'No encontrado'}`);
        
        await conn.close();
        console.log('\nPrueba completada');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testCut();

