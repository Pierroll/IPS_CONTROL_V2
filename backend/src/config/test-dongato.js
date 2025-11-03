const PPPoEAdmin = require('./pppoe-admin');

async function testDonGato() {
    const admin = new PPPoEAdmin();

    try {
        console.log('\n🎯 PRUEBA CON M_DonGato\n');
        console.log('='.repeat(50));

        // 1. Ver estado actual
        console.log('\n1️⃣  Estado actual:');
        const user = await admin.getUser('M_DonGato');
        console.log(`   Usuario: ${user.name}`);
        console.log(`   Perfil actual: ${user.profile}`);
        console.log(`   Servicio: ${user.service}`);

        // 2. Upgrade a plan de 100 soles
        console.log('\n2️⃣  Cambiando a PLAN_S/. 100.00...');
        await admin.changeUserProfile('M_DonGato', 'PLAN_S/. 100.00');

        // Esperar 2 segundos
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 3. Ver nuevo estado
        console.log('\n3️⃣  Verificando cambio:');
        const userUpdated = await admin.getUser('M_DonGato');
        console.log(`   Perfil nuevo: ${userUpdated.profile}`);

        // 4. Regresar a plan de 60 soles
        console.log('\n4️⃣  Regresando a PLAN_S/. 60.00...');
        await admin.changeUserProfile('M_DonGato', 'PLAN_S/. 60.00');

        // 5. Cortar (simular moroso)
        console.log('\n5️⃣  Cortando usuario (simulando moroso)...');
        await admin.cutUser('M_DonGato');

        await new Promise(resolve => setTimeout(resolve, 2000));

        // 6. Rehabilitar
        console.log('\n6️⃣  Rehabilitando usuario...');
        await admin.restoreUser('M_DonGato', 'PLAN_S/. 60.00');

        console.log('\n✅ PRUEBA COMPLETADA');
        console.log('='.repeat(50) + '\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

testDonGato();