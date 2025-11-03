const { RouterOSAPI } = require('node-routeros');
const prisma = require('../models/prismaClient');

class MikroTikProfileService {
  async getProfilesFromRouter(routerId) {
    // Obtener credenciales del router
    const router = await prisma.networkDevice.findUnique({
      where: { id: routerId },
      include: { credentials: true }
    });

    if (!router) {
      throw new Error('Router no encontrado');
    }

    if (!router.credentials || router.credentials.length === 0) {
      throw new Error('No se encontraron credenciales para el router');
    }

    const credentials = router.credentials[0];
    
    // Desencriptar contraseña
    const decryptedPassword = this.decryptPassword(
      credentials.password,
      credentials.iv,
      credentials.authTag
    );

    // Conectar al MikroTik
    const conn = new RouterOSAPI({
      host: router.ipAddress,
      user: credentials.username,
      password: decryptedPassword,
      port: router.apiPort,
      timeout: 10
    });

    try {
      await conn.connect();
      console.log(`✅ Conectado al router ${router.name}`);

      // Obtener perfiles PPPoE
      const profiles = await conn.write('/ppp/profile/print');
      console.log(`📋 Encontrados ${profiles.length} perfiles en el router`);

      conn.close();
      return profiles;
    } catch (error) {
      console.error('❌ Error conectando al router:', error.message);
      throw new Error(`Error conectando al router: ${error.message}`);
    }
  }

