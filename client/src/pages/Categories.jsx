import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import {
  FolderTree,
  Scale,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Package,
  Layers,
  ChevronRight,
  Eye,
  Search,
  Barcode,
  Tag
} from 'lucide-react';

export function Categories() {
  const { t, lang } = useI18n();
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'units'

  // Categories state
  const [categories, setCategories] = useState([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [loadingCats, setLoadingCats] = useState(true);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', tamil_name: '', description: '', is_active: true });

  // Selected Category & Product Entries
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loadingCategoryProducts, setLoadingCategoryProducts] = useState(false);
  const [productFilter, setProductFilter] = useState('');

  // Fullscreen Modal Viewer state
  const [viewingCategoryModal, setViewingCategoryModal] = useState(null);

  // Units state
  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitForm, setUnitForm] = useState({ code: '', name: '', tamil_name: '', allow_decimals: false, is_active: true });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCategories = async (preserveSelectedId = null) => {
    setLoadingCats(true);
    try {
      const res = await api.getCategories();
      const catList = res.data || [];
      setCategories(catList);

      if (catList.length > 0) {
        const toSelect = preserveSelectedId
          ? catList.find((c) => c.id === preserveSelectedId) || catList[0]
          : selectedCategory
          ? catList.find((c) => c.id === selectedCategory.id) || catList[0]
          : catList[0];
        setSelectedCategory(toSelect);
        loadProductsForCategory(toSelect.id);
      } else {
        setSelectedCategory(null);
        setCategoryProducts([]);
      }
    } catch (err) {
      setErrorMsg('Failed to load categories: ' + err.message);
    } finally {
      setLoadingCats(false);
    }
  };

  const loadProductsForCategory = async (catId) => {
    if (!catId) return;
    setLoadingCategoryProducts(true);
    try {
      const res = await api.getCategoryProducts(catId);
      setCategoryProducts(res.data || []);
    } catch (err) {
      setErrorMsg('Failed to load products for category: ' + err.message);
    } finally {
      setLoadingCategoryProducts(false);
    }
  };

  const loadUnits = async () => {
    setLoadingUnits(true);
    try {
      const res = await api.getUnits();
      setUnits(res.data || []);
    } catch (err) {
      setErrorMsg('Failed to load units: ' + err.message);
    } finally {
      setLoadingUnits(false);
    }
  };

  useEffect(() => {
    loadCategories();
    loadUnits();
  }, []);

  // Category Actions
  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setProductFilter('');
    loadProductsForCategory(cat.id);
  };

  const handleOpenAddCat = () => {
    setEditingCat(null);
    setCatForm({ name: '', tamil_name: '', description: '', is_active: true });
    setErrorMsg('');
    setCatModalOpen(true);
  };

  const handleOpenEditCat = (cat, e) => {
    if (e) e.stopPropagation();
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      tamil_name: cat.tamil_name || '',
      description: cat.description || '',
      is_active: Boolean(cat.is_active)
    });
    setErrorMsg('');
    setCatModalOpen(true);
  };

  const handleSaveCat = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (editingCat) {
        await api.updateCategory(editingCat.id, catForm);
        setSuccessMsg(`Category "${catForm.name}" updated successfully.`);
        loadCategories(editingCat.id);
      } else {
        const res = await api.createCategory(catForm);
        setSuccessMsg(`Category "${catForm.name}" created in MySQL.`);
        loadCategories(res.data?.id);
      }
      setCatModalOpen(false);
    } catch (err) {
      setErrorMsg(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCat = async (id, name, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete category "${name}"?`)) return;
    try {
      await api.deleteCategory(id);
      setSuccessMsg(`Category "${name}" deleted.`);
      loadCategories();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Unit Actions
  const handleOpenAddUnit = () => {
    setEditingUnit(null);
    setUnitForm({ code: '', name: '', tamil_name: '', allow_decimals: false, is_active: true });
    setErrorMsg('');
    setUnitModalOpen(true);
  };

  const handleOpenEditUnit = (unit) => {
    setEditingUnit(unit);
    setUnitForm({
      code: unit.code,
      name: unit.name,
      tamil_name: unit.tamil_name || '',
      allow_decimals: Boolean(unit.allow_decimals),
      is_active: Boolean(unit.is_active)
    });
    setErrorMsg('');
    setUnitModalOpen(true);
  };

  const handleSaveUnit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (editingUnit) {
        await api.updateUnit(editingUnit.id, unitForm);
        setSuccessMsg(`Unit "${unitForm.code}" updated successfully.`);
      } else {
        await api.createUnit(unitForm);
        setSuccessMsg(`Unit "${unitForm.code}" created in MySQL.`);
      }
      setUnitModalOpen(false);
      loadUnits();
    } catch (err) {
      setErrorMsg(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (!categorySearch.trim()) return true;
    const q = categorySearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.tamil_name && c.tamil_name.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  const filteredProducts = categoryProducts.filter((p) => {
    if (!productFilter.trim()) return true;
    const q = productFilter.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.tamil_name && p.tamil_name.toLowerCase().includes(q)) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcodes && p.barcodes.toLowerCase().includes(q))
    );
  });

  const totalStockQuantity = categoryProducts.reduce(
    (sum, p) => sum + (Number(p.current_stock) || 0),
    0
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Top Header Bar */}
      <div className="bg-white px-4 py-2 border-b border-gray-300 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          {/* Compact Tabs */}
          <div className="flex bg-gray-100 p-0.5 rounded border border-gray-300">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition ${
                activeTab === 'categories'
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? 'பொருட்கள் பிரிவுகள்' : 'Product Categories'}</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono ml-0.5">
                {categories.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('units')}
              className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition ${
                activeTab === 'units'
                  ? 'bg-blue-800 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? 'அளவு அலகுகள் (Units)' : 'Units of Measurement'}</span>
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono ml-0.5">
                {units.length}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'categories' ? (
            <button
              onClick={handleOpenAddCat}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? '+ புதிய பிரிவு' : '+ Add Category'}</span>
            </button>
          ) : (
            <button
              onClick={handleOpenAddUnit}
              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? '+ புதிய அலகு' : '+ Add Unit'}</span>
            </button>
          )}
          <button
            onClick={() => {
              loadCategories();
              loadUnits();
            }}
            className="btn-secondary text-xs p-1.5"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Alert Messages */}
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-3">
        {activeTab === 'categories' ? (
          /* Master-Detail Split View: Categories on Left, Live Product Entries on Right */
          <div className="h-full flex gap-3">
            {/* Left Pane: Categories Master List (38% width) */}
            <div className="w-5/12 flex flex-col bg-white border border-gray-300 shadow-xs rounded-sm overflow-hidden">
              <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <FolderTree className="w-3.5 h-3.5 text-blue-800" />
                  <span>Categories Master ({categories.length})</span>
                </div>
                <div className="relative">
                  <Search className="w-3 h-3 absolute left-2 top-2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search category..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="form-input pl-6 py-0.5 text-xs w-36"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <table className="excel-table text-xs">
                  <thead>
                    <tr>
                      <th className="w-8 text-center">#</th>
                      <th>Category Name</th>
                      <th className="text-center w-20">Items</th>
                      <th className="text-center w-16">Status</th>
                      <th className="w-16 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCats ? (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-400">Loading categories...</td>
                      </tr>
                    ) : filteredCategories.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-8 text-gray-400">No categories found.</td>
                      </tr>
                    ) : (
                      filteredCategories.map((cat, idx) => {
                        const isSelected = selectedCategory?.id === cat.id;
                        return (
                          <tr
                            key={cat.id}
                            onClick={() => handleSelectCategory(cat)}
                            className={`cursor-pointer transition select-none ${
                              isSelected
                                ? 'bg-blue-100/90 font-bold border-l-4 border-blue-900 text-blue-950'
                                : 'hover:bg-blue-50/50'
                            }`}
                          >
                            <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                            <td>
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-bold">{cat.name}</div>
                                  {cat.tamil_name && (
                                    <div className="text-[10px] text-gray-600 font-normal">{cat.tamil_name}</div>
                                  )}
                                </div>
                                {isSelected && <ChevronRight className="w-4 h-4 text-blue-900 shrink-0" />}
                              </div>
                            </td>
                            <td className="text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                                  cat.product_count > 0
                                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                {cat.product_count || 0}
                              </span>
                            </td>
                            <td className="text-center">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  cat.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {cat.is_active ? 'Active' : 'Off'}
                              </span>
                            </td>
                            <td className="text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={(e) => handleOpenEditCat(cat, e)}
                                  className="text-blue-600 hover:text-blue-900 p-0.5"
                                  title="Edit Category"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteCat(cat.id, cat.name, e)}
                                  className="text-red-500 hover:text-red-800 p-0.5"
                                  title="Delete Category"
                                >
                                  <Trash2 className="w-3 h-3" />
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

            {/* Right Pane: Live Product Entries in Selected Category (62% width) */}
            <div className="w-7/12 flex flex-col bg-white border border-gray-300 shadow-xs rounded-sm overflow-hidden">
              {selectedCategory ? (
                <>
                  {/* Category Header */}
                  <div className="p-2.5 bg-blue-900 text-white flex items-center justify-between gap-3 shrink-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-400" />
                        <h3 className="font-bold text-sm">
                          {selectedCategory.name}
                          {selectedCategory.tamil_name && (
                            <span className="text-blue-200 font-normal ml-1.5">
                              ({selectedCategory.tamil_name})
                            </span>
                          )}
                        </h3>
                      </div>
                      <div className="text-[11px] text-blue-200 mt-0.5 flex items-center gap-2">
                        <span>Total: <b>{categoryProducts.length}</b> products</span>
                        <span>•</span>
                        <span>Stock Units: <b>{totalStockQuantity}</b></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3 h-3 absolute left-2 top-2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Filter products..."
                          value={productFilter}
                          onChange={(e) => setProductFilter(e.target.value)}
                          className="form-input pl-6 py-0.5 text-xs w-36 text-gray-900 bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingCategoryModal(selectedCategory)}
                        className="bg-blue-800 hover:bg-blue-700 text-white px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 border border-blue-600"
                        title="View Fullscreen"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Fullscreen</span>
                      </button>
                    </div>
                  </div>

                  {/* Live Products Table */}
                  <div className="flex-1 overflow-auto">
                    <table className="excel-table text-xs">
                      <thead>
                        <tr>
                          <th className="w-8 text-center">#</th>
                          <th>Product Name</th>
                          <th>SKU</th>
                          <th>Assigned Barcode(s)</th>
                          <th className="text-right">Price (₹)</th>
                          <th className="text-center">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingCategoryProducts ? (
                          <tr>
                            <td colSpan="6" className="text-center py-12 text-gray-400">
                              Loading products in {selectedCategory.name}...
                            </td>
                          </tr>
                        ) : filteredProducts.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center py-12 text-gray-400">
                              <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                              <div className="font-bold text-gray-600">
                                No products registered under &quot;{selectedCategory.name}&quot;.
                              </div>
                              <div className="text-[11px] text-gray-400 mt-1">
                                Go to Products screen to create products under this category.
                              </div>
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((p, idx) => (
                            <tr key={p.id} className="hover:bg-blue-50/50">
                              <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                              <td>
                                <div className="font-bold text-gray-900">{p.name}</div>
                                {p.tamil_name && (
                                  <div className="text-[10px] text-gray-500">{p.tamil_name}</div>
                                )}
                              </td>
                              <td className="font-mono text-indigo-700 text-[11px]">{p.sku}</td>
                              <td>
                                {p.barcodes ? (
                                  <span className="font-mono text-[11px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 px-1.5 py-0.5 rounded">
                                    {p.barcodes}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-[10px] italic">No barcode</span>
                                )}
                              </td>
                              <td className="num-cell font-bold text-gray-900">
                                ₹{Number(p.selling_price).toFixed(2)}
                              </td>
                              <td className="text-center font-mono">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    Number(p.current_stock) > 0
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {p.current_stock} {p.unit_code || 'PCS'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Summary */}
                  <div className="p-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs shrink-0">
                    <span className="text-gray-600">
                      Showing <b>{filteredProducts.length}</b> of <b>{categoryProducts.length}</b> items in {selectedCategory.name}
                    </span>
                    <span className="font-bold text-blue-900">
                      Total Category Stock: {totalStockQuantity} units
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-gray-400">
                  <FolderTree className="w-12 h-12 text-gray-300 mb-2" />
                  <div className="font-bold text-sm text-gray-600">Select a Category on the Left</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Click any category row to see all product entries registered in it.
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Units Table */
          <div className="bg-white border border-gray-300 shadow-xs h-full overflow-auto">
            <table className="excel-table text-xs">
              <thead>
                <tr>
                  <th className="w-12 text-center">#</th>
                  <th className="w-28 font-mono">{lang === 'ta' ? 'அலகு குறியீடு (Code)' : 'Unit Code'}</th>
                  <th>{lang === 'ta' ? 'அலகு பெயர் (English)' : 'Unit Name'}</th>
                  <th>{lang === 'ta' ? 'தமிழ் பெயர்' : 'Tamil Name'}</th>
                  <th className="text-center w-36">{lang === 'ta' ? 'தசம அளவு (Decimals)?' : 'Allow Decimals?'}</th>
                  <th className="text-center w-24">{t('status')}</th>
                  <th className="w-24 text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loadingUnits ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-gray-400">Loading units from MySQL...</td>
                  </tr>
                ) : units.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12 text-gray-400">No units configured.</td>
                  </tr>
                ) : (
                  units.map((unit, idx) => (
                    <tr key={unit.id} className="hover:bg-blue-50/40">
                      <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                      <td className="font-mono font-bold text-indigo-700">{unit.code}</td>
                      <td className="font-bold text-gray-900">{unit.name}</td>
                      <td className="text-gray-700">{unit.tamil_name || '-'}</td>
                      <td className="text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            unit.allow_decimals ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {unit.allow_decimals ? 'YES (e.g. 1.250 KG)' : 'NO (Integers Only)'}
                        </span>
                      </td>
                      <td className="text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            unit.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {unit.is_active ? t('active') : t('inactive')}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          onClick={() => handleOpenEditUnit(unit)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                          title="Edit Unit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fullscreen Category Products Modal Viewer */}
      {viewingCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-gray-300 overflow-hidden">
            <div className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-300" />
                <div>
                  <h3 className="font-bold text-sm">
                    Products in Category: {viewingCategoryModal.name}
                    {viewingCategoryModal.tamil_name && (
                      <span className="text-blue-200 ml-1.5 font-normal">
                        ({viewingCategoryModal.tamil_name})
                      </span>
                    )}
                  </h3>
                  <div className="text-[11px] text-blue-200">
                    Total {categoryProducts.length} product entries registered under this category
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingCategoryModal(null)}
                className="text-blue-200 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-3">
              <table className="excel-table text-xs">
                <thead>
                  <tr>
                    <th className="w-8 text-center">#</th>
                    <th>Product Name (English)</th>
                    <th>Tamil Name (தமிழ் பெயர்)</th>
                    <th>SKU Code</th>
                    <th>Assigned Barcode(s)</th>
                    <th className="text-right">Selling Price (₹)</th>
                    <th className="text-right">Purchase Cost (₹)</th>
                    <th className="text-center">Current Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryProducts.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-blue-50/50">
                      <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                      <td className="font-bold text-gray-900">{p.name}</td>
                      <td className="text-gray-700">{p.tamil_name || '-'}</td>
                      <td className="font-mono text-indigo-700 font-semibold">{p.sku}</td>
                      <td className="font-mono text-gray-600">
                        {p.barcodes ? (
                          <span className="bg-indigo-50 text-indigo-900 border border-indigo-200 px-1.5 py-0.5 rounded font-bold text-[11px]">
                            {p.barcodes}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="num-cell font-bold text-blue-900">
                        ₹{Number(p.selling_price).toFixed(2)}
                      </td>
                      <td className="num-cell text-gray-600 font-mono">
                        ₹{Number(p.purchase_price).toFixed(2)}
                      </td>
                      <td className="text-center font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            Number(p.current_stock) > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.current_stock} {p.unit_code || 'PCS'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-2.5 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs">
              <span className="text-gray-600">
                Category: <b>{viewingCategoryModal.name}</b> | Items: <b>{categoryProducts.length}</b>
              </span>
              <button
                type="button"
                onClick={() => setViewingCategoryModal(null)}
                className="btn-secondary text-xs py-1 px-3 font-semibold"
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal (Add / Edit) */}
      {catModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-300 overflow-hidden animate-fade-in">
            <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wide">
                {editingCat ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button onClick={() => setCatModalOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCat} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Category Name (English) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spices & Masala, Grains, Dairy"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Tamil Name (தமிழ் பெயர்)
                </label>
                <input
                  type="text"
                  placeholder="எ.கா. மசாலா பொருட்கள், தானியங்கள்"
                  value={catForm.tamil_name}
                  onChange={(e) => setCatForm({ ...catForm, tamil_name: e.target.value })}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows="2"
                  placeholder="Optional category notes"
                  value={catForm.description}
                  onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                  className="form-input w-full"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="catActive"
                  checked={catForm.is_active}
                  onChange={(e) => setCatForm({ ...catForm, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="catActive" className="font-semibold text-gray-700 cursor-pointer">
                  Active Category
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-1.5 px-4 font-bold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unit Modal (Add / Edit) */}
      {unitModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-300 overflow-hidden animate-fade-in">
            <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wide">
                {editingUnit ? 'Edit Unit' : 'Add New Unit'}
              </h3>
              <button onClick={() => setUnitModalOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveUnit} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Unit Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KG, LTR, PCS, GMS"
                    value={unitForm.code}
                    onChange={(e) => setUnitForm({ ...unitForm, code: e.target.value.toUpperCase() })}
                    className="form-input w-full font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Unit Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kilogram, Piece"
                    value={unitForm.name}
                    onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Tamil Name (தமிழ் பெயர்)
                </label>
                <input
                  type="text"
                  placeholder="எ.கா. கிலோகிராம், லிட்டர், துண்டு"
                  value={unitForm.tamil_name}
                  onChange={(e) => setUnitForm({ ...unitForm, tamil_name: e.target.value })}
                  className="form-input w-full"
                />
              </div>

              <div className="bg-blue-50 p-2.5 rounded border border-blue-200 space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allowDecimals"
                    checked={unitForm.allow_decimals}
                    onChange={(e) => setUnitForm({ ...unitForm, allow_decimals: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="allowDecimals" className="font-bold text-blue-950">
                    Allow Fractional / Decimal Quantities
                  </label>
                </div>
                <p className="text-[11px] text-blue-800 leading-tight">
                  Check this for weight or volume measurements (like KG, GMS, LTR, ML) so cashiers can bill fractional amounts like 0.250 KG or 1.5 LTR.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setUnitModalOpen(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-1.5 px-4 font-bold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
