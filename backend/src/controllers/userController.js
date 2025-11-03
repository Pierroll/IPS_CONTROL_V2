// src/controllers/userController.js
const authService = require('../services/authService');

const createUser = async (req, res) => {
  try {
    const userData = req.body;
    // Restringir creación de ADMIN solo a soporte (admin@test.com)
    if (userData.role === 'ADMIN' && req.user.email !== 'admin@test.com') {
      return res.status(403).json({ error: 'Solo el usuario de soporte puede crear administradores' });
    }
    const user = await authService.registerUser(userData);
    res.status(201).json({ message: 'Usuario creado', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const users = await authService.getUsers(role || undefined);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUser = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await authService.getUserById(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await authService.updateUser(id, req.body);
    res.json({ message: 'Usuario actualizado', user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const id = req.params.id;
    await authService.deleteUser(id);
    res.json({ message: 'Usuario eliminado (soft delete)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getAllUsers, getUser, updateUser, deleteUser, createUser };