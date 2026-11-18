import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import {
  ArrowLeftRight,
  Plus,
  RefreshCw,
  X,
  Truck,
  ShieldAlert,
  PackageX,
  FileText,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Calendar,
  Layers,
  Search
} from 'lucide-react';

export function PurchaseReturns() {
  const { t, lang } = useI18n();

  // Active view tab inside Purchase Returns
  const [activeSubTab, setActiveSubTab] = useState('all'); // 'all', 'damaged', 'expired', 'history'

  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [damagedItems, setDamagedItems] = useState([]);
  const [expiredProducts, setExpiredProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Supplier Return Modal (Debit Note)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [debitNoteNo, setDebitNoteNo] = useState('');
  const [refundMode, setRefundMode] = useState('SUPPLIER_BALANCE');
  const [reason, setReason] = useState('Damaged / Expired stock return to supplier');
  const [returnItems, setReturnItems] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prRes, deRes, sRes, pRes] = await Promise.all([
        api.getPurchaseReturns(),
        api.getDamagedAndExpiredStock(),
        api.getSuppliers(),
        api.getProducts({ limit: 300 })
      ]);

      setPurchaseReturns(prRes.data || []);
      setDamagedItems(deRes.data?.damagedItems || []);
      setExpiredProducts(deRes.data?.expiredProducts || []);
      setSuppliers(sRes.data || []);
      setProducts(pRes.data || []);
    } catch (err) {
      setErrorMsg('Failed to load purchase returns data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (prefillSupplierId = '', prefillItem = null) => {
    setSelectedSupplierId(prefillSupplierId || (suppliers[0]?.id ? String(suppliers[0].id) : ''));
    setDebitNoteNo(`DN-${Date.now().toString().slice(-6)}`);
    setRefundMode('SUPPLIER_BALANCE');
    setReason('Damaged / Expired stock return to supplier');
    setErrorMsg('');

    if (prefillItem) {
      setReturnItems([
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
      setReturnItems([]);
    }

    setIsModalOpen(true);
  };

  const handleAddProductToReturn = (p) => {
    if (!p) return;
    const prodId = Number(p.id);
    const exists = returnItems.find((it) => it.product_id === prodId);
    if (exists) {
      setReturnItems(
        returnItems.map((it) =>
          it.product_id === prodId ? { ...it, quantity: it.quantity + 1 } : it
        )
      );
      return;
    }

    setReturnItems([
      ...returnItems,
      {
        product_id: prodId,
        product_name: p.name,
        sku: p.sku || '',
        quantity: 1,
        return_price: Number(p.purchase_price || 0),
        is_damaged: Number(p.damaged_stock || 0) > 0,
        damaged_log_id: null
      }
    ]);
  };

  const removeItem = (index) => {
    setReturnItems(returnItems.filter((_, idx) => idx !== index));
  };

  const totalDebitAmount = returnItems.reduce(
    (acc, it) => acc + Number(it.quantity || 0) * Number(it.return_price || 0),
    0
  );

  const handleSavePurchaseReturn = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setErrorMsg('Please select a supplier.');
      return;
    }
    if (returnItems.length === 0) {
      setErrorMsg('Please add at least one item to return.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.createPurchaseReturn({
        supplier_id: Number(selectedSupplierId),
        debit_note_no: debitNoteNo,
        refund_mode: refundMode,
        reason,
        items: returnItems
      });

      setSuccessMsg(`Supplier return ${res.data?.returnNo} processed! Supplier balance/ledger updated.`);
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalDamagedPcs = damagedItems.reduce((acc, it) => acc + Number(it.damaged_quantity || 0), 0);
  const totalExpiredPcs = expiredProducts.reduce((acc, it) => acc + Number(it.current_stock || 0), 0);
  const totalReturnedAmount = purchaseReturns.reduce((acc, pr) => acc + Number(pr.total_amount || 0), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Top Header */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-300 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-amber-700" />
            <h2 className="font-bold text-sm text-gray-900">
              {lang === 'ta'
                ? 'கொள்முதல் திருப்பம் & சேதமடைந்த சரக்கு (Purchase Returns & Debit Notes)'
                : 'Purchase Returns & Supplier Debit Notes'}
            </h2>
          </div>

          {/* Sub-tabs */}
          <div className="hidden md:flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-300 text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('all')}
              className={`px-2.5 py-1 rounded transition ${
                activeSubTab === 'all' ? 'bg-amber-700 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Sections
            </button>
            <button
              onClick={() => setActiveSubTab('damaged')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                activeSubTab === 'damaged' ? 'bg-amber-700 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Quarantined Damaged</span>
              <span className="bg-amber-900/30 px-1.5 rounded-full text-[10px]">{damagedItems.length}</span>
            </button>
            <button
              onClick={() => setActiveSubTab('expired')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                activeSubTab === 'expired' ? 'bg-amber-700 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Expired Stock</span>
              <span className="bg-rose-900/30 px-1.5 rounded-full text-[10px]">{expiredProducts.length}</span>
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                activeSubTab === 'history' ? 'bg-amber-700 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <span>Debit Notes History</span>
              <span className="bg-blue-900/30 px-1.5 rounded-full text-[10px]">{purchaseReturns.length}</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs font-bold bg-amber-700 hover:bg-amber-800"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ta' ? '+ புதிய கொள்முதல் திருப்பம் (Debit Note)' : '+ New Purchase Return (Debit Note)'}</span>
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

      {/* Content Container */}
      <div className="flex-1 overflow-auto p-3 space-y-4">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-amber-50 border border-amber-300 rounded p-3 flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Damaged Stock in Quarantine
              </div>
              <div className="text-2xl font-black text-amber-950 font-mono mt-0.5">
                {totalDamagedPcs} PCS
              </div>
              <div className="text-[11px] text-amber-700">
                {damagedItems.length} product entries awaiting return to supplier
              </div>
            </div>
            <ShieldAlert className="w-8 h-8 text-amber-600 opacity-80" />
          </div>

          <div className="bg-rose-50 border border-rose-300 rounded p-3 flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                Expired Products in Store
              </div>
              <div className="text-2xl font-black text-rose-950 font-mono mt-0.5">
                {totalExpiredPcs} PCS
              </div>
              <div className="text-[11px] text-rose-700">
                {expiredProducts.length} items past expiration date
              </div>
            </div>
            <PackageX className="w-8 h-8 text-rose-600 opacity-80" />
          </div>

          <div className="bg-blue-50 border border-blue-300 rounded p-3 flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
                Total Debit Notes Issued
              </div>
              <div className="text-2xl font-black text-blue-950 font-mono mt-0.5">
                ₹{totalReturnedAmount.toFixed(2)}
              </div>
              <div className="text-[11px] text-blue-700">
                {purchaseReturns.length} purchase returns processed
              </div>
            </div>
            <FileText className="w-8 h-8 text-blue-600 opacity-80" />
          </div>
        </div>

        {/* Section 1: Damaged Goods Quarantined */}
        {(activeSubTab === 'all' || activeSubTab === 'damaged') && (
          <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
            <div className="bg-amber-100/70 px-3 py-2 border-b border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-800" />
                <h3 className="font-bold text-xs text-amber-900 uppercase tracking-wide">
                  1. Damaged Goods Quarantined (Awaiting Supplier Return / மாற்ற வேண்டிய சேதமடைந்த சரக்கு)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-amber-800">
                Quarantined in MySQL & cannot be sold at billing counter
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="excel-table text-xs">
                <thead>
                  <tr>
                    <th className="w-10 text-center">#</th>
                    <th>Product Name</th>
                    <th>Supplier Details</th>
                    <th className="text-center">Damaged Qty</th>
                    <th>Damage Reason</th>
                    <th className="text-center">Entry Source</th>
                    <th className="text-center">Expiry Date</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="text-center py-6 text-gray-400">Loading damaged items...</td>
                    </tr>
                  ) : damagedItems.length === 0 ? (
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
                          <div className="font-semibold text-gray-800">{item.supplier_name || 'No Assigned Supplier'}</div>
                          {item.supplier_tamil_name && <div className="text-[10px] text-gray-500">{item.supplier_tamil_name}</div>}
                        </td>
                        <td className="text-center font-mono font-black text-amber-900 bg-amber-50/50">
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
                            onClick={() => handleOpenModal(item.supplier_id ? String(item.supplier_id) : '', item)}
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
        )}

        {/* Section 2: Expired Products in Store */}
        {(activeSubTab === 'all' || activeSubTab === 'expired') && (
          <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
            <div className="bg-rose-100/70 px-3 py-2 border-b border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageX className="w-4 h-4 text-rose-800" />
                <h3 className="font-bold text-xs text-rose-900 uppercase tracking-wide">
                  2. Expired Products in Store (காலாவதியான பொருட்கள்)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-rose-800">
                Past expiration date — return to supplier via Debit Note
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="excel-table text-xs">
                <thead>
                  <tr>
                    <th className="w-10 text-center">#</th>
                    <th>Product Name</th>
                    <th>Supplier Details</th>
                    <th className="text-center">Current Stock</th>
                    <th className="text-center">Expiry Date</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-gray-400">Loading expired stock...</td>
                    </tr>
                  ) : expiredProducts.length === 0 ? (
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
                          <div className="font-semibold text-gray-800">{p.supplier_name || 'No Assigned Supplier'}</div>
                          {p.supplier_tamil_name && <div className="text-[10px] text-gray-500">{p.supplier_tamil_name}</div>}
                        </td>
                        <td className="text-center font-mono font-black text-rose-900 bg-rose-50/50">
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
                            onClick={() => handleOpenModal(p.supplier_id ? String(p.supplier_id) : '', p)}
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
        )}

        {/* Section 3: Completed Purchase Returns History */}
        {(activeSubTab === 'all' || activeSubTab === 'history') && (
          <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-700" />
                <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wide">
                  3. Purchase Returns & Debit Notes History (சப்ளையர் திருப்பப் பதிவுகள்)
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
                    <th>Supplier Name</th>
                    <th>Date</th>
                    <th className="text-center">Items Count</th>
                    <th className="text-right">Total Debit Amount</th>
                    <th>Reason</th>
                    <th className="text-center">Ledger Adjustment</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="text-center py-6 text-gray-400">Loading purchase returns...</td>
                    </tr>
                  ) : purchaseReturns.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-6 text-gray-400">
                        No purchase returns recorded yet.
                      </td>
                    </tr>
                  ) : (
                    purchaseReturns.map((pr, idx) => (
                      <tr key={pr.id} className="hover:bg-blue-50/40">
                        <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                        <td className="font-mono font-bold text-amber-800">{pr.return_no}</td>
                        <td className="font-mono font-semibold text-gray-700">{pr.debit_note_no || '-'}</td>
                        <td className="font-bold text-gray-900">{pr.supplier_name}</td>
                        <td className="font-mono text-gray-600">{new Date(pr.created_at).toLocaleDateString()}</td>
                        <td className="text-center font-mono font-bold">{pr.item_count || 1}</td>
                        <td className="num-cell font-mono font-bold text-amber-900">
                          ₹{Number(pr.total_amount).toFixed(2)}
                        </td>
                        <td className="text-gray-600">{pr.reason || 'Damaged/Expired Stock'}</td>
                        <td className="text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                            SUPPLIER LEDGER DEDUCTED ✓
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
      </div>

      {/* MODAL: CREATE SUPPLIER RETURN (DEBIT NOTE) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl border border-gray-300 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            <div className="bg-amber-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-xs uppercase tracking-wide">
                  Create Supplier Return (Debit Note) / சப்ளையருக்கு சரக்கு அனுப்புதல்
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-amber-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePurchaseReturn} className="p-4 space-y-3 text-xs flex-1 flex flex-col overflow-hidden">
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
                    value={refundMode}
                    onChange={(e) => setRefundMode(e.target.value)}
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
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
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
                      if (p) handleAddProductToReturn(p);
                      e.target.value = '';
                    }}
                    className="form-input flex-1 text-xs"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Select a product to add to return items --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.sku ? `(${p.sku})` : ''} - Cost: ₹{p.purchase_price} | Damaged Stock: {p.damaged_stock || 0} | Salable Stock: {p.current_stock || 0}
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
                    {returnItems.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-8 text-gray-400">
                          No items added yet. Select a product above or click "Return to Supplier" from the tables.
                        </td>
                      </tr>
                    ) : (
                      returnItems.map((it, idx) => (
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
                                setReturnItems(
                                  returnItems.map((item, i) =>
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
                                setReturnItems(
                                  returnItems.map((item, i) =>
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
                              onClick={() => removeItem(idx)}
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
                    ₹{totalDebitAmount.toFixed(2)}
                  </span>
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
                    disabled={submitting || returnItems.length === 0}
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
