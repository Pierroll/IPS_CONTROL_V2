const { RouterOSAPI } = require('node-routeros');

async function testRestore() {
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
        
        // Probar restauración
        const username = 'M_Lili';
        const profile = 'PLAN_S/. 60.00';
        
        console.log(`Restaurando usuario ${username} a perfil ${profile}`);
        
        // Cambiar perfil
        await conn.write('/ppp/secret/set', { numbers: username, profile: `"${profile}"` });
        console.log('Perfil cambiado exitosamente');
        
        // Buscar sesión activa
        const active = await conn.write('/ppp/active/print', { '.proplist': '.id,name' });
        console.log('Sesiones activas:', active);
        
        const session = active.find((s) => s.name === username);
        if (session) {
            console.log('Sesión encontrada, removiendo...');
            await conn.write('/ppp/active/remove', { '.id': session['.id'] });
            console.log('Sesión removida exitosamente');
        } else {
            console.log('No hay sesión activa para este usuario');
        }
        
        await conn.close();
        console.log('Prueba completada');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testRestore();

