import mysql from 'mysql2/promise';
import { env } from './env.js';

let pool = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(env.DB);
  }
  return pool;
}

export async function testConnection() {
  try {
    const p = getPool();
    const [rows] = await p.query('SELECT 1 + 1 AS result');
    return { success: true, result: rows[0].result };
  } catch (err) {
    return { success: false, error: err.message, code: err.code };
  }
}

export async function executeQuery(sql, params = []) {
  const p = getPool();
  const [rows] = await p.execute(sql, params);
  return rows;
}

export async function withTransaction(callback) {
  const p = getPool();
  const connection = await p.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

