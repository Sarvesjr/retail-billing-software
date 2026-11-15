import { getPool } from '../config/db.js';

export async function getAllUsers() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, username, display_name, role, phone, is_active, created_at
     FROM users
     ORDER BY id ASC`
  );
  return rows;
}

export async function getUserById(id) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, username, display_name, role, phone, is_active, created_at
     FROM users
     WHERE id = ?`,
    [Number(id)]
  );
  return rows.length ? rows[0] : null;
}

export async function createUser(userData) {
  const pool = getPool();
  const {
    username,
    password,
    display_name,
    role = 'CASHIER',
    phone = null,
    is_active = true
  } = userData;

  const cleanUsername = String(username || '').trim().toLowerCase();
  if (!cleanUsername) {
    throw new Error('Username is required.');
  }
  if (!password || String(password).trim().length < 4) {
    throw new Error('Password must be at least 4 characters.');
  }
  if (!display_name || String(display_name).trim().length === 0) {
    throw new Error('Display Name is required.');
  }

  // Check unique username
  const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [cleanUsername]);
  if (existing.length > 0) {
    throw new Error(`Username "${cleanUsername}" is already taken. Please choose another.`);
  }

  const validRole = ['ADMIN', 'MANAGER', 'CASHIER'].includes(role) ? role : 'CASHIER';

  const [result] = await pool.execute(
    `INSERT INTO users (username, password_hash, display_name, role, phone, is_active)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      cleanUsername,
      String(password).trim(),
      String(display_name).trim(),
      validRole,
      phone ? String(phone).trim() : null,
      is_active ? 1 : 0
    ]
  );

  return await getUserById(result.insertId);
}

export async function updateUser(id, updateData) {
  const pool = getPool();
  const userId = Number(id);

  const existing = await getUserById(userId);
  if (!existing) {
    throw new Error(`User #${userId} not found.`);
  }

  const {
    display_name,
    role,
    phone,
    is_active,
    password
  } = updateData;

  const fields = [];
  const params = [];

  if (display_name !== undefined) {
    fields.push('display_name = ?');
    params.push(String(display_name).trim());
  }

  if (role !== undefined) {
    const validRole = ['ADMIN', 'MANAGER', 'CASHIER'].includes(role) ? role : existing.role;
    // Check if downgrading the last admin
    if (existing.role === 'ADMIN' && validRole !== 'ADMIN') {
      const [adminRows] = await pool.query(
        'SELECT COUNT(*) as count FROM users WHERE role = "ADMIN" AND id != ? AND is_active = 1',
        [userId]
      );
      if (adminRows[0].count === 0) {
        throw new Error('Cannot change role of the last active Administrator.');
      }
    }
    fields.push('role = ?');
    params.push(validRole);
  }

  if (phone !== undefined) {
    fields.push('phone = ?');
    params.push(phone ? String(phone).trim() : null);
  }

  if (is_active !== undefined) {
    const activeVal = is_active ? 1 : 0;
    // Check if deactivating the last active admin
    if (existing.role === 'ADMIN' && activeVal === 0) {
      const [adminRows] = await pool.query(
        'SELECT COUNT(*) as count FROM users WHERE role = "ADMIN" AND id != ? AND is_active = 1',
        [userId]
      );
      if (adminRows[0].count === 0) {
        throw new Error('Cannot deactivate the last active Administrator.');
      }
    }
    fields.push('is_active = ?');
    params.push(activeVal);
  }

  if (password && String(password).trim().length >= 4) {
    fields.push('password_hash = ?');
    params.push(String(password).trim());
  }

  if (fields.length > 0) {
    params.push(userId);
    await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      params
    );
  }

  return await getUserById(userId);
}

export async function deleteUser(id) {
  const pool = getPool();
  const userId = Number(id);

  const existing = await getUserById(userId);
  if (!existing) {
    throw new Error(`User #${userId} not found.`);
  }

  // Prevent deleting last admin
  if (existing.role === 'ADMIN') {
    const [adminRows] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE role = "ADMIN" AND id != ? AND is_active = 1',
      [userId]
    );
    if (adminRows[0].count === 0) {
      throw new Error('Cannot delete the last active Administrator.');
    }
  }

  await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
  return { success: true, message: `User "${existing.username}" deleted successfully.` };
}
