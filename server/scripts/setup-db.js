import { initializeDatabase } from '../src/database/init.js';

async function run() {
  try {
    console.log('[Setup DB] Starting database setup and migration check...');
    await initializeDatabase({ runSeeds: true });
    console.log('[Setup DB] Database setup successfully completed.');
    process.exit(0);
  } catch (err) {
    console.error('[Setup DB] Error setting up database:', err);
    process.exit(1);
  }
}

run();

