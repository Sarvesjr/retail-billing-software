import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { SCAN_EVENT } from '../components/BarcodeListener';
import {
  Package,
  Plus,
  RefreshCw,
  Search,
  Check,
  AlertCircle,
  Barcode,
  Smartphone,
  ArrowRight,
  Edit,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  FolderPlus,
  X
} from 'lucide-react';

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

  // Existing product detection state
  const [existingProductFound, setExistingProductFound] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);

  // Quick Category Creation State (from inside Add/Edit Product modal)
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [quickCategoryForm, setQuickCategoryForm] = useState({ name: '', tamil_name: '' });
  const [quickCategorySubmitting, setQuickCategorySubmitting] = useState(false);
  const [quickCategoryError, setQuickCategoryError] = useState('');

  const nameInputRef = useRef(null);
  const barcodeCheckTimeout = useRef(null);

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

  // Listen for real-time barcode scans from Mobile Phone or Barcode Scanner
  useEffect(() => {
    const handleScanEvent = async (e) => {
      const scanData = e.detail;
      if (!scanData || !scanData.barcode) return;

      const scannedCode = String(scanData.barcode).trim();
      setRecentScannedCode(scannedCode);

      // Instantly check if this barcode is already registered in MySQL!
      try {
        const lookup = await api.lookupBarcode(scannedCode, scanData.inputSource || 'SCANNER');
        if (lookup.found && lookup.product) {
          // Pre-existing product found!
          setExistingProductFound(lookup.product);
          setIsEditMode(false);
          setEditingProductId(null);
          setFormData({
            sku: lookup.product.sku,
            name: lookup.product.name,
            tamil_name: lookup.product.tamil_name || '',
            category_id: lookup.product.category_id ? String(lookup.product.category_id) : '',
            unit_id: lookup.product.unit_id ? String(lookup.product.unit_id) : '1',
            hsn_code: lookup.product.hsn_code || '',
            gst_rate: Number(lookup.product.gst_rate) || 0,
            purchase_price: lookup.product.purchase_price !== undefined ? String(lookup.product.purchase_price) : '',
            selling_price: lookup.product.selling_price !== undefined ? String(lookup.product.selling_price) : '',
            mrp: lookup.product.mrp !== undefined ? String(lookup.product.mrp) : '',
            min_stock_level: Number(lookup.product.min_stock_level) || 5,
            barcode: scannedCode,
            opening_stock: lookup.product.current_stock !== undefined ? String(lookup.product.current_stock) : '0'
          });
          setIsModalOpen(true);
          setScannerNotice(`Pre-existing product detected: ${lookup.product.name}`);
          return;
        }
      } catch (lookupErr) {
        console.warn('Barcode lookup pre-check error:', lookupErr);
      }

      // New product (unregistered barcode)
      setExistingProductFound(null);
      setIsEditMode(false);
      setEditingProductId(null);
      setFormData((prev) => ({
        ...prev,
        barcode: scannedCode,
        sku: prev.sku && prev.sku.startsWith('PRD-') ? prev.sku : `PRD-${scannedCode.slice(-4)}`
      }));

      setIsModalOpen(true);
      setScannerNotice(`Captured new barcode ${scannedCode} from ${scanData.inputSource || 'Scanner'}!`);

      setTimeout(() => {
        if (nameInputRef.current) nameInputRef.current.focus();
      }, 100);
    };

    window.addEventListener(SCAN_EVENT, handleScanEvent);
    return () => window.removeEventListener(SCAN_EVENT, handleScanEvent);
  }, [categories, units]);

  const handleOpenAdd = () => {
    const autoSku = 'PRD-' + Math.floor(1000 + Math.random() * 9000);
    setExistingProductFound(null);
    setIsEditMode(false);
    setEditingProductId(null);
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

  const handleOpenEdit = (p) => {
    setIsEditMode(true);
    setEditingProductId(p.id);
    setExistingProductFound(null);
    setFormData({
      sku: p.sku,
      name: p.name,
      tamil_name: p.tamil_name || '',
      category_id: p.category_id ? String(p.category_id) : '',
      unit_id: p.unit_id ? String(p.unit_id) : '1',
      hsn_code: p.hsn_code || '',
      gst_rate: Number(p.gst_rate) || 0,
      purchase_price: p.purchase_price !== undefined ? String(p.purchase_price) : '',
      selling_price: p.selling_price !== undefined ? String(p.selling_price) : '',
      mrp: p.mrp !== undefined ? String(p.mrp) : '',
      min_stock_level: Number(p.min_stock_level) || 5,
      barcode: p.barcodes ? String(p.barcodes).split(',')[0].trim() : '',
      opening_stock: p.current_stock !== undefined ? String(p.current_stock) : '0'
    });
    setErrorMsg('');
    setSuccessMsg('');
    setScannerNotice(`Editing Product #${p.id} (${p.name})`);
    setIsModalOpen(true);
  };

  const handleSwitchToEdit = (prod) => {
    setIsEditMode(true);
    setEditingProductId(prod.id);
    setFormData({
      sku: prod.sku,
      name: prod.name,
      tamil_name: prod.tamil_name || '',
      category_id: prod.category_id ? String(prod.category_id) : '',
      unit_id: prod.unit_id ? String(prod.unit_id) : '1',
      hsn_code: prod.hsn_code || '',
      gst_rate: Number(prod.gst_rate) || 0,
      purchase_price: prod.purchase_price !== undefined ? String(prod.purchase_price) : '',
      selling_price: prod.selling_price !== undefined ? String(prod.selling_price) : '',
      mrp: prod.mrp !== undefined ? String(prod.mrp) : '',
      min_stock_level: Number(prod.min_stock_level) || 5,
      barcode: prod.barcodes ? String(prod.barcodes).split(',')[0].trim() : (formData.barcode || ''),
      opening_stock: prod.current_stock !== undefined ? String(prod.current_stock) : '0'
    });
    setExistingProductFound(null);
    setScannerNotice(`Editing existing product: ${prod.name}`);
    setErrorMsg('');
  };

  const handleClearBarcodeForNew = () => {
    setExistingProductFound(null);
    setIsEditMode(false);
    setEditingProductId(null);
    const autoSku = 'PRD-' + Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({
      ...prev,
      sku: autoSku,
      barcode: '',
      name: '',
      tamil_name: ''
    }));
    setScannerNotice('Enter or scan a new barcode for a distinct product.');
  };

  // Quick Create Category inline without leaving product form
  const handleQuickCreateCategory = async (e) => {
    if (e) e.preventDefault();
    if (!quickCategoryForm.name.trim()) {
      setQuickCategoryError('Category name is required.');
      return;
    }
    setQuickCategorySubmitting(true);
    setQuickCategoryError('');
    try {
      const res = await api.createCategory({
        name: quickCategoryForm.name.trim(),
        tamil_name: quickCategoryForm.tamil_name.trim() || null
      });
      const createdId = res.data?.id;

      // Reload categories list from MySQL
      const catRes = await api.getCategories();
      const updatedList = catRes.data || [];
      setCategories(updatedList);

      // Auto-select the newly created category in the product form
      if (createdId) {
        setFormData((prev) => ({ ...prev, category_id: String(createdId) }));
      } else {
        const found = updatedList.find(
          (c) => c.name.toLowerCase() === quickCategoryForm.name.trim().toLowerCase()
        );
        if (found) {
          setFormData((prev) => ({ ...prev, category_id: String(found.id) }));
        }
      }

      setQuickCategoryForm({ name: '', tamil_name: '' });
      setShowQuickCategoryModal(false);
      setSuccessMsg(`Category "${quickCategoryForm.name.trim()}" created and selected!`);
    } catch (err) {
      setQuickCategoryError(err.message || 'Failed to create category');
    } finally {
      setQuickCategorySubmitting(false);
    }
  };

  // Live barcode check when user types in the barcode input
  const handleBarcodeChange = (val) => {
    setFormData((prev) => ({ ...prev, barcode: val }));
    const trimmed = val.trim();

    if (barcodeCheckTimeout.current) clearTimeout(barcodeCheckTimeout.current);

    if (trimmed.length >= 4) {
      barcodeCheckTimeout.current = setTimeout(async () => {
        try {
          const res = await api.lookupBarcode(trimmed, 'MANUAL');
          if (res.found && res.product) {
            if (!isEditMode || res.product.id !== editingProductId) {
              setExistingProductFound(res.product);
            } else {
              setExistingProductFound(null);
            }
          } else {
            setExistingProductFound(null);
          }
        } catch (err) {
          // ignore lookup errors
        }
      }, 300);
    } else {
      setExistingProductFound(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (existingProductFound && !isEditMode) {
      setErrorMsg(
        `Cannot create duplicate: Barcode is already assigned to "${existingProductFound.name}". Please click "Edit This Existing Product" above to update it.`
      );
      return;
    }

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
        opening_stock: Number(formData.opening_stock) || 0,
        current_stock: Number(formData.opening_stock) || 0
      };

      if (isEditMode && editingProductId) {
        await api.updateProduct(editingProductId, payload);
        setSuccessMsg(`Product "${payload.name}" updated successfully in MySQL.`);
      } else {
        await api.createProduct(payload);
        setSuccessMsg(`Product "${payload.name}" successfully created in MySQL with ${payload.opening_stock} opening stock.`);
      }

      setIsModalOpen(false);
      setRecentScannedCode(null);
      setExistingProductFound(null);
      setIsEditMode(false);
      setEditingProductId(null);
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
              <span>Scanned Barcode: {recentScannedCode}</span>
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
                <th className="text-center w-24">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="14" className="text-center py-8 text-gray-500 font-mono">
                    Querying products from MySQL database...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="14" className="text-center py-8 text-gray-500">
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
                    <td className="text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(p);
                        }}
                        className="px-2 py-0.5 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded inline-flex items-center gap-1"
                        title="Edit product details"
                      >
                        <Edit className="w-3 h-3" />
                        <span>{t('edit')}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-400 shadow-2xl w-full max-w-2xl rounded-xs flex flex-col overflow-hidden max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-blue-950 font-bold text-sm">
              <span className="flex items-center gap-2">
                {isEditMode ? (
                  <>
                    <Edit className="w-4 h-4 text-amber-300" />
                    <span>{t('editProduct')}: #{editingProductId} ({formData.name || formData.sku})</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-yellow-300" />
                    <span>{t('addNewProduct')}</span>
                  </>
                )}
              </span>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setExistingProductFound(null);
                  setIsEditMode(false);
                  setEditingProductId(null);
                }}
                className="text-gray-300 hover:text-white font-bold text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Scanner Status Bar */}
            <div className="bg-blue-950 px-4 py-1.5 text-xs text-blue-200 flex items-center justify-between border-b border-blue-900">
              <div className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span><b>Phone Barcode Scanner Active:</b> Scan any item with your phone camera to auto-check.</span>
              </div>
              {scannerNotice && (
                <span className="bg-blue-800 text-white px-2 py-0.5 rounded text-[10px] font-mono">
                  {scannerNotice}
                </span>
              )}
            </div>

            {/* PRE-EXISTING PRODUCT DETECTED ALERT BANNER */}
            {existingProductFound && (
              <div className="bg-amber-50 border-b-2 border-amber-400 p-3.5 flex flex-col gap-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide">
                        {t('itemAlreadyExists')}
                      </h4>
                      <span className="text-[10px] font-mono bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                        Barcode: {formData.barcode}
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 mt-0.5">
                      {t('itemAlreadyExistsDesc')}
                    </p>

                    {/* Pre-existing Item Details Card */}
                    <div className="bg-white border border-amber-300 rounded p-2.5 mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div className="col-span-2">
                        <span className="text-[10px] uppercase font-bold text-gray-500">Existing Item Name:</span>
                        <div className="font-bold text-gray-900 text-sm">{existingProductFound.name}</div>
                        {existingProductFound.tamil_name && (
                          <div className="text-xs text-gray-600 font-medium">{existingProductFound.tamil_name}</div>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500">Current Selling Price:</span>
                        <div className="font-mono font-black text-blue-900 text-sm">
                          ₹{Number(existingProductFound.selling_price).toFixed(2)}
                        </div>
                        <div className="text-[11px] font-mono text-gray-600">
                          Stock: <b>{Number(existingProductFound.current_stock || 0).toFixed(2)}</b>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons to Edit or Use Different Barcode */}
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => handleSwitchToEdit(existingProductFound)}
                        className="bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs px-3 py-1.5 rounded shadow-xs flex items-center gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5 text-yellow-300" />
                        <span>{t('editExistingProduct')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClearBarcodeForNew}
                        className="bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 text-xs px-3 py-1.5 rounded font-medium flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3 text-gray-500" />
                        <span>{t('assignDifferentBarcode')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1">
              {errorMsg && (
                <div className="p-2.5 bg-red-100 border border-red-300 text-red-800 text-xs rounded font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">{t('sku')} *</label>
                  <input
                    type="text"
                    required
                    disabled={isEditMode}
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className={`form-input w-full font-mono text-xs ${isEditMode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
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
                        Active Barcode
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Scan product with phone or enter barcode..."
                    value={formData.barcode}
                    onChange={(e) => handleBarcodeChange(e.target.value)}
                    className="form-input w-full font-mono text-xs font-bold border-indigo-400 bg-indigo-50/40 text-blue-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-gray-700">{t('category')}</label>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickCategoryError('');
                        setQuickCategoryForm({ name: '', tamil_name: '' });
                        setShowQuickCategoryModal(true);
                      }}
                      className="text-[10px] font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-0.5"
                      title="Add a new category directly without leaving this form"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>+ {lang === 'ta' ? 'புதிய பிரிவு' : 'Add Category'}</span>
                    </button>
                  </div>
                  <select
                    value={formData.category_id}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setQuickCategoryError('');
                        setQuickCategoryForm({ name: '', tamil_name: '' });
                        setShowQuickCategoryModal(true);
                      } else {
                        setFormData({ ...formData, category_id: e.target.value });
                      }
                    }}
                    className="form-input w-full text-xs"
                  >
                    <option value="">-- {t('category')} --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'ta' && c.tamil_name ? c.tamil_name : c.name}
                      </option>
                    ))}
                    <option value="__NEW__" className="text-blue-700 font-bold bg-blue-50">
                      + {lang === 'ta' ? 'புதிய பிரிவு சேர்க்க...' : '+ Add New Category...'}
                    </option>
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
                  <label className="block text-[11px] font-bold text-blue-900 mb-1">
                    {isEditMode ? 'Stock Quantity' : t('openingStock')}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.opening_stock}
                    onChange={(e) => setFormData({ ...formData, opening_stock: e.target.value })}
                    className="form-input w-full text-right font-mono text-xs border-blue-400 bg-blue-50/50 font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  {isEditMode ? (
                    <span className="text-amber-700 font-bold flex items-center gap-1">
                      <Edit className="w-3.5 h-3.5" />
                      Editing Product #{editingProductId}
                    </span>
                  ) : existingProductFound ? (
                    <span className="text-amber-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Resolve pre-existing product before saving
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setExistingProductFound(null);
                      setIsEditMode(false);
                      setEditingProductId(null);
                    }}
                    className="btn-secondary text-xs"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`btn-primary text-xs ${isEditMode ? 'bg-amber-600 hover:bg-amber-700 border-amber-700' : ''}`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {submitting
                        ? t('saving')
                        : isEditMode
                        ? t('update')
                        : t('save')}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Quick Add Category Mini-Modal (Sub-modal over Product modal) */}
      {showQuickCategoryModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-2xl border border-gray-300 w-full max-w-sm overflow-hidden">
            <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between font-bold text-xs">
              <span className="flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-yellow-300" />
                <span>{lang === 'ta' ? 'புதிய பிரிவு சேர்க்க' : 'Add New Category'}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowQuickCategoryModal(false)}
                className="text-gray-300 hover:text-white font-bold text-base leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleQuickCreateCategory} className="p-4 space-y-3">
              {quickCategoryError && (
                <div className="p-2 bg-red-100 border border-red-300 text-red-800 text-xs rounded">
                  {quickCategoryError}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Category Name (English) *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Groceries, Vermicelli, Dairy"
                  value={quickCategoryForm.name}
                  onChange={(e) => setQuickCategoryForm({ ...quickCategoryForm, name: e.target.value })}
                  className="form-input w-full text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Tamil Name (தமிழ் பெயர்)
                </label>
                <input
                  type="text"
                  placeholder="எ.கா. மளிகை பொருட்கள், சேமியா"
                  value={quickCategoryForm.tamil_name}
                  onChange={(e) => setQuickCategoryForm({ ...quickCategoryForm, tamil_name: e.target.value })}
                  className="form-input w-full text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowQuickCategoryModal(false)}
                  className="btn-secondary text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={quickCategorySubmitting}
                  className="btn-primary text-xs flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    {quickCategorySubmitting
                      ? t('saving')
                      : lang === 'ta'
                      ? 'சேமிக்க'
                      : 'Save Category'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
