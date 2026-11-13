import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { Boxes, AlertTriangle, Sliders, History, Search, Plus, Minus, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

export function Inventory() {
  const { t, lang } = useI18n();
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'movements'
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [loading, setLoading] = useState(true);

  // Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustType, setAdjustType] = useState('SUB'); // 'ADD' | 'SUB'
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Damaged goods / சேதமடைந்தது');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory?search=${encodeURIComponent(search)}&lowStock=${lowStockFilter}`);
      const json = await res.json();
      setInventory(json.data || []);

      const movRes = await fetch('/api/inventory/movements?limit=50');
      const movJson = await movRes.json();
      setMovements(movJson.data || []);
    } catch (err) {
      setErrorMsg('Failed to load inventory from MySQL: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, lowStockFilter]);

  const handleOpenAdjust = (prod) => {
    setSelectedProduct(prod);
    setAdjustType('SUB');
    setAdjustQty('');
    setAdjustReason('Damaged goods / சேதமடைந்தது');
    setErrorMsg('');
    setAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustQty || Number(adjustQty) <= 0) {
      setErrorMsg('Enter a valid positive quantity');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          adjustment_type: adjustType,
          quantity: Number(adjustQty),
          notes: adjustReason
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Adjustment failed');

      setSuccessMsg(`Stock adjusted for "${selectedProduct.name}". New Stock: ${data.data.stockAfter}`);
      setAdjustModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalCostVal = inventory.reduce((acc, i) => acc + Number(i.total_cost_value || 0), 0);
  const totalRetailVal = inventory.reduce((acc, i) => acc + Number(i.total_selling_value || 0), 0);
  const lowStockCount = inventory.filter((i) => i.stock_status !== 'NORMAL').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Top Header */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-300 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-indigo-700" />
            <h2 className="font-bold text-sm text-gray-900">
              {lang === 'ta' ? 'சரக்கு இருப்பு & தணிக்கை (Stock & Inventory)' : 'Inventory & Stock Ledger'}
            </h2>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-100 p-0.5 rounded border border-gray-300">
            <button
              onClick={() => setActiveTab('stock')}
              className={`px-3 py-1 text-xs font-bold rounded transition ${
                activeTab === 'stock' ? 'bg-blue-800 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Current Stock
            </button>
            <button
              onClick={() => setActiveTab('movements')}
              className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1 transition ${
                activeTab === 'movements' ? 'bg-blue-800 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <History className="w-3 h-3" />
              <span>Stock Movements Ledger</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-blue-50 text-blue-900 px-2 py-0.5 rounded font-semibold border border-blue-200">
              Cost Value: <b className="font-mono">₹{totalCostVal.toFixed(2)}</b>
            </span>
            <span className="bg-emerald-50 text-emerald-900 px-2 py-0.5 rounded font-semibold border border-emerald-200">
              Retail Value: <b className="font-mono">₹{totalRetailVal.toFixed(2)}</b>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'stock' && (
            <button
              onClick={() => setLowStockFilter(!lowStockFilter)}
              className={`text-xs py-1.5 px-3 rounded font-bold flex items-center gap-1.5 border transition ${
                lowStockFilter
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Low-Stock Alerts ({lowStockCount})</span>
            </button>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
            <input
              type="text"
              placeholder="Search product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-8 py-1 text-xs w-48"
            />
          </div>

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

      {/* Content View */}
      <div className="flex-1 overflow-auto p-3">
        {activeTab === 'stock' ? (
          /* Current Stock Table */
          <div className="bg-white border border-gray-300 shadow-xs">
            <table className="excel-table text-xs">
              <thead>
                <tr>
                  <th className="w-12 text-center">#</th>
                  <th>Product Name</th>
                  <th>Tamil Name</th>
                  <th>SKU / Code</th>
                  <th>Category</th>
                  <th className="text-right">Cost Price (₹)</th>
                  <th className="text-right">Selling Price (₹)</th>
                  <th className="text-center">Current Stock</th>
                  <th className="text-center">Min Level</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Cost Value (₹)</th>
                  <th className="w-24 text-center">Adjust</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="12" className="text-center py-12 text-gray-400">Loading stock from MySQL...</td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="text-center py-12 text-gray-400">No products matching criteria.</td>
                  </tr>
                ) : (
                  inventory.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-blue-50/40">
                      <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                      <td className="font-bold text-gray-900">{p.name}</td>
                      <td className="text-gray-700">{p.tamil_name || '-'}</td>
                      <td className="font-mono text-indigo-700">{p.sku}</td>
                      <td className="text-gray-600">{p.category_name || '-'}</td>
                      <td className="num-cell font-mono">₹{Number(p.purchase_price).toFixed(2)}</td>
                      <td className="num-cell font-mono font-bold text-gray-900">₹{Number(p.selling_price).toFixed(2)}</td>
                      <td className="text-center font-mono font-black text-sm">
                        {p.current_stock} {p.unit_code}
                      </td>
                      <td className="text-center font-mono text-gray-500">{p.min_stock_level}</td>
                      <td className="text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.stock_status === 'OUT_OF_STOCK'
                              ? 'bg-rose-100 text-rose-800'
                              : p.stock_status === 'LOW_STOCK'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.stock_status === 'OUT_OF_STOCK'
                            ? 'OUT OF STOCK'
                            : p.stock_status === 'LOW_STOCK'
                            ? 'LOW STOCK'
                            : 'IN STOCK'}
                        </span>
                      </td>
                      <td className="num-cell font-mono text-blue-900 font-bold">
                        ₹{Number(p.total_cost_value).toFixed(2)}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenAdjust(p)}
                          className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 mx-auto"
                          title="Audit Stock Adjustment"
                        >
                          <Sliders className="w-3 h-3 text-blue-700" />
                          <span>Adjust</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Immutable Stock Movement Ledger Table */
          <div className="bg-white border border-gray-300 shadow-xs">
            <table className="excel-table text-xs">
              <thead>
                <tr>
                  <th className="w-12 text-center">#</th>
                  <th>Timestamp</th>
                  <th>Product Name</th>
                  <th>Movement Type</th>
                  <th>Ref Number</th>
                  <th className="text-right">Qty Changed</th>
                  <th className="text-right">Stock Before</th>
                  <th className="text-right">Stock After</th>
                  <th>Audit Notes / Reason</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="text-center py-12 text-gray-400">No stock movements recorded yet.</td>
                  </tr>
                ) : (
                  movements.map((m, idx) => {
                    const isPositive = Number(m.quantity) > 0;
                    return (
                      <tr key={m.id} className="hover:bg-blue-50/40">
                        <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                        <td className="font-mono text-gray-600">
                          {new Date(m.created_at).toLocaleString()}
                        </td>
                        <td className="font-bold text-gray-900">
                          {m.product_name}
                          {m.product_tamil_name && <span className="text-gray-500 ml-1">({m.product_tamil_name})</span>}
                        </td>
                        <td>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              m.movement_type === 'PURCHASE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : m.movement_type === 'SALE'
                                ? 'bg-blue-100 text-blue-800'
                                : m.movement_type === 'SALE_RETURN'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {m.movement_type}
                          </span>
                        </td>
                        <td className="font-mono text-indigo-700">{m.reference_no || '-'}</td>
                        <td
                          className={`num-cell font-mono font-bold text-sm ${
                            isPositive ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isPositive ? `+${m.quantity}` : m.quantity} {m.unit_code}
                        </td>
                        <td className="num-cell font-mono text-gray-500">{m.stock_before}</td>
                        <td className="num-cell font-mono font-bold text-gray-900">{m.stock_after}</td>
                        <td className="text-gray-600">{m.notes || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {adjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-300 overflow-hidden animate-fade-in">
            <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wide">
                Adjust Stock: {selectedProduct.name}
              </h3>
              <button onClick={() => setAdjustModalOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveAdjustment} className="p-4 space-y-3 text-xs">
              <div className="bg-gray-50 p-2.5 rounded border border-gray-200 flex justify-between items-center font-bold">
                <span className="text-gray-700">Current Stock in MySQL:</span>
                <span className="font-mono text-base text-blue-900">
                  {selectedProduct.current_stock} {selectedProduct.unit_code}
                </span>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Adjustment Action:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('SUB')}
                    className={`py-2 px-3 rounded font-bold flex items-center justify-center gap-1.5 border transition ${
                      adjustType === 'SUB'
                        ? 'bg-rose-700 text-white border-rose-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                    }`}
                  >
                    <Minus className="w-4 h-4" />
                    <span>Deduct Stock (-)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('ADD')}
                    className={`py-2 px-3 rounded font-bold flex items-center justify-center gap-1.5 border transition ${
                      adjustType === 'ADD'
                        ? 'bg-emerald-700 text-white border-emerald-800'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Stock (+)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Quantity to Adjust *</label>
                <input
                  type="number"
                  required
                  min="0.001"
                  step="any"
                  autoFocus
                  placeholder="0"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="form-input w-full font-mono text-lg font-bold text-center"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Audit Reason / குறிப்பு</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="form-input w-full"
                >
                  <option value="Damaged goods / சேதமடைந்தது">Damaged goods / சேதமடைந்தது</option>
                  <option value="Expired product / காலாவதியானது">Expired product / காலாவதியானது</option>
                  <option value="Physical count audit correction / இருப்பு சரிபார்ப்பு">
                    Physical count audit correction / இருப்பு சரிபார்ப்பு
                  </option>
                  <option value="Theft or lost goods / திருட்டு அல்லது காணாமல் போனது">
                    Theft or lost goods / திருட்டு அல்லது காணாமல் போனது
                  </option>
                  <option value="Supplier promotional free sample / இலவச மாதிரி">
                    Supplier promotional free sample / இலவச மாதிரி
                  </option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-1.5 px-4 font-bold disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

