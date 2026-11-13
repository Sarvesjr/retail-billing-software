import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeDatabase(options = { runSeeds: true }) {
  console.log('[DB Init] Checking MySQL server connection...');

  // 1. Connect without selecting database to ensure database exists
  const serverConfig = {
    host: env.DB.host,
    port: env.DB.port,
    user: env.DB.user,
    password: env.DB.password,
    multipleStatements: true
  };

  let connection;
  try {
    connection = await mysql.createConnection(serverConfig);
  } catch (err) {
    console.error(`[DB Init] Failed to connect to MySQL on ${env.DB.host}:${env.DB.port}:`, err.message);
    throw err;
  }

  try {
    console.log(`[DB Init] Ensuring database "${env.DB.database}" exists...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.DB.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await connection.query(`USE \`${env.DB.database}\`;`);

    // 2. Ensure schema_migrations table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Find and apply migrations
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = (await fs.readdir(migrationsDir))
      .filter(f => f.endsWith('.sql'))
      .sort();

    const [appliedRows] = await connection.query('SELECT version FROM schema_migrations');
    const appliedVersions = new Set(appliedRows.map(r => r.version));

    for (const file of migrationFiles) {
      if (!appliedVersions.has(file)) {
        console.log(`[DB Init] Applying migration: ${file}`);
        const sqlPath = path.join(migrationsDir, file);
        const sql = await fs.readFile(sqlPath, 'utf8');

        // Execute migration within transaction
        await connection.beginTransaction();
        try {
          await connection.query(sql);
          await connection.query('INSERT INTO schema_migrations (version) VALUES (?)', [file]);
          await connection.commit();
          console.log(`[DB Init] Successfully applied: ${file}`);
        } catch (mErr) {
          await connection.rollback();
          console.error(`[DB Init] Error applying migration ${file}:`, mErr.message);
          throw mErr;
        }
      } else {
        console.log(`[DB Init] Migration already applied: ${file}`);
      }
    }

    // 4. Optionally apply seeds if products table is empty
    if (options.runSeeds) {
      const [productCountRows] = await connection.query('SELECT COUNT(*) AS count FROM products');
      const productCount = productCountRows[0].count;

      if (productCount === 0) {
        console.log('[DB Init] Products table is empty. Running initial seeds...');
        const seedsDir = path.join(__dirname, 'seeds');
        try {
          const seedFiles = (await fs.readdir(seedsDir))
            .filter(f => f.endsWith('.sql'))
            .sort();

          for (const file of seedFiles) {
            console.log(`[DB Init] Executing seed: ${file}`);
            const seedSql = await fs.readFile(path.join(seedsDir, file), 'utf8');
            await connection.query(seedSql);
          }
          console.log('[DB Init] Seeds executed successfully.');
        } catch (sErr) {
          console.warn('[DB Init] Seed execution warning:', sErr.message);
        }
      } else {
        console.log(`[DB Init] Products table already contains ${productCount} items. Skipping initial seeds.`);
      }
    }

    console.log('[DB Init] Database initialization complete.');
    return { success: true };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

