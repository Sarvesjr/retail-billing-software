import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { RotateCcw, Plus, Search, Trash2, CheckCircle2, AlertCircle, RefreshCw, X, Receipt } from 'lucide-react';

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

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleOpenAdd = () => {
    setSaleInvoiceNo('');
    setRefundMode('CASH');
    setReason('Customer return / வாடிக்கையாளர் திருப்பம்');
    setItems([]);
    setProdSearch('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const addItem = (p) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === p.id);
      if (existing) {
        return prev.map((i) => (i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          product_id: p.id,
          product_name: p.name,
          tamil_name: p.tamil_name,
          quantity: 1,
          refund_price: Number(p.selling_price || 0),
          restocked: true
        }
      ];
    });
    setProdSearch('');
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((i) => i.product_id !== id));
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
              <h3 className="font-bold text-xs uppercase tracking-wide">
                Process Customer Sales Return
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-rose-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
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

              {/* Product Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search product to return..."
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  className="form-input pl-9 w-full text-xs"
                />
                {prodSearch.trim() && (
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
                          Search product above to add to return list.
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

