import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import {
  RotateCcw,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ScanBarcode,
  Truck,
  AlertTriangle,
  PackageX,
  FileText,
  Calendar,
  Layers,
  ShieldAlert
} from 'lucide-react';
import { SCAN_EVENT } from '../components/BarcodeListener';

export function SalesReturns() {
  const { t, lang } = useI18n();

  // Active Tab: 'customer' (Sales Returns) or 'supplier' (Damaged & Expired Returns to Supplier)
  const [activeTab, setActiveTab] = useState('customer');

  // Customer Sales Returns State
  const [returns, setReturns] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Supplier Returns & Quarantined Damaged/Expired Stock State
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [damagedItems, setDamagedItems] = useState([]);
  const [expiredProducts, setExpiredProducts] = useState([]);
  const [loadingSupplierData, setLoadingSupplierData] = useState(false);

  // New Customer Return Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [refundMode, setRefundMode] = useState('CASH');
  const [reason, setReason] = useState('Customer Return');
  const [items, setItems] = useState([]);
  const [prodSearch, setProdSearch] = useState('');
  const [scannerNotice, setScannerNotice] = useState(null);

  // New Supplier Return Modal (Debit Note)
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [debitNoteNo, setDebitNoteNo] = useState('');
  const [supplierRefundMode, setSupplierRefundMode] = useState('SUPPLIER_BALANCE');
  const [supplierReturnReason, setSupplierReturnReason] = useState('Damaged / Expired stock return to supplier');
  const [supplierReturnItems, setSupplierReturnItems] = useState([]);

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
      const res = await api.getSalesReturns();
      setReturns(res.data || []);

      const pRes = await api.getProducts({ limit: 300 });
      setProducts(pRes.data || []);

      const sRes = await api.getSuppliers();
      setSuppliers(sRes.data || []);
    } catch (err) {
      setErrorMsg('Failed to load returns data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierReturnsData = async () => {
    setLoadingSupplierData(true);
    try {
      const prRes = await api.getPurchaseReturns();
      setPurchaseReturns(prRes.data || []);

      const deRes = await api.getDamagedAndExpiredStock();
      setDamagedItems(deRes.data?.damagedItems || []);
      setExpiredProducts(deRes.data?.expiredProducts || []);
    } catch (err) {
      setErrorMsg('Failed to load supplier returns data: ' + err.message);
    } finally {
      setLoadingSupplierData(false);
    }
  };

  useEffect(() => {
    loadData();
    loadSupplierReturnsData();
  }, []);

  // ----------------------------------------------------
  // Customer Returns Logic
  // ----------------------------------------------------
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
          restocked: true,
          is_damaged: false
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

  // Direct Barcode Scan Processor
  const handleDirectBarcodeScan = async (rawCode, inputSource = 'HARDWARE_USB') => {
    const code = String(rawCode || '').trim();
    if (!code) return;

    const now = Date.now();
    if (code === lastScanBarcodeRef.current && now - lastScanTimeRef.current < 1200) {
      setProdSearch('');
      if (prodSearchInputRef.current) prodSearchInputRef.current.value = '';
      return;
    }

    if (isScanningInProgressRef.current) return;

    lastScanBarcodeRef.current = code;
    lastScanTimeRef.current = now;
    isScanningInProgressRef.current = true;

    setProdSearch('');
    if (prodSearchInputRef.current) prodSearchInputRef.current.value = '';
    setErrorMsg('');

    setIsCustomerModalOpen(true);

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
      setErrorMsg(`Barcode "${code}" was not found in database.`);
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

  const handleOpenAddCustomerReturn = () => {
    setRefundMode('CASH');
    setReason('Customer return / வாடிக்கையாளர் திருப்பம்');
    setItems([]);
    setProdSearch('');
    setErrorMsg('');
    setScannerNotice(null);
    setIsCustomerModalOpen(true);
    setTimeout(() => {
      if (prodSearchInputRef.current) prodSearchInputRef.current.focus();
    }, 100);
  };

  const totalRefund = items.reduce((acc, i) => acc + Number(i.quantity) * Number(i.refund_price), 0);

  const handleSaveCustomerReturn = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      setErrorMsg('Please select at least one item to return');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.createSalesReturn({
        refund_mode: refundMode,
        reason,
        items
      });
      const data = res.data;
      setSuccessMsg(`Sales return ${data.returnNo} processed! Items restocked/quarantined in MySQL.`);
      setIsCustomerModalOpen(false);
      loadData();
      loadSupplierReturnsData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // Supplier Returns (Damaged / Expired Goods) Logic
  // ----------------------------------------------------
  const handleOpenSupplierReturnModal = (prefillSupplierId = '', prefillItem = null) => {
    setSelectedSupplierId(prefillSupplierId || (suppliers[0]?.id ? String(suppliers[0].id) : ''));
    setDebitNoteNo(`DN-${Date.now().toString().slice(-6)}`);
    setSupplierRefundMode('SUPPLIER_BALANCE');
    setSupplierReturnReason('Damaged / Expired stock return to supplier');
    setErrorMsg('');

    if (prefillItem) {
      setSupplierReturnItems([
        {
          product_id: prefillItem.product_id,
          product_name: prefillItem.product_name,
          sku: prefillItem.sku || '',
          quantity: prefillItem.damaged_quantity || prefillItem.current_stock || 1,
          return_price: Number(prefillItem.purchase_price || 0),
          is_damaged: Boolean(prefillItem.damaged_quantity !== undefined),
          damaged_log_id: prefillItem.id || null
        }
      ]);
    } else {
      setSupplierReturnItems([]);
    }

    setIsSupplierModalOpen(true);
  };

  const handleAddSupplierItemFromProduct = (p) => {
    if (!p) return;
    const prodId = Number(p.id);
    const exists = supplierReturnItems.find((it) => it.product_id === prodId);
    if (exists) {
      setSupplierReturnItems(
        supplierReturnItems.map((it) =>
          it.product_id === prodId ? { ...it, quantity: it.quantity + 1 } : it
        )
      );
      return;
    }
    setSupplierReturnItems([
      ...supplierReturnItems,
      {
        product_id: prodId,
        product_name: p.name,
        sku: p.sku,
        quantity: 1,
        return_price: Number(p.purchase_price || 0),
        is_damaged: Number(p.damaged_stock) > 0,
        damaged_log_id: null
      }
    ]);
  };

  const handleSaveSupplierReturn = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setErrorMsg('Please select a supplier for this return.');
      return;
    }
    if (supplierReturnItems.length === 0) {
      setErrorMsg('Please add at least one item to return to supplier.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.createPurchaseReturn({
        supplier_id: Number(selectedSupplierId),
        debit_note_no: debitNoteNo,
        refund_mode: supplierRefundMode,
        reason: supplierReturnReason,
        items: supplierReturnItems
      });

      setSuccessMsg(`Supplier return ${res.data?.returnNo} processed! Supplier ledger adjusted.`);
      setIsSupplierModalOpen(false);
      loadSupplierReturnsData();
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalSupplierRefund = supplierReturnItems.reduce(
    (acc, it) => acc + Number(it.quantity) * Number(it.return_price),
    0
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Top Header */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-300 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-indigo-700" />
            <h2 className="font-bold text-sm text-gray-900">
              {lang === 'ta' ? 'திருப்பங்கள் & இருப்பு மேலாண்மை (Returns)' : 'Returns & Stock Management'}
            </h2>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-300 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('customer')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'customer'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? 'வாடிக்கையாளர் விற்பனை திருப்பம்' : 'Customer Sales Returns'}</span>
              <span className="bg-white/20 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                {returns.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('supplier')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'supplier'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? 'சப்ளையர் சேதமடைந்த / காலாவதியான சரக்கு' : 'Supplier Returns (Damaged / Expired)'}</span>
              {(damagedItems.length > 0 || expiredProducts.length > 0) && (
                <span className="bg-amber-400 text-amber-950 font-black px-1.5 py-0.2 rounded-full text-[10px]">
                  {damagedItems.length + expiredProducts.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === 'customer' ? (
            <>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded text-xs font-semibold">
                <ScanBarcode className="w-3.5 h-3.5 text-emerald-600" />
                <span>Barcode Scanner Ready</span>
              </div>
              <button
                onClick={handleOpenAddCustomerReturn}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs font-bold bg-rose-700 hover:bg-rose-800"
              >
                <Plus className="w-4 h-4" />
                <span>{lang === 'ta' ? '+ புதிய விற்பனை திருப்பம்' : '+ New Customer Return'}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => handleOpenSupplierReturnModal()}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs font-bold bg-amber-700 hover:bg-amber-800"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'ta' ? '+ சப்ளையருக்கு சரக்கு அனுப்பு (Debit Note)' : '+ New Supplier Return (Debit Note)'}</span>
            </button>
          )}

          <button
            onClick={() => {
              loadData();
              loadSupplierReturnsData();
            }}
            className="btn-secondary text-xs p-1.5"
            title="Refresh"
          >
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

      {/* -------------------------------------------------------------------------------------- */}
      {/* TAB 1: CUSTOMER SALES RETURNS TABLE */}
      {/* -------------------------------------------------------------------------------------- */}
      {activeTab === 'customer' && (
        <div className="flex-1 overflow-auto p-3">
          <div className="bg-white border border-gray-300 shadow-xs rounded-xs">
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
                      No customer sales returns recorded yet.
                    </td>
                  </tr>
                ) : (
                  returns.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-rose-50/40">
                      <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                      <td className="font-mono font-bold text-rose-800">{r.return_no}</td>
                      <td className="font-mono text-gray-600">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td>{r.customer_name || r.invoice_no || 'Walk-in Customer'}</td>
                      <td className="text-center font-mono font-bold">{r.item_count || 1}</td>
                      <td className="num-cell font-mono font-bold text-rose-700">₹{Number(r.total_amount).toFixed(2)}</td>
                      <td className="text-center font-semibold text-gray-700">{r.refund_mode}</td>
                      <td className="text-gray-600">{r.reason || '-'}</td>
                      <td className="text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          PROCESSED IN MYSQL ✓
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* TAB 2: SUPPLIER RETURNS (DAMAGED & EXPIRED STOCK) */}
      {/* -------------------------------------------------------------------------------------- */}
      {activeTab === 'supplier' && (
        <div className="flex-1 overflow-auto p-3 space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-amber-50 border border-amber-300 rounded p-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                  Damaged Goods in Quarantine
                </div>
                <div className="text-2xl font-black text-amber-950 font-mono mt-0.5">
                  {damagedItems.reduce((acc, it) => acc + Number(it.damaged_quantity || 0), 0)} PCS
                </div>
                <div className="text-[11px] text-amber-700">
                  {damagedItems.length} product entries awaiting return to supplier
                </div>
              </div>
              <ShieldAlert className="w-8 h-8 text-amber-600 opacity-80" />
            </div>

            <div className="bg-rose-50 border border-rose-300 rounded p-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                  Expired Products in Store
                </div>
                <div className="text-2xl font-black text-rose-950 font-mono mt-0.5">
                  {expiredProducts.reduce((acc, it) => acc + Number(it.current_stock || 0), 0)} PCS
                </div>
                <div className="text-[11px] text-rose-700">
                  {expiredProducts.length} items past expiration date
                </div>
              </div>
              <PackageX className="w-8 h-8 text-rose-600 opacity-80" />
            </div>

            <div className="bg-blue-50 border border-blue-300 rounded p-3 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                  Supplier Returns Processed
                </div>
                <div className="text-2xl font-black text-blue-950 font-mono mt-0.5">
                  ₹{purchaseReturns.reduce((acc, pr) => acc + Number(pr.total_amount || 0), 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-blue-700">
                  {purchaseReturns.length} debit notes recorded
                </div>
              </div>
              <FileText className="w-8 h-8 text-blue-600 opacity-80" />
            </div>
          </div>

          {/* Section A: Damaged Goods Awaiting Supplier Return */}
          <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
            <div className="bg-amber-100/70 px-3 py-2 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-800" />
                <h3 className="font-bold text-xs text-amber-900 uppercase tracking-wide">
                  1. Damaged Goods Quarantined (Awaiting Supplier Return / மாற்ற வேண்டிய சேதமடைந்த சரக்கு)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-amber-800">
                These are isolated and CANNOT be sold at billing counter
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="excel-table text-xs">
                <thead>
                  <tr>
                    <th className="w-10 text-center">#</th>
                    <th>Product</th>
                    <th>Supplier Details</th>
                    <th className="text-center">Damaged Qty</th>
                    <th>Damage Reason</th>
                    <th className="text-center">Source</th>
                    <th className="text-center">Expiry Date</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {damagedItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-6 text-gray-400">
                        No quarantined damaged goods awaiting return.
                      </td>
                    </tr>
                  ) : (
                    damagedItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-amber-50/50">
                        <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                        <td>
                          <div className="font-bold text-gray-900">{item.product_name}</div>
                          {item.sku && <div className="text-[10px] font-mono text-gray-500">SKU: {item.sku}</div>}
                        </td>
                        <td>
                          <div className="font-semibold text-gray-800">
                            {item.supplier_name || 'No Assigned Supplier'}
                          </div>
                          {item.supplier_tamil_name && (
                            <div className="text-[10px] text-gray-500">{item.supplier_tamil_name}</div>
                          )}
                        </td>
                        <td className="text-center font-mono font-black text-amber-800 bg-amber-50/50">
                          {item.damaged_quantity} PCS
                        </td>
                        <td className="text-gray-700">{item.damage_reason || 'Defective / Damaged'}</td>
                        <td className="text-center">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                            {item.source}
                          </span>
                        </td>
                        <td className="text-center font-mono text-gray-600">
                          {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenSupplierReturnModal(item.supplier_id ? String(item.supplier_id) : '', item)}
                            className="btn-primary text-[11px] py-1 px-2.5 bg-amber-700 hover:bg-amber-800 font-bold flex items-center gap-1 mx-auto"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Return to Supplier</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: Expired Products in Store */}
          <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
            <div className="bg-rose-100/70 px-3 py-2 border-b border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageX className="w-4 h-4 text-rose-800" />
                <h3 className="font-bold text-xs text-rose-900 uppercase tracking-wide">
                  2. Expired Products in Store (காலாவதியான பொருட்கள்)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-rose-800">
                Expired stock that should be cleared via Debit Note
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="excel-table text-xs">
                <thead>
                  <tr>
                    <th className="w-10 text-center">#</th>
                    <th>Product</th>
                    <th>Supplier Details</th>
                    <th className="text-center">Current Stock</th>
                    <th className="text-center">Expiry Date</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expiredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-gray-400">
                        No expired products currently in store.
                      </td>
                    </tr>
                  ) : (
                    expiredProducts.map((p, idx) => (
                      <tr key={p.product_id} className="hover:bg-rose-50/50">
                        <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                        <td>
                          <div className="font-bold text-gray-900">{p.product_name}</div>
                          {p.sku && <div className="text-[10px] font-mono text-gray-500">SKU: {p.sku}</div>}
                        </td>
                        <td>
                          <div className="font-semibold text-gray-800">
                            {p.supplier_name || 'No Assigned Supplier'}
                          </div>
                          {p.supplier_tamil_name && (
                            <div className="text-[10px] text-gray-500">{p.supplier_tamil_name}</div>
                          )}
                        </td>
                        <td className="text-center font-mono font-black text-rose-800 bg-rose-50/50">
                          {p.current_stock} PCS
                        </td>
                        <td className="text-center font-mono font-bold text-rose-700">
                          {new Date(p.expiry_date).toLocaleDateString()}
                        </td>
                        <td className="text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-200 text-rose-900">
                            EXPIRED ({Math.abs(p.days_to_expiry)}d ago)
                          </span>
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenSupplierReturnModal(p.supplier_id ? String(p.supplier_id) : '', p)}
                            className="btn-primary text-[11px] py-1 px-2.5 bg-rose-700 hover:bg-rose-800 font-bold flex items-center gap-1 mx-auto"
                          >
                            <Truck className="w-3 h-3" />
                            <span>Return to Supplier</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section C: Completed Supplier Returns (Debit Notes) */}
          <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-700" />
                <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wide">
                  3. Supplier Returns History & Debit Notes (சப்ளையர் திருப்பப் பதிவுகள்)
                </h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="excel-table text-xs">
                <thead>
                  <tr>
                    <th className="w-10 text-center">#</th>
                    <th>Return No</th>
                    <th>Debit Note No</th>
                    <th>Supplier</th>
                    <th>Date</th>
                    <th className="text-center">Items Count</th>
                    <th className="text-right">Total Debit Amount</th>
                    <th>Reason</th>
                    <th className="text-center">Ledger Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseReturns.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-6 text-gray-400">
                        No supplier returns recorded yet.
                      </td>
                    </tr>
                  ) : (
                    purchaseReturns.map((pr, idx) => (
                      <tr key={pr.id} className="hover:bg-blue-50/40">
                        <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                        <td className="font-mono font-bold text-blue-800">{pr.return_no}</td>
                        <td className="font-mono font-semibold text-gray-700">{pr.debit_note_no || '-'}</td>
                        <td className="font-bold text-gray-900">{pr.supplier_name}</td>
                        <td className="font-mono text-gray-600">{new Date(pr.created_at).toLocaleDateString()}</td>
                        <td className="text-center font-mono font-bold">{pr.item_count || 1}</td>
                        <td className="num-cell font-mono font-bold text-blue-900">
                          ₹{Number(pr.total_amount).toFixed(2)}
                        </td>
                        <td className="text-gray-600">{pr.reason || 'Damaged/Expired Stock'}</td>
                        <td className="text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            BALANCE ADJUSTED ✓
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* MODAL 1: NEW CUSTOMER SALES RETURN MODAL */}
      {/* -------------------------------------------------------------------------------------- */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl border border-gray-300 overflow-hidden animate-fade-in flex flex-col max-h-[85vh]">
            <div className="bg-rose-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-300" />
                <h3 className="font-bold text-xs uppercase tracking-wide">
                  Process Customer Sales Return
                </h3>
              </div>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-rose-200 hover:text-white">
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

            <form onSubmit={handleSaveCustomerReturn} className="p-4 space-y-3 text-xs flex-1 flex flex-col overflow-hidden">
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
                      <th className="w-24 text-center">Damaged / Defect?</th>
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
                          <td className="text-center">
                            <label className="inline-flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={i.is_damaged || false}
                                onChange={(e) =>
                                  setItems(
                                    items.map((it) =>
                                      it.product_id === i.product_id
                                        ? { ...it, is_damaged: e.target.checked, restocked: !e.target.checked }
                                        : it
                                    )
                                  )
                                }
                                className="rounded text-rose-600 focus:ring-rose-500"
                              />
                              <span className={`text-[10px] font-bold ${i.is_damaged ? 'text-amber-700' : 'text-gray-500'}`}>
                                {i.is_damaged ? 'Quarantine Damaged' : 'Safe to Resell'}
                              </span>
                            </label>
                          </td>
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
                    onClick={() => setIsCustomerModalOpen(false)}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || items.length === 0}
                    className="btn-primary text-xs py-1.5 px-4 font-bold bg-rose-700 hover:bg-rose-800 disabled:opacity-50"
                  >
                    {submitting ? 'Processing...' : 'Accept Return & Update Stock'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------------- */}
      {/* MODAL 2: NEW SUPPLIER RETURN / DEBIT NOTE MODAL */}
      {/* -------------------------------------------------------------------------------------- */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl border border-gray-300 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-amber-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-xs uppercase tracking-wide">
                  Create Supplier Return (Debit Note) / சப்ளையருக்கு சரக்கு அனுப்புதல்
                </h3>
              </div>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-amber-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplierReturn} className="p-4 space-y-3 text-xs flex-1 flex flex-col overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Select Supplier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="form-input w-full font-bold"
                    required
                  >
                    <option value="">-- Choose Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.tamil_name ? `(${s.tamil_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Debit Note No</label>
                  <input
                    type="text"
                    value={debitNoteNo}
                    onChange={(e) => setDebitNoteNo(e.target.value)}
                    className="form-input w-full font-mono font-bold"
                    placeholder="e.g. DN-1002"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Adjustment Type</label>
                  <select
                    value={supplierRefundMode}
                    onChange={(e) => setSupplierRefundMode(e.target.value)}
                    className="form-input w-full font-semibold"
                  >
                    <option value="SUPPLIER_BALANCE">Deduct from Supplier Balance / Ledger</option>
                    <option value="CASH">Cash Refund from Supplier</option>
                    <option value="BANK">Bank Transfer from Supplier</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Return Reason / Note</label>
                <input
                  type="text"
                  value={supplierReturnReason}
                  onChange={(e) => setSupplierReturnReason(e.target.value)}
                  className="form-input w-full"
                  placeholder="e.g. Damaged products received / Expired stock return"
                />
              </div>

              {/* Add item to return */}
              <div className="border border-amber-200 bg-amber-50/50 p-2.5 rounded">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-amber-950 text-[11px] uppercase tracking-wide">
                    Add Product to Return:
                  </span>
                  <span className="text-[10px] text-amber-800">
                    Quick-pick from products list
                  </span>
                </div>
                <div className="flex gap-2">
                  <select
                    onChange={(e) => {
                      const p = products.find((prod) => String(prod.id) === e.target.value);
                      if (p) handleAddSupplierItemFromProduct(p);
                      e.target.value = '';
                    }}
                    className="form-input flex-1 text-xs"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Select a product to add to return items --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.sku ? `(${p.sku})` : ''} - Cost: ₹{p.purchase_price} | Damaged Stock: {p.damaged_stock || 0}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Return Items Table */}
              <div className="flex-1 overflow-auto border border-gray-200 rounded">
                <table className="excel-table text-xs">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th className="w-20 text-center">Return Qty</th>
                      <th className="w-28 text-right">Unit Price (₹)</th>
                      <th className="w-28 text-right">Line Total (₹)</th>
                      <th className="w-28 text-center">Stock Origin</th>
                      <th className="w-10 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierReturnItems.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-gray-400">
                          No items added yet. Select a product above or click "Return to Supplier" from the tables.
                        </td>
                      </tr>
                    ) : (
                      supplierReturnItems.map((it, idx) => (
                        <tr key={it.product_id || idx}>
                          <td>
                            <div className="font-bold">{it.product_name}</div>
                            {it.sku && <div className="text-[10px] font-mono text-gray-500">SKU: {it.sku}</div>}
                          </td>
                          <td className="text-center font-mono">
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) =>
                                setSupplierReturnItems(
                                  supplierReturnItems.map((item, i) =>
                                    i === idx ? { ...item, quantity: Number(e.target.value) } : item
                                  )
                                )
                              }
                              className="form-input text-xs w-16 text-center font-bold"
                            />
                          </td>
                          <td className="text-right font-mono">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={it.return_price}
                              onChange={(e) =>
                                setSupplierReturnItems(
                                  supplierReturnItems.map((item, i) =>
                                    i === idx ? { ...item, return_price: Number(e.target.value) } : item
                                  )
                                )
                              }
                              className="form-input text-xs w-24 text-right font-bold"
                            />
                          </td>
                          <td className="text-right font-mono font-bold text-amber-900">
                            ₹{(Number(it.quantity) * Number(it.return_price)).toFixed(2)}
                          </td>
                          <td className="text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                it.is_damaged
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-rose-100 text-rose-900 border border-rose-300'
                              }`}
                            >
                              {it.is_damaged ? 'Quarantined Damaged' : 'Store Stock (Expired)'}
                            </span>
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setSupplierReturnItems(supplierReturnItems.filter((_, i) => i !== idx))
                              }
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
                  Total Debit Amount:{' '}
                  <span className="font-mono text-amber-800 text-base font-black">
                    ₹{totalSupplierRefund.toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSupplierModalOpen(false)}
                    className="btn-secondary text-xs py-1.5 px-3"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || supplierReturnItems.length === 0}
                    className="btn-primary text-xs py-1.5 px-4 font-bold bg-amber-700 hover:bg-amber-800 disabled:opacity-50"
                  >
                    {submitting ? 'Generating Debit Note...' : 'Issue Debit Note & Return'}
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
