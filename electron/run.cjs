const { spawn } = require('child_process');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.ELECTRON_ENABLE_LOGGING = '1';

const child = spawn(electronPath, ['.'], {
  env
});

child.stdout.on('data', (d) => process.stdout.write(d.toString()));
child.stderr.on('data', (d) => process.stderr.write(d.toString()));

child.on('close', (code) => {
  console.log('[Electron Runner] Exited with code:', code);
  process.exit(code || 0);
});
