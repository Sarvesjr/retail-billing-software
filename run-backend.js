import { existsSync } from 'fs';
import { spawn } from 'child_process';
import { resolve } from 'path';

const isWindows = process.platform === 'win32';
const jarPath = resolve(process.cwd(), 'backend', 'target', 'retail-billing-backend-1.0.0.jar');
const backendDir = resolve(process.cwd(), 'backend');

let cmd, args;

if (existsSync(jarPath)) {
  console.log('[BACKEND] Launching pre-built JAR package...');
  cmd = 'java';
  args = ['-jar', jarPath];
} else {
  console.log('[BACKEND] JAR not found, launching with Maven wrapper...');
  cmd = isWindows ? resolve(backendDir, 'mvnw.cmd') : resolve(backendDir, 'mvnw');
  args = ['spring-boot:run'];
}

const child = spawn(cmd, args, { cwd: backendDir, stdio: 'inherit', shell: true });

child.on('exit', (code) => {
  process.exit(code || 0);
});
