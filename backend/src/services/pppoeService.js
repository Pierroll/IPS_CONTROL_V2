const prisma = require('../models/prismaClient');
const { RouterOSAPI } = require('node-routeros');
const routerService = require('./routerService');

class PPPoEService {
  async getRouterConnection(routerId) {
    const routerDevice = await prisma.networkDevice.findUnique({
      where: { id: routerId },
      include: { credentials: true },
    });

    if (!routerDevice) {
      throw new Error('Router no encontrado');
    }
    if (!routerDevice.credentials || routerDevice.credentials.length === 0) {
      throw new Error('Credenciales del router no configuradas');
    }

    const apiCredential = routerDevice.credentials.find(c => c.type === 'ROS_API');
    if (!apiCredential) {
      throw new Error('Credenciales API de RouterOS no encontradas');
    }

    const decryptedPassword = routerService.decryptPassword(
      apiCredential.password,
      apiCredential.iv,
      apiCredential.authTag
    );

    const conn = new RouterOSAPI({
      host: routerDevice.ipAddress,
      user: apiCredential.username,
      password: decryptedPassword,
      port: routerDevice.apiPort,
      timeout: 10,
    });

    return conn;
  }

  async createPPPoEUser(routerId, userData) {
    const { username, password, profile, service, localAddress, remoteAddress } = userData;
    
    console.log(`🔧 Creando usuario PPPoE en router ${routerId}:`, { username, profile });
    
    const conn = await this.getRouterConnection(routerId);
    
    try {
      await conn.connect();
      
      // Obtener TODOS los usuarios (sin filtro)
      const allUsers = await conn.write('/ppp/secret/print');
      const existingUser = allUsers.find(u => u.name === username);

      if (existingUser) {
        console.log(`⚠️ Usuario PPPoE '${username}' ya existe, actualizando configuración...`);
        
        // Actualizar el usuario existente
        const updateConfig = {
          password: password,
          profile: profile || 'default',
          service: service || 'pppoe',
          comment: `Cliente actualizado automáticamente - ${new Date().toISOString()}`,
        };
        
        // Filtrar campos vacíos
        Object.keys(updateConfig).forEach(key => {
          if (updateConfig[key] === '' || updateConfig[key] === null) {
            delete updateConfig[key];
          }
        });
        
        // Construir el comando de actualización correctamente (formato MikroTik)
        const updateParams = ['=.id=' + existingUser['.id']];
        Object.entries(updateConfig).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            updateParams.push(`=${key}=${value}`);
          }
        });
        
        console.log(`🔧 Comando de actualización PPPoE:`, updateParams);
        const updateResult = await conn.write('/ppp/secret/set', updateParams);
        
        console.log(`✅ Usuario PPPoE actualizado exitosamente: ${username}`);
        
