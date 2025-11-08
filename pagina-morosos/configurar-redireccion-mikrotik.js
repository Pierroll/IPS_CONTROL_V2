/**
 * Script para configurar redirección HTTP al pool de corte moroso en MikroTik
 * 
 * Este script configura:
 * 1. Un pool de direcciones IP para clientes cortados
 * 2. Reglas de firewall para redirigir HTTP/HTTPS a la página de morosos
 * 3. Asignación automática del pool a clientes con perfil de corte
 */

const { RouterOSAPI } = require('node-routeros');

// Configuración - AJUSTA ESTOS VALORES
const MIKROTIK_CONFIG = {
  host: process.env.MIKROTIK_IP || '192.168.1.1', // IP del MikroTik
  user: process.env.MIKROTIK_USER || 'admin',
  password: process.env.MIKROTIK_PASSWORD || '',
  port: process.env.MIKROTIK_PORT || 8728,
  timeout: 10
};

// Configuración del pool de corte
const POOL_CONFIG = {
  name: 'POOL_CORTE_MOROSO',
  ranges: '10.0.0.100-10.0.0.200', // Rango de IPs para clientes cortados
  // O usa: '192.168.100.100-192.168.100.200' según tu red
};

// IP del servidor donde está la página de morosos
const PAGINA_MOROSOS_IP = process.env.PAGINA_MOROSOS_IP || 'localhost';
const PAGINA_MOROSOS_PORT = process.env.PAGINA_MOROSOS_PORT || '3001';

