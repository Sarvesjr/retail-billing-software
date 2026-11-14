const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'Retail Billing & Inventory Software',
    backgroundColor: '#f3f4f6',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // Remove standard menu bar for traditional compact retail application feel
  mainWindow.setMenuBarVisibility(false);

  const appUrl = process.env.APP_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : 'http://localhost:5000');

  function loadAppWithRetry(url, maxRetries = 25) {
    let retries = 0;
    const tryLoad = () => {
      if (!mainWindow) return;
      mainWindow.loadURL(url).catch((err) => {
        retries++;
        if (retries < maxRetries) {
          console.log(`[Electron] Waiting for server at ${url}... (${retries}/${maxRetries})`);
          setTimeout(tryLoad, 1000);
        } else {
          if (url.includes(':5173')) {
            console.log('[Electron] Port 5173 unavailable. Trying http://localhost:5000...');
            loadAppWithRetry('http://localhost:5000', 10);
          } else {
            console.error('[Electron] Failed to load application URL:', err);
          }
        }
      });
    };
    tryLoad();
  }

  loadAppWithRetry(appUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

