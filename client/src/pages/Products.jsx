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

  // Clean product form data factory
  const getCleanProductFormData = (defaultUnitId = '1', defaultCategoryId = '') => ({
    sku: 'PRD-' + Math.floor(1000 + Math.random() * 9000),
    name: '',
    tamil_name: '',
    category_id: defaultCategoryId,
    unit_id: defaultUnitId,
    hsn_code: '',
    gst_rate: 0,
    purchase_price: '',
    selling_price: '',
    mrp: '',
    min_stock_level: 5,
    barcode: '',
    opening_stock: '10',
    is_active: true
  });

  // Safe mapper for products from any source (lookupBarcode, table rows, getProduct API)
  const mapProductToFormData = (p, fallbackBarcode = '') => {
    if (!p) return getCleanProductFormData(units.length ? String(units[0].id) : '1', categories.length ? String(categories[0].id) : '');

    let barcodeVal = '';
    if (p.barcodes) {
      if (Array.isArray(p.barcodes)) {
        barcodeVal = p.barcodes[0]?.barcode || p.barcodes[0] || '';
      } else {
        barcodeVal = String(p.barcodes).split(',')[0].trim();
      }
    } else if (p.barcode) {
      barcodeVal = String(p.barcode).trim();
    } else if (fallbackBarcode) {
      barcodeVal = String(fallbackBarcode).trim();
    }

    let catId = '';
    if (p.category_id !== undefined && p.category_id !== null && p.category_id !== '') {
      catId = String(p.category_id);
    } else if (p.categoryId !== undefined && p.categoryId !== null && p.categoryId !== '') {
      catId = String(p.categoryId);
    }

    let unitId = '1';
    if (p.unit_id !== undefined && p.unit_id !== null && p.unit_id !== '') {
      unitId = String(p.unit_id);
    } else if (p.unitId !== undefined && p.unitId !== null && p.unitId !== '') {
      unitId = String(p.unitId);
    } else if (units.length) {
      unitId = String(units[0].id);
    }

    const purchasePrice = (p.purchase_price !== undefined && p.purchase_price !== null && p.purchase_price !== '')
      ? String(p.purchase_price)
      : ((p.purchasePrice !== undefined && p.purchasePrice !== null && p.purchasePrice !== '') ? String(p.purchasePrice) : '');

    const sellingPrice = (p.selling_price !== undefined && p.selling_price !== null && p.selling_price !== '')
      ? String(p.selling_price)
      : ((p.sellingPrice !== undefined && p.sellingPrice !== null && p.sellingPrice !== '') ? String(p.sellingPrice) : '');

    const mrp = (p.mrp !== undefined && p.mrp !== null && p.mrp !== '') ? String(p.mrp) : '';

    const stock = (p.current_stock !== undefined && p.current_stock !== null && p.current_stock !== '')
      ? String(p.current_stock)
      : ((p.currentStock !== undefined && p.currentStock !== null && p.currentStock !== '')
        ? String(p.currentStock)
        : ((p.opening_stock !== undefined && p.opening_stock !== null && p.opening_stock !== '') ? String(p.opening_stock) : '0'));

    return {
      sku: p.sku || '',
      name: p.name || p.product_name || p.productName || '',
      tamil_name: p.tamil_name || p.tamilName || '',
      category_id: catId,
      unit_id: unitId,
      hsn_code: p.hsn_code || p.hsnCode || '',
      gst_rate: Number(p.gst_rate ?? p.gstRate ?? 0),
      purchase_price: purchasePrice,
      selling_price: sellingPrice,
      mrp: mrp,
      min_stock_level: Number(p.min_stock_level ?? p.minStockLevel ?? 5),
      barcode: barcodeVal,
      opening_stock: stock,
      is_active: p.is_active !== undefined ? Boolean(Number(p.is_active)) : true
    };
  };

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
    opening_stock: '10',
    is_active: true
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
          // Pre-existing product found! Load directly in Edit Mode for this product
          const prodObj = lookup.product;
          const prodId = prodObj.id || prodObj.productId;
          setExistingProductFound(prodObj);
          setIsEditMode(true);
          setEditingProductId(prodId);
          setErrorMsg('');
          setFormData(mapProductToFormData(prodObj, scannedCode));
          setIsModalOpen(true);
          setScannerNotice(`Pre-existing product loaded: #${prodId} ${prodObj.name || prodObj.productName}`);

          // Fetch full product details in background to ensure all nested properties are 100% synced
          try {
            const fullRes = await api.getProduct(prodId);
            if (fullRes?.data) {
              setFormData(mapProductToFormData(fullRes.data, scannedCode));
            }
          } catch (fullErr) {
            // keep form loaded from lookup
          }
          return;
        }
      } catch (lookupErr) {
        console.warn('Barcode lookup pre-check error:', lookupErr);
      }

      // New product (unregistered barcode) -> ALWAYS reset all form fields to completely blank fresh defaults!
      setExistingProductFound(null);
      setIsEditMode(false);
      setEditingProductId(null);
      setErrorMsg('');
      const blankData = getCleanProductFormData(
        units.length ? String(units[0].id) : '1',
        categories.length ? String(categories[0].id) : ''
      );
      blankData.barcode = scannedCode;
      setFormData(blankData);

      setIsModalOpen(true);
      setScannerNotice(`Scanned new barcode: ${scannedCode}`);

      setTimeout(() => {
        if (nameInputRef.current) nameInputRef.current.focus();
      }, 100);
    };

    window.addEventListener(SCAN_EVENT, handleScanEvent);
    return () => window.removeEventListener(SCAN_EVENT, handleScanEvent);
  }, [categories, units]);

  const handleOpenAdd = () => {
    setExistingProductFound(null);
    setIsEditMode(false);
    setEditingProductId(null);
    const blankData = getCleanProductFormData(
      units.length ? String(units[0].id) : '1',
      categories.length ? String(categories[0].id) : ''
    );
    if (recentScannedCode) {
      blankData.barcode = recentScannedCode;
    }
    setFormData(blankData);
    setErrorMsg('');
    setSuccessMsg('');
    setScannerNotice(recentScannedCode ? `Using barcode: ${recentScannedCode}` : '');
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (p) => {
    setIsEditMode(true);
    setEditingProductId(p.id);
    setExistingProductFound(null);
    setFormData(mapProductToFormData(p));
    setErrorMsg('');
    setSuccessMsg('');
    setScannerNotice(`Editing Product #${p.id} (${p.name})`);
    setIsModalOpen(true);

    // Fetch full product record from MySQL to ensure any unlisted fields/barcodes are loaded
    try {
      const fullRes = await api.getProduct(p.id);
      if (fullRes?.data) {
        setFormData(mapProductToFormData(fullRes.data));
      }
    } catch (err) {
      // already populated from p
    }
  };

  const handleSwitchToEdit = async (prod) => {
    const prodId = prod.id || prod.productId;
    setIsEditMode(true);
    setEditingProductId(prodId);
    setFormData(mapProductToFormData(prod, formData.barcode));
    setExistingProductFound(null);
    setScannerNotice(`Editing existing product: ${prod.name || prod.productName}`);
    setErrorMsg('');

    try {
      const fullRes = await api.getProduct(prodId);
      if (fullRes?.data) {
        setFormData(mapProductToFormData(fullRes.data, formData.barcode));
      }
    } catch (err) {
      // already populated from prod
    }
  };

  const handleClearBarcodeForNew = () => {
    setExistingProductFound(null);
    setIsEditMode(false);
    setEditingProductId(null);
    setErrorMsg('');
    setFormData(getCleanProductFormData(
      units.length ? String(units[0].id) : '1',
      categories.length ? String(categories[0].id) : ''
    ));
    setScannerNotice('Ready to add a brand new product.');
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
            const foundId = res.product.id || res.product.productId;
            if (!isEditMode || Number(foundId) !== Number(editingProductId)) {
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

    if (existingProductFound && (!isEditMode || Number(existingProductFound.id) !== Number(editingProductId))) {
      setErrorMsg(
        `Cannot save duplicate: Barcode "${formData.barcode}" is already assigned to "${existingProductFound.name}". Please edit that product or use a different barcode.`
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
        current_stock: Number(formData.opening_stock) || 0,
        is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : true
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
      setFormData(getCleanProductFormData(units.length ? String(units[0].id) : '1', categories.length ? String(categories[0].id) : ''));
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
                    <td className={`num-cell font-bold ${
                      Number(p.current_stock) <= 0
                        ? 'bg-red-50 text-red-700 font-black'
                        : Number(p.current_stock) <= Number(p.min_stock_level || 5)
                        ? 'bg-amber-50 text-amber-800 font-black'
                        : 'bg-blue-50/50 text-blue-900'
                    }`}>
                      {Number(p.current_stock).toFixed(2)}
                      {Number(p.current_stock) <= 0 && (
                        <span className="block text-[9px] font-bold text-red-600 uppercase tracking-tighter">Out of Stock</span>
                      )}
                    </td>
                    <td className="text-center">
                      {!p.is_active ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-300">
                          {lang === 'ta' ? 'முடக்கப்பட்டது' : 'Inactive'}
                        </span>
                      ) : Number(p.current_stock) <= 0 ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                          {lang === 'ta' ? 'இருப்பு இல்லை' : 'Out of Stock'}
                        </span>
                      ) : Number(p.current_stock) <= Number(p.min_stock_level || 5) ? (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          {lang === 'ta' ? 'குறைந்த இருப்பு' : 'Low Stock'}
                        </span>
                      ) : (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-300">
                          {lang === 'ta' ? 'இருப்பில் உள்ளது' : 'In Stock'}
                        </span>
                      )}
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
                  <div className="flex items-center gap-2">
                    <Edit className="w-4 h-4 text-amber-300" />
                    <span>{t('editProduct')}: #{editingProductId} ({formData.name || formData.sku})</span>
                    <button
                      type="button"
                      onClick={handleClearBarcodeForNew}
                      className="text-[11px] bg-blue-800 hover:bg-blue-700 text-yellow-300 border border-blue-700 font-bold px-2 py-0.5 rounded ml-2"
                      title="Clear this product and start adding a new product"
                    >
                      + Add New Instead
                    </button>
                  </div>
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
                        <div className="font-bold text-gray-900 text-sm">
                          {existingProductFound.name || existingProductFound.productName}
                        </div>
                        {(existingProductFound.tamil_name || existingProductFound.tamilName) && (
                          <div className="text-xs text-gray-600 font-medium">
                            {existingProductFound.tamil_name || existingProductFound.tamilName}
                          </div>
                        )}
                        {(existingProductFound.category_name || existingProductFound.category) && (
                          <div className="text-[11px] text-gray-500 font-semibold mt-0.5">
                            Category: <span className="text-gray-800">{existingProductFound.category_name || existingProductFound.category}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-500">Current Selling Price:</span>
                        <div className="font-mono font-black text-blue-900 text-sm">
                          ₹{Number(existingProductFound.selling_price ?? existingProductFound.sellingPrice ?? 0).toFixed(2)}
                        </div>
                        <div className="text-[11px] font-mono text-gray-600">
                          Stock: <b>{Number(existingProductFound.current_stock ?? existingProductFound.currentStock ?? 0).toFixed(2)}</b>
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
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
                    value={String(formData.category_id || '')}
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
                      <option key={c.id} value={String(c.id)}>
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
                    value={String(formData.unit_id || '')}
                    onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                    className="form-input w-full text-xs"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={String(u.id)}>
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
                    value={String(formData.gst_rate ?? 0)}
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

              <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <div>
                    <span className="font-bold text-gray-800 text-xs">Product Active</span>
                    <span className="text-[11px] text-gray-500 block">
                      When active, product is visible in search and available for billing.
                    </span>
                  </div>
                </label>
                {!formData.is_active && (
                  <span className="text-[10px] font-bold text-gray-600 bg-gray-200 px-2 py-0.5 rounded">
                    Inactive (Hidden from POS)
                  </span>
                )}
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
