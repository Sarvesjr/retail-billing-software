import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import {
  Search,
  Plus,
  Layers,
  Edit2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Package,
  RefreshCw,
} from 'lucide-react';
import ProductModal from '../components/ProductModal';
import StockModal from '../components/StockModal';

export default function ProductsPage({ onProductCatalogChanged }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL'); // ALL, IN_STOCK, LOW_STOCK, OUT_OF_STOCK, INACTIVE
  const [sortBy, setSortBy] = useState('product_name');
  const [sortOrder, setSortOrder] = useState('ASC');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockProduct, setStockProduct] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const [prods, cats] = await Promise.all([
        productService.getAll({
          search: search.trim() || undefined,
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          sortBy,
          sortOrder,
        }),
        productService.getCategories(),
      ]);
      setProducts(prods || []);
      setCategories(cats || []);
    } catch (err) {
      console.error('Failed to load products:', err);
      setError(err.message || 'Error fetching products catalogue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  // Local client filtering for stock status
  const displayedProducts = products.filter((p) => {
    const stock = Number(p.stockQuantity || 0);
    const reorder = Number(p.reorderLevel || 5);

    if (stockFilter === 'INACTIVE') return !p.active;
    if (stockFilter === 'OUT_OF_STOCK') return stock <= 0;
    if (stockFilter === 'LOW_STOCK') return stock > 0 && stock <= reorder;
    if (stockFilter === 'IN_STOCK') return stock > reorder;
    return true;
  });

  const handleSaveProduct = async (productData, existingId) => {
    if (existingId) {
      await productService.update(existingId, productData);
    } else {
      await productService.create(productData);
    }
    fetchProducts();
    if (onProductCatalogChanged) onProductCatalogChanged();
  };

  const handleUpdateStock = async (productId, newStock) => {
    await productService.updateStock(productId, newStock);
    fetchProducts();
    if (onProductCatalogChanged) onProductCatalogChanged();
  };

  const handleToggleStatus = async (product) => {
    const newStatus = !product.active;
    const actionText = newStatus ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${actionText} '${product.productName}'?`)) {
      return;
    }

    try {
      await productService.updateStatus(product.productId, newStatus);
      fetchProducts();
      if (onProductCatalogChanged) onProductCatalogChanged();
    } catch (err) {
      alert(err.message || 'Failed to update product status');
    }
  };

  const fmt = (v) => Number(v || 0).toFixed(2);

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="page-top-bar">
        <div className="page-title-group">
          <h1>Product Catalogue & Inventory</h1>
          <p>Manage product master, prices, GST rates and stock quantities ({products.length} total)</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={fetchProducts} disabled={loading} title="Reload catalogue">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ flex: '1 1 280px', display: 'flex', gap: '0.5rem' }}>
          <div className="search-input-wrapper" style={{ flex: 1 }}>
            <Search size={18} className="search-icon-inside" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by Name, SKU, or Barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
          {search && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                productService.getAll({ category: selectedCategory !== 'ALL' ? selectedCategory : undefined, sortBy, sortOrder })
                  .then(setProducts);
              }}
            >
              Clear
            </button>
          )}
        </form>

        {/* Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Category:</label>
          <select
            className="form-select"
            style={{ width: '150px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Stock Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Stock:</label>
          <select
            className="form-select"
            style={{ width: '140px' }}
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="ALL">All Stock</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Sort:</label>
          <select
            className="form-select"
            style={{ width: '140px' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="product_name">Name</option>
            <option value="selling_price">Selling Price</option>
            <option value="stock_quantity">Stock Level</option>
            <option value="category">Category</option>
          </select>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))}
            title="Toggle sort direction"
          >
            {sortOrder}
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            Loading products...
          </div>
        ) : displayedProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            No products match the selected filters.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product & Brand</th>
                <th>SKU / Barcode</th>
                <th>Category</th>
                <th>MRP / Price (Incl. GST)</th>
                <th>GST Rate</th>
                <th>Stock</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.map((p) => {
                const stock = Number(p.stockQuantity || 0);
                const reorder = Number(p.reorderLevel || 5);
                const isOut = stock <= 0;
                const isLow = stock > 0 && stock <= reorder;

                return (
                  <tr key={p.productId} style={{ opacity: p.active ? 1 : 0.65 }}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{p.productName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {p.brand && <span>{p.brand} • </span>}
                        <span>{p.packSize || p.unit}</span>
                      </div>
                    </td>

                    <td>
                      <span className="table-code">{p.sku}</span>
                      {p.barcode && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {p.barcode}
                        </div>
                      )}
                    </td>

                    <td>{p.category}</td>

                    <td>
                      <div className="price-cell">₹{fmt(p.sellingPrice)}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        MRP: ₹{fmt(p.mrp)}
                      </div>
                    </td>

                    <td>
                      <span className="badge badge-muted">{Number(p.gstRate)}%</span>
                      {p.hsncode && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '0.15rem' }}>
                          HSN: {p.hsncode}
                        </div>
                      )}
                    </td>

                    <td>
                      <span className={`badge ${isOut ? 'badge-danger' : isLow ? 'badge-warning' : 'badge-success'}`}>
                        {stock} {p.unit}
                      </span>
                      {isLow && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--warning-text)', marginTop: '0.2rem' }}>
                          Reorder ≤ {reorder}
                        </div>
                      )}
                    </td>

                    <td>
                      <span className={`badge ${p.active ? 'badge-success' : 'badge-muted'}`}>
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary btn-icon"
                          title="Quick Update Stock"
                          onClick={() => setStockProduct(p)}
                        >
                          <Layers size={14} />
                        </button>

                        <button
                          className="btn btn-secondary btn-icon"
                          title="Edit Product"
                          onClick={() => {
                            setEditingProduct(p);
                            setIsProductModalOpen(true);
                          }}
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          className="btn btn-secondary btn-icon"
                          title={p.active ? 'Deactivate Product' : 'Activate Product'}
                          onClick={() => handleToggleStatus(p)}
                          style={{ color: p.active ? 'var(--text-muted)' : 'var(--success)' }}
                        >
                          {p.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <ProductModal
        isOpen={isProductModalOpen}
        product={editingProduct}
        categories={categories}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
      />

      {/* Quick Stock Modal */}
      <StockModal
        isOpen={!!stockProduct}
        product={stockProduct}
        onClose={() => setStockProduct(null)}
        onUpdateStock={handleUpdateStock}
      />
    </div>
  );
}
