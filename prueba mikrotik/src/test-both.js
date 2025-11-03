const { RouterOSAPI } = require('node-routeros');

async function testBoth() {
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
        
        // Probar corte
        console.log(`\n=== PROBANDO CORTE ===`);
        console.log(`Cortando usuario ${username} a perfil CORTE MOROSO`);
        await conn.write('/ppp/secret/set', { numbers: username, profile: 'CORTE MOROSO' });
        console.log('Corte exitoso');
        
        // Buscar y remover sesión activa
        const active = await conn.write('/ppp/active/print', { '.proplist': '.id,name' });
        const session = active.find((s) => s.name === username);
        if (session) {
            console.log('Sesión encontrada, removiendo...');
            await conn.write('/ppp/active/remove', { '.id': session['.id'] });
            console.log('Sesión removida');
        } else {
            console.log('No hay sesión activa');
        }
        
        // Esperar un poco
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Probar restauración
        console.log(`\n=== PROBANDO RESTAURACIÓN ===`);
        console.log(`Restaurando usuario ${username} a perfil PLAN_S/. 60.00`);
        await conn.write('/ppp/secret/set', { numbers: username, profile: '"PLAN_S/. 60.00"' });
        console.log('Restauración exitosa');
        
        await conn.close();
        console.log('\nPrueba completada');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testBoth();

