import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

const ALLOWED_GST_RATES = [0, 0.25, 3, 5, 12, 18, 28, 40];
const COMMON_CATEGORIES = [
  'Groceries',
  'Packaged Foods',
  'Beverages',
  'Dairy & Eggs',
  'Personal Care',
  'Household',
  'Stationery',
  'Snacks',
  'Bakery',
];

export default function ProductModal({ isOpen, onClose, onSave, product = null, categories = [] }) {
  const isEdit = !!product?.productId;

  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    productName: '',
    brand: '',
    category: 'Groceries',
    description: '',
    unit: 'piece',
    packSize: '',
    hsnCode: '',
    gstRate: 5,
    purchasePrice: 0,
    mrp: '',
    sellingPrice: '',
    stockQuantity: 10,
    reorderLevel: 5,
    active: true,
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku || '',
        barcode: product.barcode || '',
        productName: product.productName || '',
        brand: product.brand || '',
        category: product.category || 'Groceries',
        description: product.description || '',
        unit: product.unit || 'piece',
        packSize: product.packSize || '',
        hsnCode: product.hsncode || product.hsnCode || '',
        gstRate: Number(product.gstRate || 0),
        purchasePrice: product.purchasePrice || 0,
        mrp: product.mrp || '',
        sellingPrice: product.sellingPrice || '',
        stockQuantity: product.stockQuantity || 0,
        reorderLevel: product.reorderLevel || 5,
        active: product.active ?? true,
      });
    } else {
      setFormData({
        sku: 'SKU-' + Math.floor(1000 + Math.random() * 9000),
        barcode: '',
        productName: '',
        brand: '',
        category: 'Groceries',
        description: '',
        unit: 'piece',
        packSize: '',
        hsnCode: '',
        gstRate: 5,
        purchasePrice: 0,
        mrp: '',
        sellingPrice: '',
        stockQuantity: 10,
        reorderLevel: 5,
        active: true,
      });
    }
    setError('');
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.productName.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!formData.sku.trim()) {
      setError('Product SKU is required.');
      return;
    }
    if (formData.sellingPrice === '' || Number(formData.sellingPrice) < 0) {
      setError('Valid selling price is required.');
      return;
    }
    if (formData.mrp === '' || Number(formData.mrp) < 0) {
      setError('Valid MRP is required.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        purchasePrice: Number(formData.purchasePrice || 0),
        mrp: Number(formData.mrp),
        sellingPrice: Number(formData.sellingPrice),
        stockQuantity: Number(formData.stockQuantity || 0),
        reorderLevel: Number(formData.reorderLevel || 0),
        gstRate: Number(formData.gstRate),
      };
      await onSave(payload, product?.productId);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  // Merge common categories with any database categories
  const categoryOptions = Array.from(new Set([...COMMON_CATEGORIES, ...(categories || [])]));

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div
                style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger-text)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="modal-form-grid">
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  type="text"
                  name="productName"
                  className="form-input"
                  required
                  value={formData.productName}
                  onChange={handleChange}
                  placeholder="e.g. Tata Salt 1kg"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Brand</label>
                <input
                  type="text"
                  name="brand"
                  className="form-input"
                  value={formData.brand}
                  onChange={handleChange}
                  placeholder="e.g. Tata"
                />
              </div>

              <div className="form-group">
                <label className="form-label">SKU (Unique Code) *</label>
                <input
                  type="text"
                  name="sku"
                  className="form-input"
                  required
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="e.g. GRO001"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Barcode (Optional)</label>
                <input
                  type="text"
                  name="barcode"
                  className="form-input"
                  value={formData.barcode}
                  onChange={handleChange}
                  placeholder="e.g. 8901000000001"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category *</label>
                <select name="category" className="form-select" value={formData.category} onChange={handleChange}>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">HSN Code</label>
                <input
                  type="text"
                  name="hsnCode"
                  className="form-input"
                  value={formData.hsnCode}
                  onChange={handleChange}
                  placeholder="e.g. 25010010"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unit of Measure</label>
                <select name="unit" className="form-select" value={formData.unit} onChange={handleChange}>
                  <option value="piece">piece</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="l">l</option>
                  <option value="ml">ml</option>
                  <option value="pack">pack</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Pack Size</label>
                <input
                  type="text"
                  name="packSize"
                  className="form-input"
                  value={formData.packSize}
                  onChange={handleChange}
                  placeholder="e.g. 1 kg pouch"
                />
              </div>

              <div className="form-group">
                <label className="form-label">MRP (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="mrp"
                  className="form-input"
                  required
                  value={formData.mrp}
                  onChange={handleChange}
                  placeholder="Maximum Retail Price"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Selling Price (GST-Inclusive ₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="sellingPrice"
                  className="form-input"
                  required
                  value={formData.sellingPrice}
                  onChange={handleChange}
                  placeholder="Store Selling Price"
                />
              </div>

              <div className="form-group">
                <label className="form-label">GST Rate (%) *</label>
                <select name="gstRate" className="form-select" value={formData.gstRate} onChange={handleChange}>
                  {ALLOWED_GST_RATES.map((r) => (
                    <option key={r} value={r}>
                      {r}% GST
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Stock Quantity</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  name="stockQuantity"
                  className="form-input"
                  value={formData.stockQuantity}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reorder Level (Alert threshold)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  name="reorderLevel"
                  className="form-input"
                  value={formData.reorderLevel}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group" style={{ justifyContent: 'center' }}>
                <label className="form-label" style={{ marginBottom: '0.4rem' }}>Status</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={handleChange}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Product is Active for sale</span>
                </label>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Description (Optional)</label>
              <textarea
                name="description"
                className="form-input"
                rows="2"
                value={formData.description}
                onChange={handleChange}
                placeholder="Product description notes..."
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={16} />
              <span>{loading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
