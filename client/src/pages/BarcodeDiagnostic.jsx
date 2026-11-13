import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { SCAN_EVENT } from '../components/BarcodeListener';
import {
  ScanBarcode,
  Smartphone,
  Database,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Usb,
  Clock,
  Send,
  Zap
} from 'lucide-react';

export function BarcodeDiagnostic() {
  const { t, lang } = useI18n();
  const [lastScan, setLastScan] = useState(null);
  const [testInput, setTestInput] = useState('8901234567890');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await api.getScannerLogs(15);
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Listen to real-time scans from both Phone USB companion and Physical USB scanner
    const handleScanEvent = (e) => {
      setLastScan(e.detail);
      fetchLogs();
    };

    window.addEventListener(SCAN_EVENT, handleScanEvent);
    return () => {
      window.removeEventListener(SCAN_EVENT, handleScanEvent);
    };
  }, []);

  const handleManualTest = async (barcodeToTest, source = 'MANUAL') => {
    setLoading(true);
    try {
      const result = await api.lookupBarcode(barcodeToTest, source);
      setLastScan(result);
      fetchLogs();
    } catch (err) {
      setLastScan({
        success: false,
        found: false,
        barcode: barcodeToTest,
        inputSource: source,
        scanTimestamp: new Date().toISOString(),
        error: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-gray-100 p-4 space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-gray-300 p-3 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-900 rounded">
            <ScanBarcode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              {t('scannerTitle')}
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                MySQL 9 Verified
              </span>
            </h2>
            <p className="text-xs text-gray-500">
              {t('scannerDesc')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://10.159.238.198:5001/phone-scanner"
            target="_blank"
            rel="noreferrer"
            className="btn-success text-xs"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{t('openPhoneScanner')}</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Left Column: Last Scan Live Result (2 Cols Wide) */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white border border-gray-300 shadow-xs">
            <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 flex items-center justify-between">
              <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                {t('lastScannedBarcode')} ({t('liveInspector')})
              </span>
              {lastScan && (
                <span className="font-mono text-[11px] text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(lastScan.scanTimestamp).toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="p-4">
              {lastScan ? (
                <div className="space-y-3">
                  {/* Status Banner */}
                  <div
                    className={`p-3 rounded border flex items-center justify-between ${
                      lastScan.found
                        ? 'bg-green-50 border-green-300 text-green-900'
                        : 'bg-red-50 border-red-300 text-red-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {lastScan.found ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                      )}
                      <div>
                        <div className="text-sm font-bold">
                          {lastScan.found ? t('lookupSuccess') : t('lookupFailure')}
                        </div>
                        <div className="text-xs">
                          {lastScan.message || (lastScan.found ? t('verifiedInDatabase') : t('lookupFailure'))}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <div className="font-bold text-gray-700">{t('lookupTime')}</div>
                      <div className="text-emerald-700 font-semibold">{lastScan.responseTimeMs || 0} ms</div>
                    </div>
                  </div>

                  {/* Core Diagnostic Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 border border-gray-200 rounded">
                    <div>
                      <div className="text-[11px] font-bold text-gray-500 uppercase">{t('barcode')}</div>
                      <div className="font-mono text-lg font-bold text-blue-900">{lastScan.barcode}</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-gray-500 uppercase">{t('inputSource')}</div>
                      <div className="flex items-center gap-1.5 font-bold text-xs mt-1">
                        {lastScan.inputSource === 'PHONE_USB' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Smartphone className="w-3 h-3" /> Android Phone (USB)
                          </span>
                        ) : lastScan.inputSource === 'HARDWARE_USB' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                            <Usb className="w-3 h-3" /> USB Barcode Scanner (HID)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-200 text-gray-800 border border-gray-300">
                            Manual Test Input
                          </span>
                        )}
                      </div>
                    </div>

                    {lastScan.found && lastScan.product && (
                      <>
                        <div className="col-span-2 border-t border-gray-200 pt-2 grid grid-cols-3 gap-2">
                          <div>
                            <div className="text-[11px] font-bold text-gray-500 uppercase">{t('productId')} &amp; {t('sku')}</div>
                            <div className="font-mono text-xs font-bold text-gray-800">
                              ID: #{lastScan.product.id} ({lastScan.product.sku})
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-[11px] font-bold text-gray-500 uppercase">{t('productName')}</div>
                            <div className="text-xs font-bold text-gray-900">
                              {lastScan.product.name} {lastScan.product.tamilName ? `| ${lastScan.product.tamilName}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2 bg-white p-2.5 border border-gray-200 rounded grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <div className="text-[10px] text-gray-500">{t('category')}</div>
                            <div className="font-semibold text-gray-800">{lastScan.product.category || '-'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-500">{t('sellingPrice')}</div>
                            <div className="font-bold text-emerald-700">₹{Number(lastScan.product.sellingPrice).toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-500">{t('mrp')}</div>
                            <div className="font-mono text-gray-600">₹{Number(lastScan.product.mrp).toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-gray-500">{t('currentStock')}</div>
                            <div className="font-bold text-blue-900 font-mono">
                              {Number(lastScan.product.currentStock).toFixed(3)} {lastScan.product.unit}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* MySQL Audit Verification Note */}
                  <div className="text-[11px] text-gray-500 flex items-center gap-1.5 font-mono bg-blue-50/50 p-2 border border-blue-100 rounded">
                    <Database className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      MySQL query: <code className="text-blue-900 font-semibold">SELECT * FROM product_barcodes WHERE barcode = '{lastScan.barcode}'</code> (Recorded in MySQL <code className="text-gray-800">scanner_logs</code>)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-gray-500 space-y-2">
                  <ScanBarcode className="w-10 h-10 text-gray-300 mx-auto animate-pulse" />
                  <div className="text-xs font-bold text-gray-700">{t('waitingScan')}</div>
                  <p className="text-[11px] text-gray-400 max-w-md mx-auto">
                    {t('waitingScanDesc')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Manual Test & Sample Barcode Trigger */}
          <div className="bg-white border border-gray-300 p-3 shadow-xs space-y-2">
            <div className="font-bold text-xs text-gray-700 flex items-center gap-1.5">
              <span>{t('sampleTriggers')}</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter barcode string..."
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualTest(testInput)}
                className="form-input flex-1 font-mono text-xs"
              />
              <button
                onClick={() => handleManualTest(testInput)}
                disabled={loading}
                className="btn-primary text-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Querying...' : t('queryMysql')}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-gray-200">
              <div className="text-[11px] text-gray-500 mb-1.5">{t('sampleTriggers')}</div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => { setTestInput('8901234567890'); handleManualTest('8901234567890'); }}
                  className="px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 text-xs hover:bg-blue-100 font-mono"
                >
                  8901234567890 (Parle-G 250g)
                </button>
                <button
                  onClick={() => { setTestInput('8901030383786'); handleManualTest('8901030383786'); }}
                  className="px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 text-xs hover:bg-blue-100 font-mono"
                >
                  8901030383786 (Tata Salt 1kg)
                </button>
                <button
                  onClick={() => { setTestInput('8901725181222'); handleManualTest('8901725181222'); }}
                  className="px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 text-xs hover:bg-blue-100 font-mono"
                >
                  8901725181222 (Aachi Chilli 100g)
                </button>
                <button
                  onClick={() => { setTestInput('8901023000553'); handleManualTest('8901023000553'); }}
                  className="px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 text-xs hover:bg-blue-100 font-mono"
                >
                  8901023000553 (Cinthol Soap)
                </button>
                <button
                  onClick={() => { setTestInput('9999999999999'); handleManualTest('9999999999999'); }}
                  className="px-2 py-1 rounded bg-red-50 text-red-800 border border-red-200 text-xs hover:bg-red-100 font-mono"
                >
                  9999999999999 ({t('lookupFailure')})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Phone USB Guide & Instructions */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-300 shadow-xs">
            <div className="bg-emerald-900 text-white px-3 py-2 border-b border-emerald-950 font-bold text-xs flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-300" />
              <span>{t('phoneSetupTitle')}</span>
            </div>

            <div className="p-3 text-xs space-y-3 text-gray-700">
              <div className="bg-emerald-50 p-2.5 rounded border border-emerald-200 text-emerald-900">
                <div className="font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {t('offlineDirectNotice')}
                </div>
                <div className="text-[11px] mt-0.5 text-emerald-800">
                  {t('offlineDirectDesc')}
                </div>
              </div>

              <div>
                <div className="font-bold text-gray-900 mb-1">{t('methodA')}</div>
                <div className="text-gray-600 text-[11px] whitespace-pre-line leading-relaxed">
                  {t('methodASteps')}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-2">
                <div className="font-bold text-gray-900 mb-1">{t('methodB')}</div>
                <div className="text-gray-600 text-[11px] whitespace-pre-line leading-relaxed">
                  {t('methodBSteps')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Table: Real MySQL Scanner Logs History */}
      <div className="bg-white border border-gray-300 shadow-xs">
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 flex items-center justify-between">
          <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-700" />
            <span>{t('recentLogs')}</span>
          </span>
          <button onClick={fetchLogs} className="btn-secondary text-[11px] py-0.5 px-2">
            <RefreshCw className={`w-3 h-3 ${logsLoading ? 'animate-spin' : ''}`} />
            <span>{t('refresh')}</span>
          </button>
        </div>

        <div className="overflow-x-auto max-h-60">
          <table className="excel-table text-xs">
            <thead>
              <tr>
                <th className="w-12 text-center">{t('sNo')}</th>
                <th>Time</th>
                <th>{t('barcode')}</th>
                <th>{t('inputSource')}</th>
                <th>{t('lookupResult')}</th>
                <th>{t('productId')}</th>
                <th>{t('productName')}</th>
                <th className="text-right">Latency</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading && logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-gray-500 font-mono">
                    Loading scan audit trail from MySQL...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-4 text-gray-500">
                    No scan logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-center font-mono text-gray-500">#{log.id}</td>
                    <td className="font-mono text-gray-600">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="font-mono font-bold text-blue-900">{log.barcode}</td>
                    <td>
                      {log.input_source === 'PHONE_USB' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          PHONE_USB
                        </span>
                      ) : log.input_source === 'HARDWARE_USB' ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                          HARDWARE_USB
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                          {log.input_source}
                        </span>
                      )}
                    </td>
                    <td>
                      {log.lookup_status === 'FOUND' ? (
                        <span className="text-green-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> FOUND
                        </span>
                      ) : (
                        <span className="text-red-600 font-bold flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> NOT_FOUND
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-gray-600">{log.product_id ? `#${log.product_id}` : '-'}</td>
                    <td className="font-semibold text-gray-900">{log.product_name || '-'}</td>
                    <td className="num-cell text-emerald-700 font-bold">{log.response_time_ms} ms</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