async function configurarRedireccion() {
  const conn = new RouterOSAPI(MIKROTIK_CONFIG);
  
  try {
    console.log('🔌 Conectando al MikroTik...');
    await conn.connect();
    console.log('✅ Conectado al MikroTik\n');

    // 1. Crear pool de direcciones para clientes cortados
    console.log('📋 Paso 1: Creando pool de direcciones...');
    try {
      // Verificar si el pool ya existe
      const existingPools = await conn.write('/ip/pool/print', [`?name=${POOL_CONFIG.name}`]);
      
      if (existingPools.length > 0) {
        console.log(`⚠️  El pool ${POOL_CONFIG.name} ya existe, actualizando...`);
        await conn.write('/ip/pool/set', [
          `=.id=${existingPools[0]['.id']}`,
          `=ranges=${POOL_CONFIG.ranges}`
        ]);
        console.log(`✅ Pool ${POOL_CONFIG.name} actualizado\n`);
      } else {
        await conn.write('/ip/pool/add', [
          `=name=${POOL_CONFIG.name}`,
          `=ranges=${POOL_CONFIG.ranges}`
        ]);
        console.log(`✅ Pool ${POOL_CONFIG.name} creado con rango ${POOL_CONFIG.ranges}\n`);
      }
    } catch (error) {
      console.error('❌ Error creando pool:', error.message);
      throw error;
    }

    // 2. Crear regla de NAT para redirigir HTTP a la página de morosos
    console.log('📋 Paso 2: Configurando redirección HTTP...');
    try {
      // Buscar si ya existe una regla similar
      const existingRules = await conn.write('/ip/firewall/nat/print', [
        `?comment=REDIRECT_MOROSOS`
      ]);

      if (existingRules.length > 0) {
        console.log('⚠️  Regla de redirección ya existe, actualizando...');
        await conn.write('/ip/firewall/nat/set', [
          `=.id=${existingRules[0]['.id']}`,
          `=dst-address=${POOL_CONFIG.ranges.split('-')[0]}-${POOL_CONFIG.ranges.split('-')[1]}`,
          `=dst-port=80`,
          `=protocol=tcp`,
          `=action=dst-nat`,
          `=to-addresses=${PAGINA_MOROSOS_IP}`,
          `=to-ports=${PAGINA_MOROSOS_PORT}`,
          `=comment=REDIRECT_MOROSOS`
        ]);
        console.log('✅ Regla de redirección HTTP actualizada\n');
      } else {
        await conn.write('/ip/firewall/nat/add', [
          `=chain=dstnat`,
          `=dst-address=${POOL_CONFIG.ranges.split('-')[0]}-${POOL_CONFIG.ranges.split('-')[1]}`,
          `=dst-port=80`,
          `=protocol=tcp`,
          `=action=dst-nat`,
          `=to-addresses=${PAGINA_MOROSOS_IP}`,
          `=to-ports=${PAGINA_MOROSOS_PORT}`,
          `=comment=REDIRECT_MOROSOS`
        ]);
        console.log('✅ Regla de redirección HTTP creada\n');
      }
    } catch (error) {
      console.error('❌ Error creando regla de redirección:', error.message);
      throw error;
    }

    // 3. Crear regla para HTTPS (opcional)
    console.log('📋 Paso 3: Configurando redirección HTTPS...');
    try {
      const existingHttpsRules = await conn.write('/ip/firewall/nat/print', [
        `?comment=REDIRECT_MOROSOS_HTTPS`
      ]);

      if (existingHttpsRules.length > 0) {
        console.log('⚠️  Regla HTTPS ya existe, actualizando...');
        await conn.write('/ip/firewall/nat/set', [
          `=.id=${existingHttpsRules[0]['.id']}`,
          `=dst-address=${POOL_CONFIG.ranges.split('-')[0]}-${POOL_CONFIG.ranges.split('-')[1]}`,
          `=dst-port=443`,
          `=protocol=tcp`,
          `=action=dst-nat`,
          `=to-addresses=${PAGINA_MOROSOS_IP}`,
          `=to-ports=${PAGINA_MOROSOS_PORT}`,
          `=comment=REDIRECT_MOROSOS_HTTPS`
        ]);
      } else {
        await conn.write('/ip/firewall/nat/add', [
          `=chain=dstnat`,
          `=dst-address=${POOL_CONFIG.ranges.split('-')[0]}-${POOL_CONFIG.ranges.split('-')[1]}`,
          `=dst-port=443`,
          `=protocol=tcp`,
          `=action=dst-nat`,
          `=to-addresses=${PAGINA_MOROSOS_IP}`,
          `=to-ports=${PAGINA_MOROSOS_PORT}`,
          `=comment=REDIRECT_MOROSOS_HTTPS`
        ]);
      }
      console.log('✅ Regla de redirección HTTPS creada\n');
    } catch (error) {
      console.log('⚠️  Error creando regla HTTPS (puede ser opcional):', error.message);
    }

    // 4. Configurar perfil PPPoE para usar el pool
    console.log('📋 Paso 4: Configurando perfil de corte para usar el pool...');
    try {
      const profiles = await conn.write('/ppp/profile/print', [`?name=CORTE MOROSO`]);
      
      if (profiles.length > 0) {
        console.log('⚠️  Perfil CORTE MOROSO existe, actualizando...');
        await conn.write('/ppp/profile/set', [
          `=.id=${profiles[0]['.id']}`,
          `=local-address=`,
          `=remote-address=${POOL_CONFIG.name}`
        ]);
        console.log(`✅ Perfil CORTE MOROSO configurado para usar pool ${POOL_CONFIG.name}\n`);
      } else {
        console.log('⚠️  Perfil CORTE MOROSO no existe. Créalo manualmente o usa el sistema de corte masivo.\n');
      }
    } catch (error) {
      console.log('⚠️  Error configurando perfil (puede que no exista):', error.message);
    }

    console.log('✅ Configuración completada exitosamente!');
    console.log('\n📝 Resumen:');
    console.log(`   - Pool creado: ${POOL_CONFIG.name} (${POOL_CONFIG.ranges})`);
    console.log(`   - Redirección HTTP: ${PAGINA_MOROSOS_IP}:${PAGINA_MOROSOS_PORT}`);
    console.log(`   - Los clientes con perfil "CORTE MOROSO" serán redirigidos automáticamente\n`);

  } catch (error) {
    console.error('❌ Error en la configuración:', error.message);
    process.exit(1);
  } finally {
    conn.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  configurarRedireccion().catch(console.error);
}

module.exports = { configurarRedireccion, POOL_CONFIG };

