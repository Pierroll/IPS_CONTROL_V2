const routerService = require('../services/routerService');
const { RouterOSAPI } = require('node-routeros');
const { createRouterSchema, updateRouterSchema } = require('../validations/routerValidation');

class RouterController {
  async create(req, res) {
    try {
      console.log('🔍 DEBUG req.user:', req.user); // ✅ VER QUÉ CONTIENE
      console.log('🔍 DEBUG req.user?.id:', req.user?.id);
      console.log('🔍 DEBUG req.user?.userId:', req.user?.userId);
      console.log('🔍 DEBUG req.body:', req.body);
      
      await createRouterSchema.validateAsync(req.body);
      
      // ✅ INTENTAR MÚLTIPLES CAMPOS
      const userId = req.user?.id || req.user?.userId || req.user?.sub;
      
      if (!userId) {
        console.error('❌ No se pudo obtener userId de req.user:', req.user);
        return res.status(401).json({ 
          success: false, 
          error: 'Usuario no autenticado' 
        });
      }

      req.body.createdBy = userId;
      
      console.log('📝 Creando router con userId:', userId);
      console.log('📝 Payload final:', req.body);
      
      const router = await routerService.createRouter(req.body);
      console.log('✅ Router creado exitosamente:', router);
      res.status(201).json({ success: true, data: router });
    } catch (error) {
      console.error('❌ Error creating router:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.district) filters.district = req.query.district;
      
      const routers = await routerService.getRouters(filters);
      res.json({ success: true, data: routers });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const router = await routerService.getRouterById(req.params.id);
      if (!router) {
        return res.status(404).json({ success: false, error: 'Router no encontrado' });
      }
      res.json({ success: true, data: router });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async update(req, res) {
    try {
      if (updateRouterSchema) {
        await updateRouterSchema.validateAsync(req.body);
      }
      const router = await routerService.updateRouter(req.params.id, req.body);
      if (!router) {
        return res.status(404).json({ success: false, error: 'Router no encontrado' });
      }
      res.json({ success: true, data: router });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const result = await routerService.deleteRouter(req.params.id);
      if (!result) {
        return res.status(404).json({ success: false, error: 'Router no encontrado' });
      }
      res.json({ success: true, message: 'Router eliminado correctamente' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async testConnection(req, res) {
    try {
      const result = await routerService.testConnection(req.params.id);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async testConnectionNew(req, res) {
    try {
      console.log('Request Body:', req.body); // Added for debugging
      const { ipAddress, apiPort, username, password, useTls } = req.body;

      if (!ipAddress || !apiPort || !username || !password) {
        return res.status(400).json({
          success: false,
          error: 'Faltan datos requeridos'
        });
      }

      console.log(`🔌 Conectando a ${ipAddress}:${apiPort}...`);

      const conn = new RouterOSAPI({
        host: ipAddress,
        port: parseInt(apiPort),
        user: username,
        password: password,
        tls: useTls ? { rejectUnauthorized: false } : undefined
      });

      try {
        await conn.connect();
        console.log('✅ Conectado');

        const identity = await conn.write('/system/identity/print');
        const resources = await conn.write('/system/resource/print');

        conn.close();
        console.log('🔌 Cerrado');

        const data = resources[0];
        const cpuLoad = parseFloat(data['cpu-load'] || 0);
        const totalMem = parseInt(data['total-memory'] || 1);
        const freeMem = parseInt(data['free-memory'] || 0);
        const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

        res.json({
          success: true,
          data: {
            name: identity[0]?.name || data['board-name'] || 'MikroTik',
            uptime: data.uptime || 'N/A',
            version: data.version || 'N/A',
            cpu: cpuLoad,
            memory: memoryUsage.toFixed(2),
            boardName: data['board-name'],
            architecture: data['architecture-name']
          }
        });
      } catch (error) {
        if (conn) conn.close();
        throw error;
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      res.status(400).json({
        success: false,
        error: error.message || 'Error al conectar'
      });
    }
  }
  // Agrega este método en routerController.js

async getAllWithMetrics(req, res) {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.district) filters.district = req.query.district;
    
    const routers = await routerService.getRouters(filters);
    
    // Obtener métricas en paralelo para todos los routers ACTIVOS
    const routersWithMetrics = await Promise.all(
      routers.map(async (router) => {
        // Solo intentar conectar si el router está ACTIVE
        if (router.status !== 'ACTIVE') {
          return {
            ...router,
            cpuLoad: router.cpuLoad || 0,
            memoryUsage: router.memoryUsage || 0,
            activeConnections: 0,
            totalCustomers: router._count?.pppoeAccounts || 0,
          };
        }

        try {
          // Intentar obtener métricas en tiempo real
          const metrics = await routerService.getRouterMetrics(router.id);
          return {
            ...router,
            ...metrics,
            totalCustomers: router._count?.pppoeAccounts || 0,
          };
        } catch (error) {
          console.error(`⚠️ No se pudieron obtener métricas de ${router.name}:`, error.message);
          // Devolver datos de la BD si falla la conexión
          return {
            ...router,
            cpuLoad: router.cpuLoad || 0,
            memoryUsage: router.memoryUsage || 0,
            activeConnections: 0,
            totalCustomers: router._count?.pppoeAccounts || 0,
          };
        }
      })
    );
    
    res.json({ success: true, data: routersWithMetrics });
  } catch (error) {
    console.error('Error in getAllWithMetrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
}

module.exports = new RouterController();