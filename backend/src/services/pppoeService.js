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
      const users = await conn.write('/ppp/secret/print', [`?name=${username}`]);

      if (users.length === 0) {
        throw new Error(`Usuario PPPoE '${username}' no encontrado en el router.`);
      }

      const userId = users[0]['.id'];
      await conn.write('/ppp/secret/set', [`=.id=${userId}`, `=profile=${newProfile}`]);

      // Actualizar el perfil en la base de datos también
      await prisma.pppoeAccount.update({
        where: { id: pppoeAccount.id },
        data: { profile: newProfile },
      });

      console.log(`✅ Perfil de ${username} cambiado a '${newProfile}' exitosamente.`);
      return { success: true, message: 'Perfil cambiado exitosamente.' };
    } catch (error) {
      console.error(`❌ Error cambiando el perfil para ${username}:`, error);
      throw new Error(`No se pudo cambiar el perfil en el router para ${username}: ${error.message}`);
    } finally {
      conn.close();
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
}

module.exports = new PPPoEService();
