import { WebSocketServer, WebSocket } from 'ws';
import { lookupBarcode } from './barcodeService.js';

const wssServers = [];
const sseClients = new Set();
let lastScanPayload = null;

export function initWebSocketServer(server) {
  const wss = new WebSocketServer({ server, path: '/ws/scanner' });

  wss.on('connection', (ws, req) => {
    const ip = req.socket.remoteAddress;
    ws.send(JSON.stringify({
      type: 'INIT_ACK',
      payload: {
        message: 'Connected to Retail Scanner Stream',
        lastScan: lastScanPayload,
        timestamp: new Date().toISOString()
      }
    }));
  });

  wssServers.push(wss);
  return wss;
}

// Server-Sent Events (SSE) handler
export function handleSseConnection(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', lastScan: lastScanPayload })}\n\n`);
  sseClients.add(res);

  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
}

export function broadcastScanEvent(scanPayload) {
  lastScanPayload = scanPayload;
  const messageStr = JSON.stringify({
    type: 'BARCODE_SCANNED',
    payload: scanPayload
  });

  // 1. Broadcast to SSE clients
  for (const client of sseClients) {
    try {
      client.write(`data: ${messageStr}\n\n`);
    } catch (e) {
      sseClients.delete(client);
    }
  }

  // 2. Broadcast to WebSocket clients
  for (const wss of wssServers) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageStr);
        } catch (e) {}
      }
    });
  }
}

export async function processIncomingScan(barcode, inputSource = 'PHONE_USB') {
  // 1. Perform database lookup in MySQL
  const lookupResult = await lookupBarcode(barcode, inputSource);

  // 2. Attach a unique scanId to prevent duplicate event execution
  const scanId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  lookupResult.scanId = scanId;

  // 3. Broadcast immediately to desktop
  broadcastScanEvent(lookupResult);

  return lookupResult;
}

export function getLastScan() {
  return lastScanPayload;
}
