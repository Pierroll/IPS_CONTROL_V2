const prisma = require('../models/prismaClient');
const { RouterOSAPI } = require('node-routeros');
const crypto = require('crypto');

class RouterService {
  encryptPassword(password) {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return { password: encrypted, iv: iv.toString('hex'), authTag };
  }

  decryptPassword(encrypted, ivStr, authTagStr) {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = Buffer.from(ivStr, 'hex');
    const authTag = Buffer.from(authTagStr, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    let dec = decipher.update(encrypted, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
  }

  async generateDeviceCode() {
    const count = await prisma.networkDevice.count({ 
      where: { deviceType: 'MIKROTIK_ROUTER' } 
    });
    return `MKT-${String(count + 1).padStart(4, '0')}`;
  }

  async createRouter(data) {
    console.log('🔧 RouterService.createRouter - data recibida:', data);
    
    // ✅ VALIDAR que createdBy existe
    if (!data.createdBy) {
      console.error('❌ createdBy is required');
      throw new Error('createdBy is required');
    }

    console.log('🔧 Encriptando contraseña...');
    const { password, iv, authTag } = this.encryptPassword(data.password);
    console.log('✅ Contraseña encriptada exitosamente');
    
    console.log('🔧 Creando dispositivo en la base de datos...');
    const device = await prisma.networkDevice.create({
      data: {
        code: await this.generateDeviceCode(),
        name: data.name,
        deviceType: data.deviceType || 'MIKROTIK_ROUTER',
        model: data.model || null,
        ipAddress: data.ipAddress,
        apiPort: data.apiPort,
        connectionType: 'HTTP',  // ✅ CAMBIO: 'API' no existe, usar 'HTTP' o 'HTTPS'
        useTls: data.useTls || false,
        location: data.location || null,
        district: data.district,
        province: data.province || 'Huánuco',
        department: data.department || 'Huánuco',
        status: 'ACTIVE',
        monitoringEnabled: true,
        alertsEnabled: true,
        creator: {
          connect: {
            id: data.createdBy
          }
        },
        credentials: {
          create: {
            type: 'ROS_API',
            username: data.username,
            password,
            iv,
            authTag,
            algorithm: 'aes-256-gcm',
          }
        }
      },
      include: { 
        credentials: true,
        creator: true  // ✅ Incluir información del usuario creador
      }
    });

    console.log('✅ Dispositivo creado exitosamente:', device);
    return device;
  }

  async getRouters(filters = {}) {
    return prisma.networkDevice.findMany({
      where: { 
        deviceType: 'MIKROTIK_ROUTER', 
        deletedAt: null, 
        ...filters 
      },
      include: { 
        _count: { select: { pppoeAccounts: true } },
        credentials: { where: { type: 'ROS_API' } },
        creator: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getRouterById(id) {
    return prisma.networkDevice.findUnique({ 
      where: { id }, 
      include: { 
        credentials: true,
        creator: { select: { id: true, name: true, email: true } },
        pppoeAccounts: { where: { active: true } },
        queueRules: { where: { active: true } },
        routerLogs: { take: 50, orderBy: { createdAt: 'desc' } }
      } 
    });
  }

  async updateRouter(id, data) {
    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.ipAddress) updateData.ipAddress = data.ipAddress;
    if (data.apiPort) updateData.apiPort = data.apiPort;
    if (data.useTls !== undefined) updateData.useTls = data.useTls;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.district) updateData.district = data.district;
    if (data.province !== undefined) updateData.province = data.province;
    if (data.department !== undefined) updateData.department = data.department;
    if (data.status) updateData.status = data.status;

    const device = await prisma.networkDevice.update({
      where: { id },
      data: updateData,
      include: { 
        credentials: true,
        creator: { select: { id: true, name: true, email: true } }
      }
    });

    // ✅ ACTUALIZAR CONTRASEÑA SI SE PROPORCIONA
    if (data.password) {
      const { password, iv, authTag } = this.encryptPassword(data.password);
      await prisma.deviceCredential.updateMany({
        where: { deviceId: id, type: 'ROS_API' },
        data: { password, iv, authTag },
      });
    }

    return device;
  }

  async deleteRouter(id) {
    return prisma.networkDevice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async testConnection(id) {
    const device = await this.getRouterById(id);
    if (!device) throw new Error('Device not found');

    const cred = device.credentials.find(c => c.type === 'ROS_API');
    if (!cred) throw new Error('No credentials found');

    const password = this.decryptPassword(cred.password, cred.iv, cred.authTag);

    const conn = new RouterOSAPI({
      host: device.ipAddress,
      port: device.apiPort,
      user: cred.username,
      password,
      tls: device.useTls ? { rejectUnauthorized: false } : undefined,
    });

    try {
      await conn.connect();
      const identity = await conn.write('/system/identity/print');
      const resources = await conn.write('/system/resource/print');
      conn.close();
      
      const data = resources[0];
      const cpuLoad = parseFloat(data['cpu-load'] || 0);
      const totalMem = parseInt(data['total-memory'] || 1);
      const freeMem = parseInt(data['free-memory'] || 0);
      const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

      await prisma.networkDevice.update({
        where: { id },
        data: { 
          status: 'ACTIVE', 
          lastSeen: new Date(), 
          cpuLoad, 
          memoryUsage, 
          uptime: this.parseUptime(data.uptime), 
          firmware: data.version 
        },
      });

      await prisma.routerLog.create({
        data: { 
          deviceId: id, 
          action: 'test_connection', 
          success: true, 
          message: 'Connection successful' 
        },
      });

      return { 
        success: true, 
        data: { 
          name: identity[0]?.name || data['board-name'] || device.name,
          uptime: data.uptime, 
          cpu: cpuLoad.toFixed(1), 
          memory: memoryUsage.toFixed(2), 
          version: data.version,
          boardName: data['board-name'],
          totalMemory: totalMem,
          freeMemory: freeMem
        } 
      };
    } catch (error) {
      console.error('❌ Test connection error:', error.message);
      
      await prisma.networkDevice.update({ 
        where: { id }, 
        data: { status: 'FAILED', lastSeen: new Date() } 
      });
      
      await prisma.routerLog.create({
        data: { 
          deviceId: id, 
          action: 'test_connection', 
          success: false, 
          message: error.message 
        },
      });
      
      return { success: false, error: error.message };
    }
  }

  parseUptime(uptime) {
    if (!uptime) return 0;
    let seconds = 0;
    const parts = uptime.match(/(\d+[wdhms])/g) || [];
    parts.forEach(part => {
      const num = parseInt(part);
      if (part.endsWith('w')) seconds += num * 604800;
      else if (part.endsWith('d')) seconds += num * 86400;
      else if (part.endsWith('h')) seconds += num * 3600;
      else if (part.endsWith('m')) seconds += num * 60;
      else if (part.endsWith('s')) seconds += num;
    });
    return seconds;
  }
}

module.exports = new RouterService();