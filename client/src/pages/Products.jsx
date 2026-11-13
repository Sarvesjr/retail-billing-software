import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { SCAN_EVENT } from '../components/BarcodeListener';
import { Package, Plus, RefreshCw, Search, Check, AlertCircle, Barcode, Smartphone, ArrowRight } from 'lucide-react';

export function Products() {
  const { t, lang } = useI18n();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [scannerNotice, setScannerNotice] = useState('');
  const [recentScannedCode, setRecentScannedCode] = useState(null);
  const nameInputRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    tamil_name: '',
    category_id: '',
    unit_id: '1',
    hsn_code: '',
    gst_rate: 0,
    purchase_price: '',
    selling_price: '',
    mrp: '',
    min_stock_level: 5,
    barcode: '',
    opening_stock: '10'
  });

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [prodRes, catRes, unitRes] = await Promise.all([
        api.getProducts({ search }),
        api.getCategories(),
        api.getUnits()
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data || []);
      setUnits(unitRes.data || []);
    } catch (err) {
      setErrorMsg('Failed to fetch product records from MySQL: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  // Listen for real-time barcode scans from Mobile Phone or Barcode Scanner to auto-fill barcode!
  useEffect(() => {
    const handleScanEvent = (e) => {
      const scanData = e.detail;
      if (!scanData || !scanData.barcode) return;

      const scannedCode = String(scanData.barcode).trim();
      setRecentScannedCode(scannedCode);

      // Auto-populate barcode in form
      setFormData((prev) => ({
        ...prev,
        barcode: scannedCode,
        sku: prev.sku ? prev.sku : `PRD-${scannedCode.slice(-4)}`
      }));

      // Automatically open the Add Product modal if not already open!
      setIsModalOpen(true);
      setScannerNotice(`Captured barcode ${scannedCode} from ${scanData.inputSource}!`);

      // Focus the product name field so user can instantly type
      setTimeout(() => {
        if (nameInputRef.current) nameInputRef.current.focus();
      }, 100);
    };

    window.addEventListener(SCAN_EVENT, handleScanEvent);
    return () => window.removeEventListener(SCAN_EVENT, handleScanEvent);
  }, [categories, units]);

  const handleOpenAdd = () => {
    const autoSku = 'PRD-' + Math.floor(1000 + Math.random() * 9000);
    setFormData({
      sku: autoSku,
      name: '',
      tamil_name: '',
      category_id: categories.length ? String(categories[0].id) : '',
      unit_id: units.length ? String(units[0].id) : '1',
      hsn_code: '',
      gst_rate: 0,
      purchase_price: '',
      selling_price: '',
      mrp: '',
      min_stock_level: 5,
      barcode: recentScannedCode || '',
      opening_stock: '10'
    });
    setErrorMsg('');
    setSuccessMsg('');
    setScannerNotice(recentScannedCode ? `Using recently scanned barcode: ${recentScannedCode}` : '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        sku: formData.sku.trim(),
        name: formData.name.trim(),
        tamil_name: formData.tamil_name ? formData.tamil_name.trim() : null,
        category_id: formData.category_id ? Number(formData.category_id) : null,
        unit_id: Number(formData.unit_id),
        hsn_code: formData.hsn_code ? formData.hsn_code.trim() : null,
        gst_rate: Number(formData.gst_rate) || 0,
        purchase_price: Number(formData.purchase_price) || 0,
        selling_price: Number(formData.selling_price) || 0,
        mrp: Number(formData.mrp) || 0,
        min_stock_level: Number(formData.min_stock_level) || 0,
        barcodes: formData.barcode ? [formData.barcode.trim()] : [],
        opening_stock: Number(formData.opening_stock) || 0
      };

      await api.createProduct(payload);
      setSuccessMsg(`Product "${payload.name}" successfully created in MySQL with ${payload.opening_stock} opening stock.`);
      setIsModalOpen(false);
      setRecentScannedCode(null);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Error saving product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Top Action Bar */}
      <div className="bg-white px-4 py-2 border-b border-gray-300 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-sm">
            <Package className="w-4 h-4 text-blue-700" />
            <span>{t('products')}</span>
            <span className="text-gray-500 font-mono text-xs">({products.length})</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchProduct')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-8 w-64 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {recentScannedCode && (
            <button
              onClick={handleOpenAdd}
              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs px-2.5 py-1 rounded border border-emerald-400 flex items-center gap-1 font-bold"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
              <span>Add Scanned: {recentScannedCode}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          <button onClick={loadData} className="btn-secondary text-xs" title="Refresh MySQL Data">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('refresh')}</span>
          </button>
          <button onClick={handleOpenAdd} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span>{t('addNewProduct')}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="bg-green-50 border-b border-green-200 text-green-800 px-4 py-1.5 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-1.5 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Excel-Style Table View */}
      <div className="flex-1 overflow-auto p-3">
        <div className="bg-white border border-gray-300 shadow-xs">
          <table className="excel-table">
            <thead>
              <tr>
                <th className="w-12 text-center">{t('sNo')}</th>
                <th className="w-24">{t('sku')}</th>
                <th>{t('productName')}</th>
                <th>{t('tamilName')}</th>
                <th>{t('barcode')}</th>
                <th>{t('category')}</th>
                <th>{t('unit')}</th>
                <th className="text-right">{t('gst')}</th>
                <th className="text-right">{t('purchasePrice')}</th>
                <th className="text-right">{t('sellingPrice')}</th>
                <th className="text-right">{t('mrp')}</th>
                <th className="text-right bg-blue-50 text-blue-900">{t('currentStock')}</th>
                <th className="text-center">{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="13" className="text-center py-8 text-gray-500 font-mono">
                    Querying products from MySQL database...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="13" className="text-center py-8 text-gray-500">
                    No products found in MySQL database.
                  </td>
                </tr>
              ) : (
                products.map((p, idx) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className={selectedProduct?.id === p.id ? 'selected' : ''}
                  >
                    <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                    <td className="font-mono font-semibold text-blue-800">{p.sku}</td>
                    <td className="font-semibold text-gray-900">{p.name}</td>
                    <td className="text-gray-700 font-medium">{p.tamil_name || '-'}</td>
                    <td className="font-mono text-xs text-indigo-700">
                      {p.barcodes ? (
                        <span className="flex items-center gap-1 font-bold">
                          <Barcode className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{p.barcodes}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">No barcode</span>
                      )}
                    </td>
                    <td className="text-gray-600">
                      {lang === 'ta' && p.category_tamil_name ? p.category_tamil_name : p.category_name || '-'}
                    </td>
                    <td className="text-gray-600">
                      {lang === 'ta' && p.unit_tamil_name ? p.unit_tamil_name : p.unit_code}
                    </td>
                    <td className="num-cell">{Number(p.gst_rate).toFixed(0)}%</td>
                    <td className="num-cell text-gray-600">₹{Number(p.purchase_price).toFixed(2)}</td>
                    <td className="num-cell font-bold text-gray-900">₹{Number(p.selling_price).toFixed(2)}</td>
                    <td className="num-cell text-gray-500">₹{Number(p.mrp).toFixed(2)}</td>
                    <td className="num-cell font-bold bg-blue-50/50 text-blue-900">
                      {Number(p.current_stock).toFixed(2)}
                    </td>
                    <td className="text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-300">
                        {t('active')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal (Dense, Keyboard-friendly + Real-time Scanner Auto-Capture) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-400 shadow-xl w-full max-w-2xl rounded-xs flex flex-col">
            <div className="bg-blue-900 text-white px-4 py-2 flex items-center justify-between border-b border-blue-950 font-bold text-sm">
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-yellow-300" />
                {t('addNewProduct')}
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-300 hover:text-white font-bold text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Real-time Scanner Listener Banner */}
            <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span><b>Phone Barcode Scanner Connected:</b> Point your phone camera at any product barcode to auto-fill!</span>
              </div>
              {scannerNotice && (
                <span className="bg-emerald-700 text-white px-2 py-0.5 rounded text-[11px] font-bold">
                  {scannerNotice}
                </span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {errorMsg && (
                <div className="p-2 bg-red-100 border border-red-300 text-red-800 text-xs rounded">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">{t('sku')} *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="form-input w-full font-mono text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">{t('productName')} *</label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    placeholder="e.g. Vicks VapoRub 25ml"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input w-full text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">{t('tamilName')}</label>
                  <input
                    type="text"
                    placeholder="எ.கா. விக்ஸ் வேப்பரப் 25மி.லி"
                    value={formData.tamil_name}
                    onChange={(e) => setFormData({ ...formData, tamil_name: e.target.value })}
                    className="form-input w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-indigo-900 mb-1 flex items-center justify-between">
                    <span>{t('barcode')} (Auto-fills on Phone Scan) *</span>
                    {formData.barcode && (
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1 rounded border border-emerald-300">
                        Auto-Captured
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Scan product with phone or enter barcode..."
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="form-input w-full font-mono text-xs font-bold border-indigo-400 bg-indigo-50/40 text-blue-900 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">{t('category')}</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="form-input w-full text-xs"
                  >
                    <option value="">-- {t('category')} --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'ta' && c.tamil_name ? c.tamil_name : c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">{t('unit')} *</label>
                  <select
                    value={formData.unit_id}
                    onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                    className="form-input w-full text-xs"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.code} - {lang === 'ta' && u.tamil_name ? u.tamil_name : u.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">{t('hsn')}</label>
                  <input
                    type="text"
                    placeholder="30049011"
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                    className="form-input w-full font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">{t('gst')}</label>
                  <select
                    value={formData.gst_rate}
                    onChange={(e) => setFormData({ ...formData, gst_rate: Number(e.target.value) })}
                    className="form-input w-full text-xs font-mono"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 bg-gray-50 p-2.5 border border-gray-200 rounded">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">{t('purchasePrice')} *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    className="form-input w-full text-right font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">{t('sellingPrice')} *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="form-input w-full text-right font-mono text-xs font-bold text-blue-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">{t('mrp')}</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    className="form-input w-full text-right font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-blue-900 mb-1">{t('openingStock')}</label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.opening_stock}
                    onChange={(e) => setFormData({ ...formData, opening_stock: e.target.value })}
                    className="form-input w-full text-right font-mono text-xs border-blue-400 bg-blue-50/50 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{submitting ? t('saving') : t('save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
