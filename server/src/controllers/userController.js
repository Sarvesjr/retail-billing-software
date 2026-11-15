import * as userService from '../services/userService.js';

export async function getUsers(req, res, next) {
  try {
    const users = await userService.getAllUsers();
    res.json({ success: true, data: users, count: users.length });
  } catch (error) {
    next(error);
  }
}

export async function getUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await userService.getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const result = await userService.createUser(req.body);
    res.status(201).json({
      success: true,
      message: 'User created successfully in MySQL',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await userService.updateUser(id, req.body);
    res.json({
      success: true,
      message: 'User updated successfully in MySQL',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await userService.deleteUser(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
