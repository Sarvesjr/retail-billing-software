import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { RotateCcw, Plus, Search, Trash2, CheckCircle2, AlertCircle, RefreshCw, X, Receipt, ScanBarcode } from 'lucide-react';
import { SCAN_EVENT } from '../components/BarcodeListener';

export function SalesReturns() {
  const { t, lang } = useI18n();
  const [returns, setReturns] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Return Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saleInvoiceNo, setSaleInvoiceNo] = useState('');
  const [refundMode, setRefundMode] = useState('CASH');
  const [reason, setReason] = useState('Customer Return');
  const [items, setItems] = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const [scannerNotice, setScannerNotice] = useState(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const prodSearchInputRef = useRef(null);
  const lastScanBarcodeRef = useRef('');
  const lastScanTimeRef = useRef(0);
  const isScanningInProgressRef = useRef(false);
  const lastKeyTimeRef = useRef(0);
  const rapidKeyCountRef = useRef(0);
  const rapidScanTimerRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/returns/sales');
      const json = await res.json();
      setReturns(json.data || []);

      const pRes = await api.getProducts({ limit: 200 });
      setProducts(pRes.data || []);
    } catch (err) {
      setErrorMsg('Failed to load sales returns: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addItem = (p) => {
    if (!p) return;
    const prodId = Number(p.id || p.product_id || p.productId);
    const prodName = p.name || p.product_name || p.productName;
    const tamilName = p.tamil_name || p.tamilName || p.product_tamil_name || '';
    const price = Number(p.selling_price || p.sellingPrice || 0);

    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === prodId);
      if (existing) {
        return prev.map((i) => (i.product_id === prodId ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          product_id: prodId,
          product_name: prodName,
          tamil_name: tamilName,
          quantity: 1,
          refund_price: price,
          restocked: true
        }
      ];
    });
    setProdSearch('');
    setTimeout(() => {
      if (prodSearchInputRef.current) prodSearchInputRef.current.focus();
    }, 50);
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((i) => i.product_id !== id));
  };

  // Direct Barcode Scan Processor (Hardware USB + Phone Camera)
  const handleDirectBarcodeScan = async (rawCode, inputSource = 'HARDWARE_USB') => {
    const code = String(rawCode || '').trim();
    if (!code) return;

    const now = Date.now();
    // 1. Strict Cooldown: Ignore duplicate barcode scans within 1200ms
    if (code === lastScanBarcodeRef.current && (now - lastScanTimeRef.current) < 1200) {
      setProdSearch('');
      if (prodSearchInputRef.current) prodSearchInputRef.current.value = '';
      return;
    }

    // 2. Mutex lock
    if (isScanningInProgressRef.current) {
      return;
    }

    lastScanBarcodeRef.current = code;
    lastScanTimeRef.current = now;
    isScanningInProgressRef.current = true;

    setProdSearch('');
    if (prodSearchInputRef.current) prodSearchInputRef.current.value = '';
    setErrorMsg('');

    // Ensure return modal is opened
    setIsModalOpen(true);

    try {
      const barcodeRes = await api.lookupBarcode(code, inputSource);
      if (barcodeRes.found && barcodeRes.product) {
        const prod = barcodeRes.product;
        addItem(prod);
        setScannerNotice({
          success: true,
          text: `Added "${prod.name || prod.product_name}" via ${inputSource}`
        });
        setErrorMsg('');
        return;
      }

      // Fallback: search products by query in MySQL
      const searchRes = await api.getProducts({ search: code, limit: 1 });
      if (searchRes.data && searchRes.data.length > 0) {
        const prod = searchRes.data[0];
        addItem(prod);
        setScannerNotice({
          success: true,
          text: `Added "${prod.name}" via ${inputSource}`
        });
        setErrorMsg('');
        return;
      }

      setScannerNotice({
        success: false,
        text: `Barcode "${code}" not found in MySQL`
      });
      setErrorMsg(`Barcode "${code}" was not found in MySQL database.`);
    } catch (err) {
      console.error('Sales return barcode lookup error:', err);
      setErrorMsg(`Barcode scan failed: ${err.message}`);
    } finally {
      isScanningInProgressRef.current = false;
      setTimeout(() => {
        if (prodSearchInputRef.current) prodSearchInputRef.current.focus();
      }, 50);
    }
  };

  // Real-time Barcode listener from Mobile Phone or USB scanner
  useEffect(() => {
    const handleScanEvent = (e) => {
      const scanData = e.detail;
      if (!scanData || !scanData.barcode) return;
      handleDirectBarcodeScan(scanData.barcode, scanData.inputSource || 'PHONE_CAMERA');
    };

    window.addEventListener(SCAN_EVENT, handleScanEvent);
    return () => window.removeEventListener(SCAN_EVENT, handleScanEvent);
  }, []);

  const handleSearchKeyDown = (e) => {
    const now = Date.now();
    const diff = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    if (diff < 50) {
      rapidKeyCountRef.current += 1;
    } else {
      rapidKeyCountRef.current = 1;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (rapidScanTimerRef.current) clearTimeout(rapidScanTimerRef.current);
      rapidKeyCountRef.current = 0;

      const query = (e.target.value || prodSearch).trim();
      if (!query) return;

      setProdSearch('');
      e.target.value = '';

      handleDirectBarcodeScan(query, 'HARDWARE_USB');
    } else {
      // For hardware USB scanners without an Enter key suffix
      if (rapidScanTimerRef.current) clearTimeout(rapidScanTimerRef.current);
      if (rapidKeyCountRef.current >= 5) {
        rapidScanTimerRef.current = setTimeout(() => {
          const val = (prodSearchInputRef.current?.value || prodSearch).trim();
          if (val && val.length >= 4) {
            rapidKeyCountRef.current = 0;
            handleDirectBarcodeScan(val, 'HARDWARE_USB');
          }
        }, 120);
      }
    }
  };

  const handleOpenAdd = () => {
    setSaleInvoiceNo('');
    setRefundMode('CASH');
    setReason('Customer return / வாடிக்கையாளர் திருப்பம்');
    setItems([]);
    setProdSearch('');
    setErrorMsg('');
    setScannerNotice(null);
    setIsModalOpen(true);
    setTimeout(() => {
      if (prodSearchInputRef.current) prodSearchInputRef.current.focus();
    }, 100);
  };

  const totalRefund = items.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.refund_price)), 0);

  const handleSaveReturn = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      setErrorMsg('Please select at least one item to return');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/returns/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refund_mode: refundMode,
          reason,
          items
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Return failed');

      setSuccessMsg(`Sales return ${data.data.returnNo} processed! Items restocked in MySQL.`);
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Top Header */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-300 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-indigo-700" />
          <h2 className="font-bold text-sm text-gray-900">
            {lang === 'ta' ? 'விற்பனை திருப்பம் (Sales Returns & Restocking)' : 'Sales Returns & Restocking'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-xs font-semibold">
            <ScanBarcode className="w-3.5 h-3.5 text-emerald-600" />
            <span>Barcode Scanner Ready</span>
          </div>
          <button
            onClick={handleOpenAdd}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ta' ? '+ புதிய விற்பனை திருப்பம்' : '+ New Sales Return'}</span>
          </button>
          <button onClick={loadData} className="btn-secondary text-xs p-1.5" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="bg-red-50 text-red-800 text-xs px-4 py-2 border-b border-red-200 flex items-center justify-between">
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
        <div className="bg-emerald-50 text-emerald-800 text-xs px-4 py-2 border-b border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-800">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Returns History Table */}
      <div className="flex-1 overflow-auto p-3">
        <div className="bg-white border border-gray-300 shadow-xs">
          <table className="excel-table text-xs">
            <thead>
              <tr>
                <th className="w-12 text-center">#</th>
                <th>Return No</th>
                <th>Date</th>
                <th>Customer / Invoice</th>
                <th className="text-center">Items</th>
                <th className="text-right">Refund Amount (₹)</th>
                <th className="text-center">Refund Mode</th>
                <th>Return Reason</th>
                <th className="text-center">Stock Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-gray-400">Loading sales returns...</td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-gray-400">
                    No sales returns recorded yet.
                  </td>
                </tr>
              ) : (
                returns.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-blue-50/40">
                    <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                    <td className="font-mono font-bold text-rose-800">{r.return_no}</td>
                    <td className="font-mono text-gray-600">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td>{r.customer_name || r.invoice_no || 'Walk-in Customer'}</td>
                    <td className="text-center font-mono font-bold">{r.item_count || 1}</td>
                    <td className="num-cell font-mono font-bold text-rose-700">₹{Number(r.total_amount).toFixed(2)}</td>
                    <td className="text-center font-semibold text-gray-700">{r.refund_mode}</td>
                    <td className="text-gray-600">{r.reason || '-'}</td>
                    <td className="text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        RESTOCKED TO INVENTORY ✓
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Return Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl border border-gray-300 overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
            <div className="bg-rose-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-300" />
                <h3 className="font-bold text-xs uppercase tracking-wide">
                  Process Customer Sales Return
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-rose-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scanner Info Banner */}
            <div className="bg-rose-50 px-4 py-1.5 border-b border-rose-200 flex items-center justify-between text-xs text-rose-900">
              <div className="flex items-center gap-1.5 font-bold text-[11px]">
                <ScanBarcode className="w-3.5 h-3.5 text-emerald-600" />
                <span>Barcode Scanner Active: Scan items with USB scanner or Phone camera to add</span>
              </div>
              {scannerNotice && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    scannerNotice.success
                      ? 'bg-green-100 text-green-800 border-green-300'
                      : 'bg-red-100 text-red-800 border-red-300'
                  }`}
                >
                  {scannerNotice.text}
                </span>
              )}
            </div>

            <form onSubmit={handleSaveReturn} className="p-4 space-y-3 text-xs flex-1 flex flex-col overflow-hidden">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Refund Mode</label>
                  <select
                    value={refundMode}
                    onChange={(e) => setRefundMode(e.target.value)}
                    className="form-input w-full font-bold"
                  >
                    <option value="CASH">CASH REFUND (ரொக்கம்)</option>
                    <option value="UPI">UPI REFUND</option>
                    <option value="CREDIT_ADJUST">CREDIT / UDHAR ADJUSTMENT</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Return Reason</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="form-input w-full"
                  />
                </div>
              </div>

              {/* Product Search & Barcode Input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  ref={prodSearchInputRef}
                  type="text"
                  placeholder="Scan product barcode or search product name..."
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="form-input pl-9 w-full text-xs font-medium"
                />
                {prodSearch.trim() && !/^\d{5,}$/.test(prodSearch.trim()) && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-40 overflow-y-auto z-50 divide-y divide-gray-100">
                    {products
                      .filter((p) => p.name.toLowerCase().includes(prodSearch.toLowerCase()))
                      .slice(0, 5)
                      .map((p) => (
                        <div
                          key={p.id}
                          onClick={() => addItem(p)}
                          className="p-2 hover:bg-rose-50 cursor-pointer flex justify-between"
                        >
                          <span className="font-bold text-gray-900">{p.name}</span>
                          <span className="font-mono text-gray-600">₹{p.selling_price}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Returned Items Table */}
              <div className="flex-1 overflow-auto border border-gray-200 rounded">
                <table className="excel-table text-xs">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="w-20 text-center">Return Qty</th>
                      <th className="w-24 text-right">Refund Price</th>
                      <th className="w-24 text-center">Restock?</th>
                      <th className="w-10 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-400">
                          Scan barcode or search product above to add to return list.
                        </td>
                      </tr>
                    ) : (
                      items.map((i) => (
                        <tr key={i.product_id}>
                          <td className="font-bold">{i.product_name}</td>
                          <td className="text-center font-mono">
                            <input
                              type="number"
                              min="1"
                              value={i.quantity}
                              onChange={(e) =>
                                setItems(
                                  items.map((it) =>
                                    it.product_id === i.product_id ? { ...it, quantity: Number(e.target.value) } : it
                                  )
                                )
                              }
                              className="form-input text-xs w-16 text-center font-bold"
                            />
                          </td>
                          <td className="text-right font-mono font-bold text-rose-700">₹{i.refund_price}</td>
                          <td className="text-center font-bold text-emerald-700">YES ✓</td>
                          <td className="text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(i.product_id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <div className="font-bold text-gray-700 text-sm">
                  Total Refund: <span className="font-mono text-rose-700 text-base font-black">₹{totalRefund.toFixed(2)}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || items.length === 0}
                    className="btn-primary text-xs py-1.5 px-4 font-bold bg-rose-700 hover:bg-rose-800 disabled:opacity-50"
                  >
                    {submitting ? 'Processing...' : 'Accept Return & Restock'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

