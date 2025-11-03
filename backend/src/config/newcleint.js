const PPPoEAdmin = require('./pppoe-admin'); // Asegúrate que esté en la misma carpeta
const path = require('path');

async function crearNuevoCliente() {
    const admin = new PPPoEAdmin();

    try {
        // ========== CONFIGURACIÓN DEL NUEVO CLIENTE ==========
        const nuevoCliente = {
            usuario: 'cliente001',        // Cambiar por el nombre de usuario
            password: 'password123',      // Cambiar por la contraseña
            perfil: 'PLAN. S/60.00'     // Perfil a asignar (opcional)
        };

        console.log('\n🆕 CREANDO NUEVO CLIENTE PPPoE');
        console.log('='.repeat(50));
        console.log(`Usuario: ${nuevoCliente.usuario}`);
        console.log(`Password: ${nuevoCliente.password}`);
        console.log(`Perfil: ${nuevoCliente.perfil}`);
        console.log('='.repeat(50) + '\n');

        // Crear el usuario
        const resultado = await admin.createUser(
            nuevoCliente.usuario,
            nuevoCliente.password,
            nuevoCliente.perfil
        );

        if (resultado.success) {
            console.log('\n✅ CLIENTE CREADO EXITOSAMENTE');
            console.log('='.repeat(50));
            console.log(`👤 Usuario: ${resultado.username}`);
            console.log(`📦 Perfil: ${resultado.profile}`);
            console.log('='.repeat(50));
            console.log('\n📝 Datos para entregar al cliente:');
            console.log(`   Usuario: ${nuevoCliente.usuario}`);
            console.log(`   Contraseña: ${nuevoCliente.password}`);
            console.log(`   Servicio: PPPoE`);
        }

    } catch (error) {
        console.error('\n❌ ERROR AL CREAR CLIENTE:');
        console.error(error.message);
        
        if (error.message.includes('ya existe')) {
            console.log('\n💡 Sugerencia: Usa otro nombre de usuario');
        }
    }
}

// Ejecutar
crearNuevoCliente();