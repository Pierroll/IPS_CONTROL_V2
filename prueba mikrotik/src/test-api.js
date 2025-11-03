const { RouterOSAPI } = require('node-routeros');

async function testConnection() {
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
        console.log('Â¡Conectado exitosamente!');
        
        // Probar un comando simple
        const result = await conn.write('/system/identity/print');
        console.log('Resultado:', result);
        
        await conn.close();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testConnection();
