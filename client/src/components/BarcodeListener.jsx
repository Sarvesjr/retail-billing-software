import React, { useEffect, useRef } from 'react';
import { api } from '../services/api';

// Global custom event name for all components to subscribe
export const SCAN_EVENT = 'retail:barcode_scanned';

const processedScanIds = new Set();
let lastDispatchedBarcode = '';
let lastDispatchedTime = 0;

export function dispatchScanEvent(scanData) {
  if (!scanData || !scanData.barcode) return;

  const now = Date.now();
  const scanId = scanData.scanId;

  // 1. Strict deduplication by unique scanId (prevents duplicate processing across WS, SSE, & poll)
  if (scanId) {
    if (processedScanIds.has(scanId)) {
      return;
    }
    processedScanIds.add(scanId);
    setTimeout(() => processedScanIds.delete(scanId), 5000);
  }

  // 2. Micro-debounce (250ms) only for identical mechanical contact bounce
  if (scanData.barcode === lastDispatchedBarcode && (now - lastDispatchedTime) < 250) {
    return;
  }

  lastDispatchedBarcode = scanData.barcode;
  lastDispatchedTime = now;
  window.__LAST_SCANNED_BARCODE__ = scanData;
  window.dispatchEvent(new CustomEvent(SCAN_EVENT, { detail: scanData }));
}

export function BarcodeListener({ children }) {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const eventSourceRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => {
    // 1. Hardware USB Scanner Keyboard Listener (HID)
    const handleKeyDown = async (e) => {
      // If user is actively typing in a form input, textarea, or contentEditable, do NOT hijack!
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Enter key indicates end of barcode transmission from hardware scanner
      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        bufferRef.current = '';

        if (barcode.length >= 3) {
          e.preventDefault();
          try {
            const result = await api.lookupBarcode(barcode, 'HARDWARE_USB');
            result.scanId = `hid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            dispatchScanEvent(result);
          } catch (err) {
            console.error('[Hardware Scanner Error]', err);
          }
        }
        return;
      }

      if (e.key.length === 1) {
        if (timeDiff > 120 && bufferRef.current.length > 0) {
          bufferRef.current = '';
        }
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // 2. Dual Real-time Channel: WebSocket (Primary) + SSE (Fallback)
    let isStreamActive = false;

    function connectWebSocket() {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/scanner`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          isStreamActive = true;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'BARCODE_SCANNED' && data.payload) {
              dispatchScanEvent(data.payload);
            }
          } catch (_) {}
        };

        ws.onclose = () => {
          isStreamActive = false;
          setTimeout(connectWebSocket, 2000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (_) {
        setTimeout(connectWebSocket, 2000);
      }
    }

    function connectSSE() {
      try {
        const es = new EventSource('/api/scanner/events');
        eventSourceRef.current = es;

        es.onopen = () => {
          isStreamActive = true;
        };

        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'BARCODE_SCANNED' && data.payload) {
              dispatchScanEvent(data.payload);
            }
          } catch (_) {}
        };

        es.onerror = () => {
          es.close();
          setTimeout(connectSSE, 3000);
        };
      } catch (_) {
        setTimeout(connectSSE, 3000);
      }
    }

    connectWebSocket();
    connectSSE();

    // 3. Fallback Polling (Only if neither WebSocket nor SSE is active)
    const pollInterval = setInterval(async () => {
      if (isStreamActive) return;
      try {
        const res = await fetch('/api/scanner/latest');
        const json = await res.json();
        if (json.data && json.data.barcode && json.data.scanId) {
          dispatchScanEvent(json.data);
        }
      } catch (_) {}
    }, 1500);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (wsRef.current) wsRef.current.close();
      if (eventSourceRef.current) eventSourceRef.current.close();
      clearInterval(pollInterval);
    };
  }, []);

  return <>{children}</>;
}
