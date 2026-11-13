import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { generateCode128Svg, generateRetailEAN13 } from '../utils/barcodeGenerator';
import { SCAN_EVENT } from '../components/BarcodeListener';
import {
  Barcode,
  Search,
  Plus,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Layers,
  Tag,
  Smartphone,
  Check,
  Radio
} from 'lucide-react';

export function BarcodeManagement() {
  const { t, lang } = useI18n();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Assign Barcode Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [barcodeToAssign, setBarcodeToAssign] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [scanNotice, setScanNotice] = useState('');
  const [recentScannedCode, setRecentScannedCode] = useState('');
  const barcodeInputRef = useRef(null);

  // Print Label Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printProduct, setPrintProduct] = useState(null);
  const [labelQuantity, setLabelQuantity] = useState(24);
  const [labelLayout, setLabelLayout] = useState('sheet24'); // 'sheet24' | 'sheet40' | 'thermal'

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.getProducts({ search });
      setProducts(res.data || []);
    } catch (err) {
      setErrorMsg('Failed to load products: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [search]);

  // Listen for real-time barcode scans from Mobile Phone Camera or USB Handheld Barcode Gun!
  useEffect(() => {
    const handleScanEvent = (e) => {
      const scanData = e.detail;
      if (!scanData || !scanData.barcode) return;
      const scannedCode = String(scanData.barcode).trim();
      setRecentScannedCode(scannedCode);

      // Play audio beep for instant feedback
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 1350;
        gain.gain.value = 0.2;
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } catch (_) {}

      if (assignModalOpen) {
        // Modal is currently open -> immediately populate barcode field!
        setBarcodeToAssign(scannedCode);
        setScanNotice(`Captured "${scannedCode}" from ${scanData.inputSource || 'mobile scanner'}!`);
        setTimeout(() => {
          if (barcodeInputRef.current) {
            barcodeInputRef.current.focus();
            barcodeInputRef.current.select();
          }
        }, 50);
      } else {
        // Modal is closed -> notify user and offer quick action
        const matched = products.find((p) => p.barcodes && p.barcodes.includes(scannedCode));
        if (matched) {
          setSuccessMsg(`Mobile Scanned Barcode "${scannedCode}" matches product: "${matched.name}".`);
        } else {
          setSuccessMsg(`Mobile Scanned Barcode "${scannedCode}". Click "Assign" on any product below to link it.`);
        }
      }
    };

    window.addEventListener(SCAN_EVENT, handleScanEvent);
    return () => window.removeEventListener(SCAN_EVENT, handleScanEvent);
  }, [assignModalOpen, products]);

  // Generate & auto-assign EAN-13
  const handleAutoGenerate = async (product) => {
    const newBarcode = generateRetailEAN13(product.id + Date.now());
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.assignBarcode({
        productId: product.id,
        barcode: newBarcode,
        isPrimary: true,
        replaceExisting: true
      });
      setSuccessMsg(`Generated and assigned authentic EAN-13 "${newBarcode}" to "${product.name}".`);
      loadProducts();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAssign = (product) => {
    setSelectedProduct(product);
    // If user recently scanned something while on page, use that; otherwise use product's primary barcode or empty
    const currentCode = recentScannedCode || (product.barcodes ? product.barcodes.split(',')[0].trim() : '');
    setBarcodeToAssign(currentCode);
    setReplaceExisting(true);
    setScanNotice(recentScannedCode ? `Pre-filled from recent scan: ${recentScannedCode}` : '');
    setErrorMsg('');
    setAssignModalOpen(true);
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
        barcodeInputRef.current.select();
      }
    }, 100);
  };

  const handleSaveAssign = async (e) => {
    if (e) e.preventDefault();
    const cleanBarcode = barcodeToAssign.trim();
    if (!cleanBarcode || !selectedProduct) {
      setErrorMsg('Please enter or scan a valid barcode.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.assignBarcode({
        productId: selectedProduct.id,
        barcode: cleanBarcode,
        isPrimary: true,
        replaceExisting
      });
      setSuccessMsg(res.message || `Barcode "${cleanBarcode}" assigned to "${selectedProduct.name}".`);
      setAssignModalOpen(false);
      setRecentScannedCode('');
      loadProducts();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPrint = (product) => {
    const primaryCode = product.barcodes ? product.barcodes.split(',')[0].trim() : product.sku;
    setPrintProduct({ ...product, activeBarcode: primaryCode });
    setLabelQuantity(labelLayout === 'sheet40' ? 40 : 24);
    setPrintModalOpen(true);
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Screen Header Bar */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-300 flex items-center justify-between shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-sm">
            <Barcode className="w-4 h-4 text-indigo-700" />
            <span>{lang === 'ta' ? 'பார்கோடு உருவாக்கம் & ஸ்டிக்கர் லேபிள் பிரிண்டர்' : 'Barcode Management & Sticker Label Printer'}</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
            <input
              type="text"
              placeholder={lang === 'ta' ? 'பொருள் அல்லது பார்கோடு தேட...' : 'Filter products or barcode...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-8 py-1 text-xs w-64"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {recentScannedCode && (
            <div className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-900 border border-indigo-200 px-2.5 py-1 rounded-full font-mono font-bold animate-pulse">
              <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
              <span>Last Scan: {recentScannedCode}</span>
            </div>
          )}
          <button onClick={loadProducts} className="btn-secondary text-xs p-1.5" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="bg-red-50 text-red-800 text-xs px-4 py-2 border-b border-red-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-800">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 text-xs px-4 py-2 border-b border-emerald-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Products Barcode Table */}
      <div className="flex-1 overflow-auto p-3 print:hidden">
        <div className="bg-white border border-gray-300 shadow-xs">
          <table className="excel-table text-xs">
            <thead>
              <tr>
                <th className="w-12 text-center">#</th>
                <th>{t('productName')}</th>
                <th>{t('sku')}</th>
                <th>{lang === 'ta' ? 'இணைக்கப்பட்ட பார்கோடுகள்' : 'Assigned Barcodes'}</th>
                <th className="text-right">{t('price')}</th>
                <th className="text-center">{t('currentStock')}</th>
                <th className="w-60 text-center">{lang === 'ta' ? 'பார்கோடு செயல்கள்' : 'Barcode Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-400">Loading products from MySQL...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-400">No products found.</td>
                </tr>
              ) : (
                products.map((prod, idx) => {
                  const hasBarcode = Boolean(prod.barcodes && prod.barcodes.trim());
                  return (
                    <tr key={prod.id} className="hover:bg-blue-50/40">
                      <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                      <td>
                        <div className="font-bold text-gray-900">{prod.name}</div>
                        {prod.tamil_name && <div className="text-gray-500 text-[11px]">{prod.tamil_name}</div>}
                      </td>
                      <td className="font-mono text-indigo-700">{prod.sku}</td>
                      <td>
                        {hasBarcode ? (
                          <div className="flex flex-wrap gap-1">
                            {prod.barcodes.split(',').map((bc, bIdx) => (
                              <span
                                key={bIdx}
                                className="font-mono font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 px-1.5 py-0.5 rounded text-[11px]"
                              >
                                {bc.trim()}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">
                            ⚠️ No barcode assigned
                          </span>
                        )}
                      </td>
                      <td className="num-cell font-bold text-gray-900">
                        ₹{Number(prod.selling_price).toFixed(2)}
                      </td>
                      <td className="text-center font-mono text-gray-700">
                        {prod.current_stock} {prod.unit_code}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Generate Button */}
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => handleAutoGenerate(prod)}
                            className="bg-purple-50 text-purple-700 border border-purple-300 hover:bg-purple-100 px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1"
                            title="Auto-generate 13-digit retail EAN barcode"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Auto EAN</span>
                          </button>

                          {/* Manual / Scan Assign Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenAssign(prod)}
                            className="btn-primary text-[11px] py-1 px-2.5 font-bold flex items-center gap-1"
                            title="Assign / Scan Barcode"
                          >
                            <Barcode className="w-3 h-3" />
                            <span>Assign / Scan</span>
                          </button>

                          {/* Print Label Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenPrint(prod)}
                            className="bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1"
                            title="Print Barcode Labels"
                          >
                            <Printer className="w-3 h-3 text-emerald-600" />
                            <span>Labels</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Barcode Modal */}
      {assignModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg border border-gray-300 overflow-hidden">
            <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Barcode className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-xs uppercase tracking-wide">
                  Assign Barcode to: {selectedProduct.name}
                </h3>
              </div>
              <button onClick={() => setAssignModalOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssign} className="p-4 space-y-3.5 text-xs">
              {/* Product Info Bar */}
              <div className="bg-blue-50/70 p-2.5 rounded border border-blue-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-gray-900 text-sm">{selectedProduct.name}</div>
                  {selectedProduct.tamil_name && (
                    <div className="text-gray-600 text-xs">{selectedProduct.tamil_name}</div>
                  )}
                  <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                    SKU: {selectedProduct.sku} | Price: ₹{Number(selectedProduct.selling_price).toFixed(2)}
                  </div>
                </div>
                {selectedProduct.barcodes && (
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 block">Current Barcode:</span>
                    <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                      {selectedProduct.barcodes.split(',')[0]}
                    </span>
                  </div>
                )}
              </div>

              {/* Live Scanner Banner */}
              <div className="bg-emerald-50 border border-emerald-300 rounded p-2.5 flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                <div className="flex-1 text-[11px] text-emerald-900">
                  <span className="font-bold">Mobile Camera / USB Scanner Ready:</span> Simply point your phone camera at the product barcode to auto-fill below, or type/paste!
                </div>
              </div>

              {scanNotice && (
                <div className="bg-indigo-50 border border-indigo-200 rounded p-2 text-indigo-900 text-[11px] flex items-center gap-1.5 font-bold">
                  <Check className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{scanNotice}</span>
                </div>
              )}

              {/* Barcode Input */}
              <div>
                <label className="block font-bold text-gray-800 mb-1">
                  Barcode Number (EAN-13 / Code-128 / Custom):
                </label>
                <div className="relative">
                  <Barcode className="w-4 h-4 absolute left-3 top-2.5 text-indigo-600" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    required
                    autoFocus
                    placeholder="Scan product with phone camera or enter numbers..."
                    value={barcodeToAssign}
                    onChange={(e) => setBarcodeToAssign(e.target.value)}
                    className="form-input pl-9 pr-8 w-full font-mono text-base font-black tracking-wider text-indigo-950 border-indigo-400 bg-amber-50/20 focus:bg-white"
                  />
                  {barcodeToAssign && (
                    <button
                      type="button"
                      onClick={() => {
                        setBarcodeToAssign('');
                        barcodeInputRef.current?.focus();
                      }}
                      className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="replaceExisting"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="rounded border-gray-300 text-blue-800 focus:ring-blue-800"
                />
                <label htmlFor="replaceExisting" className="text-[11px] text-gray-700 font-semibold cursor-pointer select-none">
                  Replace / Overwrite any existing barcodes for this product (Recommended)
                </label>
              </div>

              {/* Quick Sample Click Buttons */}
              <div className="pt-2 border-t border-gray-200">
                <div className="text-[11px] text-gray-500 font-semibold mb-1.5">
                  Quick Test Barcodes (Click to simulate scan):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Parle-G', code: '8901234567890' },
                    { label: 'Tata Salt', code: '8901030383786' },
                    { label: 'Aachi Chilli', code: '8901725181222' },
                    { label: 'Cinthol Soap', code: '8901023000553' }
                  ].map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => {
                        setBarcodeToAssign(s.code);
                        setScanNotice(`Simulated scan: ${s.code} (${s.label})`);
                        barcodeInputRef.current?.focus();
                      }}
                      className="bg-gray-100 hover:bg-indigo-50 hover:text-indigo-800 border border-gray-300 px-2 py-0.5 rounded text-[10px] font-mono"
                    >
                      {s.label} ({s.code.slice(0, 7)}...)
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !barcodeToAssign.trim()}
                  className="btn-primary text-xs py-1.5 px-4 font-bold disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Saving to MySQL...' : 'Assign to MySQL (Enter)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Barcode Labels Modal */}
      {printModalOpen && printProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl border border-gray-300 overflow-hidden flex flex-col my-auto max-h-[90vh]">
            <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-xs uppercase tracking-wide">
                  Print Barcode Stickers: {printProduct.name}
                </h3>
              </div>
              <button onClick={() => setPrintModalOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Print Controls (Hidden on paper) */}
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 print:hidden">
              <div className="flex items-center gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-0.5">Sheet Layout:</label>
                  <select
                    value={labelLayout}
                    onChange={(e) => {
                      const l = e.target.value;
                      setLabelLayout(l);
                      if (l === 'sheet24') setLabelQuantity(24);
                      else if (l === 'sheet40') setLabelQuantity(40);
                      else setLabelQuantity(10);
                    }}
                    className="form-input text-xs py-1"
                  >
                    <option value="sheet24">A4 Sheet — 24 Labels (3 x 8)</option>
                    <option value="sheet40">A4 Sheet — 40 Labels (4 x 10)</option>
                    <option value="thermal">Thermal Roll — 50mm x 25mm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-0.5">Label Count:</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={labelQuantity}
                    onChange={(e) => setLabelQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="form-input text-xs py-1 w-20 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  className="btn-success text-xs py-2 px-4 font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Labels Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(false)}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  {t('close')}
                </button>
              </div>
            </div>

            {/* Sticker Grid Preview & Printable Content */}
            <div className="flex-1 overflow-auto p-4 bg-gray-200 printable-area">
              <div
                className={`mx-auto bg-white p-3 shadow-md ${
                  labelLayout === 'sheet24'
                    ? 'grid grid-cols-3 gap-2 w-full max-w-2xl'
                    : labelLayout === 'sheet40'
                    ? 'grid grid-cols-4 gap-1.5 w-full max-w-2xl'
                    : 'flex flex-col gap-2 w-52 mx-auto'
                }`}
              >
                {Array.from({ length: labelQuantity }).map((_, i) => (
                  <div
                    key={i}
                    className="border border-dashed border-gray-400 p-2 rounded bg-white flex flex-col items-center justify-between text-center select-none"
                    style={{ minHeight: labelLayout === 'thermal' ? '120px' : '95px' }}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-700 leading-tight">
                      RETAIL BILLING SYSTEM
                    </div>
                    <div className="text-[11px] font-black text-gray-950 truncate max-w-full px-1">
                      {printProduct.name}
                    </div>
                    {printProduct.tamil_name && (
                      <div className="text-[10px] text-gray-600 font-semibold truncate max-w-full leading-none">
                        {printProduct.tamil_name}
                      </div>
                    )}

                    {/* Crisp Vector Barcode SVG */}
                    <div
                      className="my-1 flex justify-center max-w-full overflow-hidden"
                      dangerouslySetInnerHTML={{
                        __html: generateCode128Svg(printProduct.activeBarcode, {
                          height: labelLayout === 'thermal' ? 36 : 28,
                          barWidth: 1.5,
                          showText: true
                        })
                      }}
                    />

                    <div className="w-full flex justify-between items-center px-1 text-[10px] font-bold text-gray-900 border-t border-gray-200 pt-0.5">
                      <span>MRP: ₹{Number(prodPrice(printProduct)).toFixed(2)}</span>
                      <span className="text-[11px] font-black text-blue-900">
                        ₹{Number(printProduct.selling_price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for flawless Sticker Sheet & Thermal Printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-area, .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}

function prodPrice(prod) {
  return prod.mrp && Number(prod.mrp) > 0 ? prod.mrp : prod.selling_price;
}
