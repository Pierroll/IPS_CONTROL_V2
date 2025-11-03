const mikrotikProfileService = require('../services/mikrotikProfileService');

class MikroTikProfileController {
  async syncProfiles(req, res) {
    try {
      const { routerId } = req.params;
      
      if (!routerId) {
        return res.status(400).json({
          success: false,
          error: 'ID del router es requerido'
        });
      }

      console.log(`🔄 Iniciando sincronización de perfiles para router: ${routerId}`);
      
      const syncedProfiles = await mikrotikProfileService.syncProfilesToDatabase(routerId);
      
      res.json({
        success: true,
        message: `Se sincronizaron ${syncedProfiles.length} perfiles exitosamente`,
        data: syncedProfiles
      });
    } catch (error) {
      console.error('❌ Error en syncProfiles:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getProfilesFromRouter(req, res) {
    try {
      const { routerId } = req.params;
      
      if (!routerId) {
        return res.status(400).json({
          success: false,
          error: 'ID del router es requerido'
        });
      }

      console.log(`🔍 Obteniendo perfiles del router: ${routerId}`);
      
      const profiles = await mikrotikProfileService.getProfilesFromRouter(routerId);
      
      res.json({
        success: true,
        message: `Se encontraron ${profiles.length} perfiles en el router`,
        data: profiles
      });
    } catch (error) {
      console.error('❌ Error en getProfilesFromRouter:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getSyncedPlans(req, res) {
    try {
      console.log('📋 Obteniendo planes sincronizados del MikroTik');
      
      const plans = await mikrotikProfileService.getSyncedPlans();
      
      res.json({
        success: true,
        message: `Se encontraron ${plans.length} planes sincronizados`,
        data: plans
      });
    } catch (error) {
      console.error('❌ Error en getSyncedPlans:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async testRouterConnection(req, res) {
    try {
      const { routerId } = req.params;
      
      if (!routerId) {
        return res.status(400).json({
          success: false,
          error: 'ID del router es requerido'
        });
      }

      console.log(`🔌 Probando conexión al router: ${routerId}`);
      
      // Intentar obtener perfiles para probar la conexión
      const profiles = await mikrotikProfileService.getProfilesFromRouter(routerId);
      
      res.json({
        success: true,
        message: 'Conexión exitosa al router',
        data: {
          profilesFound: profiles.length,
          routerId: routerId
        }
      });
    } catch (error) {
      console.error('❌ Error en testRouterConnection:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getProfilesFromAnyRouter(req, res) {
    try {
      console.log('🔍 Obteniendo perfiles del primer router MikroTik activo...');
      const profiles = await mikrotikProfileService.getFirstRouterAndProfiles();
      res.json({
        success: true,
        message: `Se encontraron ${profiles.length} perfiles en el router`,
        data: profiles
      });
    } catch (error) {
      console.error('❌ Error en getProfilesFromAnyRouter:', error.message);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new MikroTikProfileController();
