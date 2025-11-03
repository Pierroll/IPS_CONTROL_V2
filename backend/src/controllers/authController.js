// src/controllers/authController.js
const authService = require('../services/authService');

const register = async (req, res) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json({ message: 'Usuario creado', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { userAgent } = req.headers;
    const ip = req.ip || req.connection.remoteAddress;
    const { user, accessToken, refreshToken } = await authService.loginUser(email, password, userAgent, ip);
    res.json({ user, accessToken, refreshToken });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const { accessToken } = await authService.refreshAccessToken(refreshToken);
    res.json({ accessToken });
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    await authService.logoutUser(req.user.userId, refreshToken);
    res.json({ message: 'Logout exitoso' });
  } catch (error) {
    res.status(500).json({ error: 'Error en logout' });
  }
};

module.exports = { register, login, refresh, logout };