  async getFirstRouterAndProfiles() {
    const firstMikrotikRouter = await prisma.networkDevice.findFirst({
      where: {
        deviceType: 'MIKROTIK_ROUTER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!firstMikrotikRouter) {
      throw new Error('No se encontró ningún router MikroTik activo en la base de datos.');
    }

    console.log(`🔍 Obteniendo perfiles del primer router MikroTik activo: ${firstMikrotikRouter.name} (${firstMikrotikRouter.id})`);
    const profiles = await this.getProfilesFromRouter(firstMikrotikRouter.id);
    return profiles;
  }

  async syncProfilesToDatabase(routerId) {
    try {
      console.log('🔄 Iniciando sincronización de perfiles...');
      
      // Obtener perfiles del router
      const mikrotikProfiles = await this.getProfilesFromRouter(routerId);
      
      const syncedProfiles = [];
      
      for (let i = 0; i < mikrotikProfiles.length; i++) {
        const profile = mikrotikProfiles[i];
        
        // Pequeño delay para evitar conflictos de concurrencia
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        // Verificar si el plan ya existe (usando name y description para identificar perfiles de MikroTik)
        const existingPlan = await prisma.plan.findFirst({
          where: {
            name: profile.name,
            description: {
              contains: 'MikroTik'
            }
          }
        });

        if (existingPlan) {
          // Actualizar plan existente
          const updatedPlan = await prisma.plan.update({
            where: { id: existingPlan.id },
            data: {
              description: `Perfil PPPoE sincronizado de MikroTik: ${profile.name}`,
              monthlyPrice: this.extractPriceFromProfile(profile),
              downloadSpeed: this.extractDownloadSpeed(profile),
              uploadSpeed: this.extractUploadSpeed(profile),
              features: this.extractFeaturesFromProfile(profile),
              updatedAt: new Date()
            }
          });
          syncedProfiles.push(updatedPlan);
          console.log(`✅ Actualizado plan: ${profile.name}`);
        } else {
          // Crear nuevo plan con manejo robusto de código único
          const newPlan = await this.createPlanWithRetry(profile, await this.getSystemUserId());
          syncedProfiles.push(newPlan);
          console.log(`✅ Creado nuevo plan: ${profile.name}`);
        }
      }

      console.log(`🎉 Sincronización completada: ${syncedProfiles.length} perfiles procesados`);
      return syncedProfiles;
    } catch (error) {
      console.error('❌ Error en sincronización:', error.message);
      throw error;
    }
  }

  formatProfileDescription(profile) {
    const parts = [];
    
    if (profile['rate-limit']) {
      parts.push(`Velocidad: ${profile['rate-limit']}`);
    }
    
    if (profile['local-address']) {
      parts.push(`IP Local: ${profile['local-address']}`);
    }
    
    if (profile['remote-address']) {
      parts.push(`IP Remota: ${profile['remote-address']}`);
    }
    
    if (profile['session-timeout']) {
      parts.push(`Timeout: ${profile['session-timeout']}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'Perfil PPPoE del MikroTik';
  }

  extractPriceFromProfile(profile) {
    // Intentar extraer precio del nombre o descripción
    const name = profile.name.toLowerCase();
    
    // Buscar patrones de precio en el nombre
    const priceMatch = name.match(/(\d+)\s*(soles?|s\/\.?|pen)/);
    if (priceMatch) {
      return parseFloat(priceMatch[1]);
    }
    
    // Precios por defecto basados en velocidad
    if (name.includes('basico') || name.includes('basic')) return 25.00;
    if (name.includes('intermedio') || name.includes('medium')) return 45.00;
    if (name.includes('avanzado') || name.includes('premium')) return 75.00;
    if (name.includes('empresarial') || name.includes('business')) return 120.00;
    
    return 35.00; // Precio por defecto
  }

  extractDownloadSpeed(profile) {
    if (profile['rate-limit']) {
      const speeds = profile['rate-limit'].split('/');
      return speeds[0] ? parseFloat(speeds[0]) : null;
    }
    return null;
  }

  extractUploadSpeed(profile) {
    if (profile['rate-limit']) {
      const speeds = profile['rate-limit'].split('/');
      return speeds[1] ? parseFloat(speeds[1]) : null;
    }
    return null;
  }

  extractFeaturesFromProfile(profile) {
    const features = [];
    
    if (profile['rate-limit']) {
      features.push(`Velocidad: ${profile['rate-limit']}`);
    }
    
    if (profile['session-timeout']) {
      features.push(`Timeout de sesión: ${profile['session-timeout']}`);
    }
    
    if (profile['local-address']) {
      features.push(`IP local asignada`);
    }
    
    return features;
  }

  decryptPassword(encrypted, ivStr, authTagStr) {
    const crypto = require('crypto');
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

  async createPlanWithRetry(profile, userId, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Generar un código único manualmente para evitar conflictos
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const manualCode = `MIKROTIK-${timestamp}-${randomSuffix}`;
        
        const newPlan = await prisma.plan.create({
          data: {
            code: manualCode, // Usar código manual en lugar de la secuencia
            name: profile.name,
            description: `Perfil PPPoE sincronizado de MikroTik: ${profile.name}`,
            monthlyPrice: this.extractPriceFromProfile(profile),
            downloadSpeed: this.extractDownloadSpeed(profile),
            uploadSpeed: this.extractUploadSpeed(profile),
            features: this.extractFeaturesFromProfile(profile),
            active: true,
            createdBy: userId
          }
        });
        
        return newPlan;
      } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('code')) {
          console.log(`⚠️ Intento ${attempt}/${maxRetries} falló para ${profile.name}, reintentando...`);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 200 * attempt)); // Delay incremental
            continue;
          }
        }
        throw error;
      }
    }
  }

  async getSystemUserId() {
    // Buscar un usuario admin para usar como creador del sistema
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN',
        active: true
      },
      select: {
        id: true
      }
    });
    
    if (adminUser) {
      return adminUser.id;
    }
    
    // Si no hay admin, usar el primer usuario activo
    const anyUser = await prisma.user.findFirst({
      where: {
        active: true
      },
      select: {
        id: true
      }
    });
    
    return anyUser ? anyUser.id : 'system';
  }

  async getSyncedPlans() {
    return prisma.plan.findMany({
      where: {
        description: {
          contains: 'MikroTik'
        },
        active: true
      },
      orderBy: {
        name: 'asc'
      }
    });
  }
}

module.exports = new MikroTikProfileService();
