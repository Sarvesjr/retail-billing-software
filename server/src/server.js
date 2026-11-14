import http from 'http';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { testConnection } from './config/db.js';
import { getOrCreateCertificate } from './config/ssl.js';
import { initWebSocketServer } from './services/scannerService.js';
import productRoutes from './routes/productRoutes.js';
import barcodeRoutes from './routes/barcodeRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import scannerRoutes from './routes/scannerRoutes.js';
import saleRoutes from './routes/saleRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const HTTPS_PORT = env.PORT + 1; // 5001

// Middleware
app.use(cors());
app.use(express.json());

// Serve Phone Barcode Scanner Companion UI
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));
app.get('/phone-scanner', (req, res) => {
  res.sendFile(path.join(publicPath, 'phone-scanner', 'index.html'));
});

// Health & System Info
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus.success ? 'connected' : 'disconnected',
    dbDetails: dbStatus
  });
});

// Complete Retail POS API Endpoints
app.use('/api/products', productRoutes);
app.use('/api/barcodes', barcodeRoutes);
app.use('/api', categoryRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// Serve static client production build if available
const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Fallback to client index.html for SPA client routing (e.g. /billing, /products)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/phone-scanner') || req.path.startsWith('/ws')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

// Error Handling Middleware
app.use(errorHandler);

async function startServer() {
  // 1. Initialize WebSocket on HTTP
  initWebSocketServer(httpServer);

  // 2. Start HTTP Server
  httpServer.listen(env.PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(` RETAIL BILLING BACKEND SERVER RUNNING`);
    console.log(` HTTP (Local/USB):   http://localhost:${env.PORT}/phone-scanner`);
    console.log(` WebSocket Stream:   ws://localhost:${env.PORT}/ws/scanner`);
    console.log(` MySQL Database:     ${env.DB.host}:${env.DB.port}/${env.DB.database}`);
    console.log(`=======================================================`);
  });

  // 3. Start HTTPS Server for Mobile Camera Live Stream
  try {
    const credentials = await getOrCreateCertificate();
    const httpsServer = https.createServer(credentials, app);
    initWebSocketServer(httpsServer);

    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(` HTTPS (Mobile Live Cam): https://10.159.238.198:${HTTPS_PORT}/phone-scanner`);
      console.log(` (Open https://... on phone for live video camera streaming)`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.warn(`[HTTPS Warning] Could not start HTTPS: ${err.message}`);
  }
}

startServer();