        return {
          success: true,
          message: `Usuario PPPoE '${username}' actualizado exitosamente (ya existía)`,
          data: updateResult,
          wasUpdated: true
        };
      }
      
      // Crear el usuario PPPoE
      const userConfig = {
        name: username,
        password: password,
        profile: profile || 'default',
        service: service || 'pppoe',
        comment: `Cliente creado automáticamente - ${new Date().toISOString()}`,
      };
      
      // Agregar campos opcionales solo si tienen valor
      if (localAddress && localAddress.trim() !== '') {
        userConfig.localAddress = localAddress;
      }
      if (remoteAddress && remoteAddress.trim() !== '') {
        userConfig.remoteAddress = remoteAddress;
      }
      
      // Construir el comando de creación correctamente (formato MikroTik)
      const createParams = [];
      Object.entries(userConfig).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          createParams.push(`=${key}=${value}`);
        }
      });
      
      console.log(`🔧 Comando de creación PPPoE:`, createParams);
      try {
        await conn.write('/ppp/secret/add', createParams);
      } catch (err) {
        // Ignorar solo si es !empty
        if (!err.message || !err.message.includes('!empty')) {
          throw err;
        }
      }

      // Verificar
      await new Promise(r => setTimeout(r, 1000));
      const users = await conn.write('/ppp/secret/print');
      const creado = users.find(u => u.name === username);

      if (!creado) {
        throw new Error('No se pudo verificar la creación del usuario en el MikroTik');
      }
      
      console.log(`✅ Usuario PPPoE creado exitosamente: ${username}`);
      
      return {
        success: true,
        message: `Usuario PPPoE '${username}' creado exitosamente`,
        data: creado,
        wasUpdated: false
      };
      
    } catch (error) {
      console.error(`❌ Error creando usuario PPPoE:`, error);
      
      // Si el error es que ya existe, manejarlo de manera más elegante
      if (error.message && error.message.includes('already exists')) {
        console.log(`⚠️ Usuario '${username}' ya existe, intentando actualizar...`);
        return {
          success: true,
          message: `Usuario PPPoE '${username}' ya existía en el router`,
          data: null,
          wasUpdated: true
        };
      }
      
      throw new Error(`Error al crear usuario PPPoE: ${error.message}`);
    } finally {
      conn.close();
    }
  }

  async changeCustomerProfile(username, newProfile) {
    const pppoeAccount = await prisma.pppoeAccount.findFirst({
      where: { username },
      include: { device: true },
    });

    if (!pppoeAccount) {
      throw new Error(`No se encontró una cuenta PPPoE para el usuario ${username}`);
    }

    const routerId = pppoeAccount.deviceId;
    console.log(`🔄 Cambiando perfil para ${username} en router ${routerId} a '${newProfile}'...`);

    const conn = await this.getRouterConnection(routerId);

    try {
      await conn.connect();
      
      // ✅ PASO 1: Verificar si está conectado (guardar info para después)
      console.log(`📴 Verificando si ${username} está conectado...`);
      let activeUsers = [];
      let activeUserId = null;
      try {
        const allActive = await conn.write('/ppp/active/print');
        activeUsers = Array.isArray(allActive) ? allActive.filter(u => u.name === username) : [];
        if (activeUsers.length > 0 && activeUsers[0]['.id']) {
          activeUserId = activeUsers[0]['.id'];
        }
      } catch (activeError) {
        // Si falla, intentar método alternativo
        try {
          const allActive = await conn.write('/ppp/active/print', [`?name=${username}`]);
          activeUsers = Array.isArray(allActive) ? allActive : [];
          if (activeUsers.length > 0 && activeUsers[0]['.id']) {
            activeUserId = activeUsers[0]['.id'];
          }
        } catch (fallbackActiveError) {
          console.log(`⚠️ No se pudo verificar usuarios activos: ${fallbackActiveError.message}`);
        }
      }
      
      // ✅ PASO 2: PRIMERO cambiar el perfil (antes de desconectar)
      console.log(`🔄 Cambiando perfil de ${username} a '${newProfile}'...`);
      
      // Obtener todos los secretos y filtrar localmente para evitar errores con !empty
      let users = [];
      try {
        const allSecrets = await conn.write('/ppp/secret/print');
        users = Array.isArray(allSecrets) ? allSecrets.filter(u => u.name === username) : [];
      } catch (error) {
        // Si falla, intentar con el método original como fallback
        try {
          users = await conn.write('/ppp/secret/print', [`?name=${username}`]);
          if (!Array.isArray(users)) {
            users = [];
          }
        } catch (fallbackError) {
          throw new Error(`Error al obtener secretos del router: ${fallbackError.message}`);
        }
      }

      if (users.length === 0) {
        throw new Error(`Usuario PPPoE '${username}' no encontrado en el router.`);
      }

      // Cambiar el perfil PRIMERO
      const userId = users[0]['.id'];
      const currentProfile = users[0].profile || 'default';
      console.log(`🔄 Cambiando perfil de '${currentProfile}' a '${newProfile}'...`);
      
      await conn.write('/ppp/secret/set', [`=.id=${userId}`, `=profile=${newProfile}`]);
      console.log(`✅ Perfil cambiado exitosamente en el router`);

      // Actualizar el perfil en la base de datos también
      await prisma.pppoeAccount.update({
        where: { id: pppoeAccount.id },
        data: { profile: newProfile },
      });
      console.log(`✅ Perfil actualizado en la base de datos`);

      // ✅ PASO 3: DESPUÉS desconectar para que tome el cambio (si estaba conectado)
      if (activeUserId) {
        console.log(`📴 Cliente ${username} está conectado, desconectando para que tome el nuevo perfil...`);
        try {
          await conn.write('/ppp/active/remove', [`=.id=${activeUserId}`]);
          console.log(`✅ Cliente ${username} desconectado exitosamente. Al reconectarse usará el perfil '${newProfile}'`);
          // Esperar un momento para que se complete la desconexión
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (disconnectError) {
          console.log(`⚠️ Error al desconectar (puede que ya esté desconectado): ${disconnectError.message}`);
          // El perfil ya está cambiado, así que está bien
        }
      } else {
        console.log(`ℹ️ Cliente ${username} no está conectado actualmente. El perfil ya está actualizado.`);
      }

      console.log(`✅ Perfil de ${username} cambiado a '${newProfile}' exitosamente.`);
      return { 
        success: true, 
        message: 'Perfil cambiado exitosamente.',
        wasDisconnected: activeUsers.length > 0
      };
    } catch (error) {
      console.error(`❌ Error cambiando el perfil para ${username}:`, error);
      
      // Manejar errores específicos de RosException
      if (error.errno === 'UNKNOWNREPLY' || error.message?.includes('unknown reply')) {
        throw new Error(`Error de comunicación con el router: respuesta inesperada del MikroTik`);
      }
      
      throw new Error(`No se pudo cambiar el perfil en el router para ${username}: ${error.message}`);
    } finally {
      try {
        conn.close();
      } catch (closeError) {
        console.log(`⚠️ Error al cerrar conexión: ${closeError.message}`);
      }
    }
  }

  async deletePPPoEUser(routerId, username) {
    console.log(`🗑️ Eliminando usuario PPPoE en router ${routerId}: ${username}`);
    
    const conn = await this.getRouterConnection(routerId);
    
    try {
      await conn.connect();
      
      // Buscar el usuario
      const users = await conn.write('/ppp/secret/print');
      const user = users.find(u => u.name === username);

      if (!user) {
        console.warn(`⚠️  Usuario PPPoE '${username}' no encontrado en el router. Se asume como eliminado.`);
        return { success: true, message: `Usuario PPPoE '${username}' no encontrado en el router.` };
      }
      
      // Eliminar el usuario
      try {
        await conn.write('/ppp/secret/remove', ['=.id=' + user['.id']]);
      } catch (err) {
        if (!err.message || !err.message.includes('!empty')) {
          throw err;
        }
      }
      
      console.log(`✅ Usuario PPPoE eliminado exitosamente: ${username}`);
      
      return {
        success: true,
        message: `Usuario PPPoE '${username}' eliminado exitosamente`
      };
      
    } catch (error) {
      console.error(`❌ Error eliminando usuario PPPoE:`, error);
      throw new Error(`Error al eliminar usuario PPPoE: ${error.message}`);
    } finally {
      conn.close();
    }
  }

  async updatePPPoEUser(routerId, username, updateData) {
    console.log(`🔄 Actualizando usuario PPPoE en router ${routerId}: ${username}`);
    
    const conn = await this.getRouterConnection(routerId);
    
    try {
      await conn.connect();
      
      // Buscar el usuario
      const users = await conn.write('/ppp/secret/print', ['?name=' + username]);
      if (users.length === 0) {
        throw new Error(`El usuario PPPoE '${username}' no existe en el router`);
      }
      
      // Actualizar el usuario
      const updateConfig = {
        '.id': users[0]['.id'],
        ...updateData
      };
      
      await conn.write('/ppp/secret/set', updateConfig);
      
      console.log(`✅ Usuario PPPoE actualizado exitosamente: ${username}`);
      
      return {
        success: true,
        message: `Usuario PPPoE '${username}' actualizado exitosamente`
      };
      
    } catch (error) {
      console.error(`❌ Error actualizando usuario PPPoE:`, error);
      throw new Error(`Error al actualizar usuario PPPoE: ${error.message}`);
    } finally {
      conn.close();
    }
  }

  async getPPPoEUsers(routerId) {
    console.log(`📋 Obteniendo usuarios PPPoE del router ${routerId}`);
    
    const conn = await this.getRouterConnection(routerId);
    
    try {
      await conn.connect();
      
      const users = await conn.write('/ppp/secret/print');
      
      console.log(`✅ Encontrados ${users.length} usuarios PPPoE`);
      
      return {
        success: true,
        data: users.map(user => ({
          id: user['.id'],
          name: user.name,
          profile: user.profile,
          service: user.service,
          localAddress: user['local-address'] || '',
          remoteAddress: user['remote-address'] || '',
          comment: user.comment || '',
          disabled: user.disabled === 'true'
        }))
      };
      
    } catch (error) {
      console.error(`❌ Error obteniendo usuarios PPPoE:`, error);
      throw new Error(`Error al obtener usuarios PPPoE: ${error.message}`);
    } finally {
      conn.close();
    }
  }

  async testConnection(routerId) {
    const conn = await this.getRouterConnection(routerId);
    try {
      await conn.connect();
      conn.close();
      return { success: true, message: 'Conexión exitosa al MikroTik' };
    } catch (error) {
      throw new Error(`Error al conectar con MikroTik: ${error.message}`);
    }
  }

  /**
   * Corta el servicio a todos los clientes morosos
   * @param {string} cutProfile - Perfil de corte a aplicar (por defecto 'CORTE MOROSO')
   * @returns {Promise<{total: number, cut: number, failed: number, results: Array}>}
   */
  async cutAllOverdueCustomers(cutProfile = 'CORTE MOROSO') {
    console.log(`🔪 Iniciando corte masivo de clientes morosos con perfil: ${cutProfile}`);
    
    // Obtener todos los clientes con facturas OVERDUE o balance > 0
    const overdueCustomers = await prisma.customer.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        OR: [
          {
            billingAccount: {
              balance: { gt: 0 }
            }
          },
          {
            invoices: {
              some: {
                status: 'OVERDUE',
                dueDate: { lt: new Date() }
              }
            }
          }
        ]
      },
      include: {
        billingAccount: true,
        pppoeAccounts: {
          where: { 
            active: true,
            deletedAt: null
          },
          include: {
            device: true
          }
        }
      }
    });

    console.log(`📊 Encontrados ${overdueCustomers.length} clientes morosos`);

    const results = [];
    let cutCount = 0;
    let failedCount = 0;

    for (const customer of overdueCustomers) {
      if (!customer.pppoeAccounts || customer.pppoeAccounts.length === 0) {
        console.log(`⚠️ Cliente ${customer.name} no tiene cuentas PPPoE activas`);
        results.push({
          customerId: customer.id,
          customerName: customer.name,
          status: 'skipped',
          message: 'No tiene cuentas PPPoE activas'
        });
        continue;
      }

      // Cortar cada cuenta PPPoE del cliente
      for (const pppoeAccount of customer.pppoeAccounts) {
        let conn = null;
        try {
          console.log(`🔪 Cortando servicio a ${customer.name} (${pppoeAccount.username}) en router ${pppoeAccount.device.name}`);
          
          // Usar el método existente changeCustomerProfile que ya maneja estos casos
          try {
            await this.changeCustomerProfile(pppoeAccount.username, cutProfile);
            
            console.log(`✅ Servicio cortado para ${customer.name} (${pppoeAccount.username})`);
            cutCount++;
            
            results.push({
              customerId: customer.id,
              customerName: customer.name,
              username: pppoeAccount.username,
              routerName: pppoeAccount.device.name,
              status: 'success',
              message: `Perfil cambiado a '${cutProfile}'`
            });
          } catch (profileError) {
            // Si falla, intentar método manual con mejor manejo de errores
            console.log(`⚠️ Método automático falló, intentando método manual para ${pppoeAccount.username}`);
            
            conn = await this.getRouterConnection(pppoeAccount.deviceId);
            await conn.connect();
            
            try {
              // Obtener usuarios activos - usar método más seguro
              let activeUsers = [];
              try {
                const allActive = await conn.write('/ppp/active/print');
                activeUsers = Array.isArray(allActive) ? allActive.filter(u => u.name === pppoeAccount.username) : [];
              } catch (activeError) {
                // Si falla, asumir que no hay usuarios activos
                console.log(`⚠️ No se pudo verificar usuarios activos: ${activeError.message}`);
              }
              
              // Desconectar si está activo
              if (activeUsers.length > 0 && activeUsers[0]['.id']) {
                console.log(`📴 Desconectando cliente activo: ${pppoeAccount.username}`);
                try {
                  await conn.write('/ppp/active/remove', [`=.id=${activeUsers[0]['.id']}`]);
                  await new Promise(resolve => setTimeout(resolve, 2000));
                } catch (disconnectError) {
                  console.log(`⚠️ Error al desconectar (puede que ya esté desconectado): ${disconnectError.message}`);
                }
              }

              // Obtener el secreto PPPoE - método más seguro
              let secrets = [];
              try {
                const allSecrets = await conn.write('/ppp/secret/print');
                secrets = Array.isArray(allSecrets) ? allSecrets.filter(s => s.name === pppoeAccount.username) : [];
              } catch (secretError) {
                throw new Error(`Error al obtener secretos del router: ${secretError.message}`);
              }
              
              if (secrets.length === 0) {
                throw new Error(`Usuario PPPoE '${pppoeAccount.username}' no encontrado en el router`);
              }

              const userId = secrets[0]['.id'];
              const currentProfile = secrets[0].profile || 'default';
              
              // Cambiar perfil a corte
              await conn.write('/ppp/secret/set', [`=.id=${userId}`, `=profile=${cutProfile}`]);
              
              // Actualizar en la base de datos
              await prisma.pppoeAccount.update({
                where: { id: pppoeAccount.id },
                data: { profile: cutProfile },
              });

              console.log(`✅ Servicio cortado para ${customer.name} (${pppoeAccount.username})`);
              cutCount++;
              
              results.push({
                customerId: customer.id,
                customerName: customer.name,
                username: pppoeAccount.username,
                routerName: pppoeAccount.device.name,
                status: 'success',
                message: `Perfil cambiado de '${currentProfile}' a '${cutProfile}'`
              });
            } finally {
              if (conn) {
                try {
                  conn.close();
                } catch (closeError) {
                  console.log(`⚠️ Error al cerrar conexión: ${closeError.message}`);
                }
              }
            }
          }
        } catch (error) {
          console.error(`❌ Error cortando servicio a ${customer.name} (${pppoeAccount.username}):`, error.message);
          
          // Cerrar conexión si está abierta
          if (conn) {
            try {
              conn.close();
            } catch (closeError) {
              // Ignorar errores al cerrar
            }
          }
          
          failedCount++;
          
          // Extraer mensaje de error más descriptivo
          let errorMessage = error.message || 'Error desconocido';
          if (error.errno === 'UNKNOWNREPLY' || error.message?.includes('unknown reply')) {
            errorMessage = `Error de comunicación con el router: respuesta inesperada del MikroTik`;
          } else if (error.code === 'ECONNREFUSED') {
            errorMessage = `No se pudo conectar al router ${pppoeAccount.device?.name || 'desconocido'}`;
          }
          
          results.push({
            customerId: customer.id,
            customerName: customer.name,
            username: pppoeAccount.username,
            routerName: pppoeAccount.device?.name || 'Desconocido',
            status: 'failed',
            message: errorMessage
          });
        }
      }
    }

    console.log(`✅ Corte masivo completado: ${cutCount} cortes exitosos, ${failedCount} fallidos`);

    return {
      total: overdueCustomers.length,
      cut: cutCount,
      failed: failedCount,
      results
    };
  }
}

module.exports = new PPPoEService();
