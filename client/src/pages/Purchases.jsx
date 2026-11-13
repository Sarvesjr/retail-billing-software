import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { Truck, Plus, Search, Trash2, Printer, CheckCircle2, AlertCircle, RefreshCw, X, Receipt } from 'lucide-react';

export function Purchases() {
  const { t, lang } = useI18n();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Purchase Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [notes, setNotes] = useState('');

  // Line items
  const [items, setItems] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [itemSuggestions, setItemSuggestions] = useState([]);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [purRes, supRes, prodRes] = await Promise.all([
        api.getPurchases(),
        api.getSuppliers(),
        api.getProducts({ limit: 200 })
      ]);
      setPurchases(purRes.data || []);
      setSuppliers(supRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      setErrorMsg('Failed to load purchase records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenNewPurchase = () => {
    setSelectedSupplierId(suppliers.length > 0 ? String(suppliers[0].id) : '');
    setSupplierInvoiceNo('');
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setPaymentMode('CASH');
    setPaidAmount('');
    setNotes('');
    setItems([]);
    setItemSearch('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const addItemToPurchase = (prod) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === prod.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === prod.id
            ? { ...i, quantity: i.quantity + 1, line_total: (i.quantity + 1) * i.purchase_price }
            : i
        );
      }
      return [
        ...prev,
        {
          product_id: prod.id,
          product_name: prod.name,
          tamil_name: prod.tamil_name,
          sku: prod.sku,
          unit_code: prod.unit_code || 'PCS',
          quantity: 10,
          purchase_price: Number(prod.purchase_price || 0),
          gst_rate: Number(prod.gst_rate || 0),
          line_total: 10 * Number(prod.purchase_price || 0)
        }
      ];
    });
    setItemSearch('');
    setItemSuggestions([]);
  };

  const updateItem = (productId, field, value) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.product_id === productId) {
          const updated = { ...i, [field]: value };
          const qty = Number(updated.quantity) || 0;
          const price = Number(updated.purchase_price) || 0;
          updated.line_total = qty * price;
          return updated;
        }
        return i;
      })
    );
  };

  const removeItem = (productId) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const subtotal = items.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.purchase_price)), 0);
  const taxTotal = items.reduce((acc, i) => acc + ((Number(i.quantity) * Number(i.purchase_price) * Number(i.gst_rate)) / 100), 0);
  const grandTotal = subtotal + taxTotal;

  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setErrorMsg('Please select a supplier');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('Add at least one product to the purchase order');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        supplier_id: Number(selectedSupplierId),
        supplier_invoice_no: supplierInvoiceNo,
        purchase_date: purchaseDate,
        payment_mode: paymentMode,
        paid_amount: paidAmount ? Number(paidAmount) : grandTotal,
        notes,
        items
      };

      const res = await api.createPurchase(payload);
      setSuccessMsg(`Purchase ${res.data.purchaseNo} received! Stock automatically increased in MySQL.`);
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
          <Truck className="w-5 h-5 text-indigo-700" />
          <h2 className="font-bold text-sm text-gray-900">
            {lang === 'ta' ? 'சரக்கு கொள்முதல் மேலாண்மை (Purchases & Stock Inward)' : 'Purchases & Inward Stock Management'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNewPurchase}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ta' ? '+ புதிய கொள்முதல் பில் (Stock Inward)' : '+ New Purchase Bill'}</span>
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

      {/* Purchases History Table */}
      <div className="flex-1 overflow-auto p-3">
        <div className="bg-white border border-gray-300 shadow-xs">
          <table className="excel-table text-xs">
            <thead>
              <tr>
                <th className="w-12 text-center">#</th>
                <th>Purchase No</th>
                <th>Supplier Bill No</th>
                <th>Supplier (வழங்குநர்)</th>
                <th>Date</th>
                <th className="text-center">Items</th>
                <th className="text-right">Total (₹)</th>
                <th className="text-right">Paid (₹)</th>
                <th className="text-center">Payment Status</th>
                <th className="text-center">Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-gray-400">Loading purchase records...</td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-gray-400">
                    No purchase bills recorded yet. Click &quot;+ New Purchase Bill&quot; to add incoming stock.
                  </td>
                </tr>
              ) : (
                purchases.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-blue-50/40">
                    <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                    <td className="font-mono font-bold text-blue-900">{p.purchase_no}</td>
                    <td className="font-mono text-gray-700">{p.supplier_invoice_no || '-'}</td>
                    <td>
                      <div className="font-bold text-gray-900">{p.supplier_name}</div>
                      {p.supplier_tamil_name && <div className="text-gray-500 text-[11px]">{p.supplier_tamil_name}</div>}
                    </td>
                    <td className="font-mono text-gray-600">
                      {new Date(p.purchase_date).toLocaleDateString()}
                    </td>
                    <td className="text-center font-mono font-bold text-indigo-700">{p.item_count || 1}</td>
                    <td className="num-cell font-bold text-gray-900">₹{Number(p.grand_total).toFixed(2)}</td>
                    <td className="num-cell text-emerald-800 font-bold">₹{Number(p.paid_amount).toFixed(2)}</td>
                    <td className="text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.payment_status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.payment_status === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900">
                        ADDED TO STOCK ✓
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl border border-gray-300 overflow-hidden flex flex-col my-auto max-h-[92vh]">
            <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-300" />
                <h3 className="font-bold text-xs uppercase tracking-wide">
                  New Inward Purchase Bill (சரக்கு கொள்முதல் பதிவு)
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="flex-1 flex flex-col overflow-hidden">
              {/* Header Fields */}
              <div className="p-3 bg-gray-50 border-b border-gray-200 grid grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Supplier (வழங்குநர்) *</label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="form-input w-full"
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.tamil_name ? `(${s.tamil_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Supplier Bill / Inv No</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-9843"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    className="form-input w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Purchase Date</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="form-input w-full"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="form-input w-full font-bold"
                  >
                    <option value="CASH">CASH (ரொக்கம்)</option>
                    <option value="UPI">UPI / Bank Transfer</option>
                    <option value="BANK_TRANSFER">Bank Cheque / RTGS</option>
                    <option value="CREDIT">CREDIT (கடன் கொள்முதல்)</option>
                  </select>
                </div>
              </div>

              {/* Product Selector for Inward */}
              <div className="p-3 bg-blue-50/60 border-b border-blue-200 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-blue-600" />
                  <input
                    type="text"
                    placeholder="Search product to add inward stock (e.g. Parle, Benadryl, Salt)..."
                    value={itemSearch}
                    onChange={(e) => {
                      const q = e.target.value;
                      setItemSearch(q);
                      if (q.trim()) {
                        const filtered = products.filter(
                          (p) =>
                            p.name.toLowerCase().includes(q.toLowerCase()) ||
                            (p.tamil_name && p.tamil_name.toLowerCase().includes(q.toLowerCase())) ||
                            p.sku.toLowerCase().includes(q.toLowerCase()) ||
                            (p.barcodes && p.barcodes.includes(q))
                        );
                        setItemSuggestions(filtered.slice(0, 6));
                      } else {
                        setItemSuggestions([]);
                      }
                    }}
                    className="form-input pl-9 w-full text-xs"
                  />

                  {/* Suggestions dropdown */}
                  {itemSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-blue-400 rounded shadow-xl z-50 divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {itemSuggestions.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => addItemToPurchase(prod)}
                          className="p-2 text-xs hover:bg-blue-100 cursor-pointer flex justify-between items-center"
                        >
                          <div>
                            <span className="font-bold text-gray-900">{prod.name}</span>
                            {prod.tamil_name && <span className="text-gray-500 ml-1">({prod.tamil_name})</span>}
                            <span className="ml-2 font-mono text-gray-400 text-[11px]">{prod.sku}</span>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-gray-500 text-[11px] mr-2">Stock: {prod.current_stock}</span>
                            <span className="font-bold text-blue-900">Cost: ₹{prod.purchase_price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Inward Table */}
              <div className="flex-1 overflow-auto p-3">
                <table className="excel-table text-xs">
                  <thead>
                    <tr>
                      <th className="w-10 text-center">#</th>
                      <th>Product Name</th>
                      <th>Unit</th>
                      <th className="w-24 text-center">Inward Qty *</th>
                      <th className="w-28 text-right">Purchase Rate (₹) *</th>
                      <th className="w-20 text-center">GST %</th>
                      <th className="text-right w-28">Total (₹)</th>
                      <th className="w-10 text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-10 text-gray-400">
                          Search and add products above to receive inward stock.
                        </td>
                      </tr>
                    ) : (
                      items.map((i, idx) => (
                        <tr key={i.product_id}>
                          <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                          <td>
                            <div className="font-bold text-gray-900">{i.product_name}</div>
                            <div className="font-mono text-gray-400 text-[11px]">{i.sku}</div>
                          </td>
                          <td className="font-mono text-gray-600">{i.unit_code}</td>
                          <td className="text-center">
                            <input
                              type="number"
                              min="0.001"
                              step="any"
                              value={i.quantity}
                              onChange={(e) => updateItem(i.product_id, 'quantity', e.target.value)}
                              className="form-input text-xs w-20 text-center font-bold font-mono py-0.5"
                            />
                          </td>
                          <td className="text-right">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={i.purchase_price}
                              onChange={(e) => updateItem(i.product_id, 'purchase_price', e.target.value)}
                              className="form-input text-xs w-24 text-right font-bold font-mono py-0.5"
                            />
                          </td>
                          <td className="text-center font-mono text-gray-600">{i.gst_rate}%</td>
                          <td className="num-cell font-bold text-blue-900">₹{i.line_total.toFixed(2)}</td>
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

              {/* Purchase Footer & Totals */}
              <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-gray-500">Items: </span>
                    <b className="font-mono">{items.length}</b>
                  </div>
                  <div>
                    <span className="text-gray-500">Subtotal: </span>
                    <b className="font-mono">₹{subtotal.toFixed(2)}</b>
                  </div>
                  <div>
                    <span className="text-gray-500">GST Tax: </span>
                    <b className="font-mono">₹{taxTotal.toFixed(2)}</b>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold text-gray-700">Grand Total: </span>
                    <b className="font-mono text-blue-900 text-base font-black">₹{grandTotal.toFixed(2)}</b>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary text-xs py-2 px-3"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || items.length === 0}
                    className="btn-success text-xs py-2 px-5 font-bold shadow-md disabled:opacity-50"
                  >
                    {submitting ? 'Saving to MySQL...' : 'Save & Inward Stock'}
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

