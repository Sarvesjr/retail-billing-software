import net from 'net';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3306;
const MYSQLD_PATHS = [
  'C:\\Program Files\\MySQL\\MySQL Server 9.6\\bin\\mysqld.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqld.exe',
  'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqld.exe'
];

function checkPort(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function findMysqldBinary() {
  for (const p of MYSQLD_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function main() {
  console.log(`[MySQL Checker] Checking if MySQL is running on port ${PORT}...`);
  const isRunning = await checkPort(PORT);
  if (isRunning) {
    console.log(`[MySQL Checker] MySQL is already running on port ${PORT}. Ready.`);
    process.exit(0);
  }

  console.log(`[MySQL Checker] Port ${PORT} is not open. Locating mysqld binary...`);
  const mysqldPath = findMysqldBinary();
  if (!mysqldPath) {
    console.error('[MySQL Checker] Error: mysqld.exe could not be found in standard installation paths.');
    process.exit(1);
  }

  // Data directory inside project or user profile
  const dataDir = path.resolve(__dirname, '../../.mysql_data');
  if (!fs.existsSync(dataDir)) {
    console.log(`[MySQL Checker] Creating and initializing local data directory at: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });

    console.log('[MySQL Checker] Running mysqld --initialize-insecure...');
    const initProcess = spawn(mysqldPath, [
      '--initialize-insecure',
      `--datadir=${dataDir}`,
      '--console'
    ]);

    initProcess.stdout.on('data', (d) => process.stdout.write(d.toString()));
    initProcess.stderr.on('data', (d) => process.stderr.write(d.toString()));

    await new Promise((resolve, reject) => {
      initProcess.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`mysqld --initialize-insecure exited with code ${code}`));
      });
    });
    console.log('[MySQL Checker] Initialization complete.');
  }

  console.log(`[MySQL Checker] Starting mysqld on port ${PORT}...`);
  const serverProcess = spawn(mysqldPath, [
    `--datadir=${dataDir}`,
    `--port=${PORT}`,
    '--console'
  ], {
    detached: true,
    stdio: 'ignore'
  });

  serverProcess.unref();

  // Wait for MySQL to become ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    ready = await checkPort(PORT);
    if (ready) break;
    process.stdout.write('.');
  }
  console.log('');

  if (ready) {
    console.log(`[MySQL Checker] MySQL Server successfully started and listening on port ${PORT}.`);
    process.exit(0);
  } else {
    console.error(`[MySQL Checker] Timed out waiting for MySQL to start on port ${PORT}.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[MySQL Checker] Fatal error:', err.message);
  process.exit(1);
});

