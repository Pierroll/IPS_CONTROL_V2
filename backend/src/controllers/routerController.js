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
    // ✅ Guardar variables fuera del try para usarlas en el catch
    let ipAddress, apiPort, username, password, useTls;
    
    try {
      console.log('📥 Request Body recibido:', { 
        ...req.body, 
        password: req.body.password ? '***' : undefined 
      });
      
      ({ ipAddress, apiPort, username, password, useTls } = req.body);

      // Validación más detallada
      if (!ipAddress || ipAddress.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'La dirección IP es requerida'
        });
      }
      
      if (!apiPort || isNaN(parseInt(apiPort)) || parseInt(apiPort) < 1 || parseInt(apiPort) > 65535) {
        return res.status(400).json({
          success: false,
          error: 'El puerto API debe ser un número válido entre 1 y 65535'
        });
      }
      
      if (!username || username.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'El nombre de usuario es requerido'
        });
      }
      
      if (!password || password.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'La contraseña es requerida'
        });
      }

      const portNumber = parseInt(apiPort, 10);
      console.log(`🔌 Conectando a ${ipAddress}:${portNumber} (puerto del formulario)...`);

      const conn = new RouterOSAPI({
        host: ipAddress,
        port: portNumber, // ✅ Usar el puerto que el usuario ingresó en el formulario
        user: username,
        password: password,
        timeout: 10, // 10 segundos de timeout
        tls: useTls ? { rejectUnauthorized: false } : undefined
      });

      try {
        await conn.connect();
        console.log('✅ Conectado exitosamente');

        const identity = await conn.write('/system/identity/print');
        const resources = await conn.write('/system/resource/print');

        conn.close();
        console.log('🔌 Conexión cerrada');

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
      } catch (connectError) {
        console.error('❌ Error en conexión:', connectError);
        if (conn) {
          try {
            conn.close();
          } catch (closeError) {
            // Ignorar errores al cerrar
          }
        }
        throw connectError;
      }
    } catch (error) {
      console.error('❌ Error completo:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        errno: error.errno,
        stack: error.stack
      });
      
      // Mensajes de error más descriptivos
      let errorMessage = 'Error al conectar con el router';
      
      // Usar valores de req.body si las variables no están definidas (por si el error ocurre antes de la asignación)
      const errorIpAddress = ipAddress || req.body?.ipAddress || 'desconocida';
      const errorApiPort = apiPort || req.body?.apiPort || 'desconocido';
      
      // Verificar errno (códigos de error del sistema)
      if (error.errno !== undefined) {
        // errno -61 en macOS/Linux = ECONNREFUSED
        // errno -111 en Linux = ECONNREFUSED
        if (error.errno === -61 || error.errno === -111 || error.errno === 61 || error.errno === 111) {
          errorMessage = `No se pudo conectar al router en ${errorIpAddress}:${errorApiPort}. La conexión fue rechazada. Verifica que:
- El router esté encendido y accesible
- El puerto ${errorApiPort} esté abierto y no bloqueado por firewall
- La dirección IP ${errorIpAddress} sea correcta
- El router permita conexiones desde este servidor`;
        } else if (error.errno === -60 || error.errno === 60) {
          errorMessage = `Timeout al conectar al router ${errorIpAddress}:${errorApiPort}. El router no respondió en el tiempo esperado.`;
        } else if (error.errno === -64 || error.errno === 64) {
          errorMessage = `No se pudo resolver la dirección IP ${errorIpAddress}. Verifica que la IP sea correcta.`;
        } else if (error.errno === -65 || error.errno === 65) {
          errorMessage = `El router en ${errorIpAddress} no es accesible desde este servidor. Verifica la conectividad de red.`;
        } else {
          errorMessage = `Error de conexión (errno: ${error.errno}). Verifica la configuración del router.`;
        }
      } else if (error.code) {
        // Errores de red comunes por código
        switch (error.code) {
          case 'ECONNREFUSED':
            errorMessage = `No se pudo conectar al router en ${errorIpAddress}:${errorApiPort}. La conexión fue rechazada. Verifica que el router esté encendido, el puerto ${errorApiPort} esté abierto y la IP sea correcta.`;
            break;
          case 'ETIMEDOUT':
          case 'TIMEOUT':
            errorMessage = `Timeout al conectar al router. El router no respondió en el tiempo esperado.`;
            break;
          case 'ENOTFOUND':
            errorMessage = `No se pudo resolver la dirección IP ${errorIpAddress}. Verifica que la IP sea correcta.`;
            break;
          case 'EHOSTUNREACH':
            errorMessage = `El router en ${errorIpAddress} no es accesible desde este servidor. Verifica la conectividad de red.`;
            break;
          default:
            errorMessage = `Error de conexión (${error.code}): ${error.message || 'Error desconocido'}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Si el error menciona credenciales o autenticación
      const errorMsgLower = errorMessage.toLowerCase();
      if (errorMsgLower.includes('invalid') || 
          errorMsgLower.includes('password') || 
          errorMsgLower.includes('credential') ||
          errorMsgLower.includes('authentication') ||
          errorMsgLower.includes('login')) {
        errorMessage = 'Credenciales incorrectas. Verifica el usuario y contraseña del router.';
      }
      
      console.error('📤 Enviando error al cliente:', errorMessage);
      res.status(400).json({
        success: false,
        error: errorMessage
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