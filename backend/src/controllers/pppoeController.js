const pppoeService = require('../services/pppoeService');

class PPPoEController {
  async createUser(req, res) {
    try {
      const { routerId } = req.params;
      const userData = req.body;
      
      const result = await pppoeService.createPPPoEUser(routerId, userData);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error en createUser:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { routerId, username } = req.params;
      
      const result = await pppoeService.deletePPPoEUser(routerId, username);
      res.json(result);
    } catch (error) {
      console.error('Error en deleteUser:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async updateUser(req, res) {
    try {
      const { routerId, username } = req.params;
      const updateData = req.body;
      
      const result = await pppoeService.updatePPPoEUser(routerId, username, updateData);
      res.json(result);
    } catch (error) {
      console.error('Error en updateUser:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async getUsers(req, res) {
    try {
      const { routerId } = req.params;
      
      const result = await pppoeService.getPPPoEUsers(routerId);
      res.json(result);
    } catch (error) {
      console.error('Error en getUsers:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  async testConnection(req, res) {
    try {
      const { routerId } = req.params;
      
      const result = await pppoeService.testConnection(routerId);
      res.json(result);
    } catch (error) {
      console.error('Error en testConnection:', error);
      res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
}

module.exports = new PPPoEController();
