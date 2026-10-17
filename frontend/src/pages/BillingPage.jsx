import React, { useState, useEffect } from 'react';
import { productService } from '../services/productService';
import { billService } from '../services/billService';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  Save,
  RotateCcw,
  AlertCircle,
  Tag,
  CreditCard,
  Percent,
} from 'lucide-react';
import PrintableBill from '../components/PrintableBill';

export default function BillingPage({ storeInfo = {}, onBillSaved }) {
  // Products catalog state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Cart state
  // Each item: { product, quantity, discountAmount }
  const [cart, setCart] = useState([]);

  // Bill level configuration
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [taxMode, setTaxMode] = useState(storeInfo.taxMode || 'INTRA_STATE');
  const [additionalDiscount, setAdditionalDiscount] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [savedBillForPrint, setSavedBillForPrint] = useState(null);

  // Load products & categories from backend
  const loadCatalog = async () => {
    try {
      setLoadingProducts(true);
      const [prods, cats] = await Promise.all([
        productService.getAll({ activeOnly: true }),
        productService.getCategories(),
      ]);
      setProducts(prods || []);
      setCategories(cats || []);
    } catch (err) {
      console.error('Failed to load products for POS:', err);
      setErrorBanner('Could not fetch active products from database.');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  // Update taxMode when storeInfo is loaded
  useEffect(() => {
    if (storeInfo.taxMode) {
      setTaxMode(storeInfo.taxMode);
    }
  }, [storeInfo]);

  // Filter products by search and category
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCat;
    const matchesQuery =
      p.productName.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q));
    return matchesCat && matchesQuery;
  });

  // Cart actions
  const addToCart = (product) => {
    setErrorBanner('');
    if (!product.active) {
      setErrorBanner(`Product '${product.productName}' is not active.`);
      return;
    }
    const currentStock = Number(product.stockQuantity || 0);
    if (currentStock <= 0) {
      setErrorBanner(`Product '${product.productName}' is out of stock.`);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.productId === product.productId);
      if (existingIndex > -1) {
        const item = prev[existingIndex];
        const newQty = item.quantity + 1;
        if (newQty > currentStock) {
          setErrorBanner(`Cannot add more than available stock (${currentStock} ${product.unit}).`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = { ...item, quantity: newQty };
        return updated;
      } else {
        return [...prev, { product, quantity: 1, discountAmount: 0 }];
      }
    });
  };

  const updateQuantity = (productId, delta) => {
    setErrorBanner('');
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.productId === productId) {
            const currentStock = Number(item.product.stockQuantity || 0);
            const newQty = Number(item.quantity) + delta;
            if (newQty <= 0) return null;
            if (newQty > currentStock) {
              setErrorBanner(`Cannot exceed available stock of ${currentStock} ${item.product.unit}.`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const setDirectQuantity = (productId, val) => {
    setErrorBanner('');
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) return;
    setCart((prev) => {
      return prev.map((item) => {
        if (item.product.productId === productId) {
          const currentStock = Number(item.product.stockQuantity || 0);
          if (num > currentStock) {
            setErrorBanner(`Cannot exceed available stock of ${currentStock} ${item.product.unit}.`);
            return { ...item, quantity: currentStock };
          }
          return { ...item, quantity: num };
        }
        return item;
      });
    });
  };

  const updateDiscount = (productId, val) => {
    const disc = parseFloat(val) || 0;
    setCart((prev) => {
      return prev.map((item) => {
        if (item.product.productId === productId) {
          const maxGross = Number(item.product.sellingPrice) * item.quantity;
          const safeDisc = Math.min(Math.max(0, disc), maxGross);
          return { ...item, discountAmount: safeDisc };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.product.productId !== productId));
  };

  const clearCart = () => {
    if (cart.length > 0 && !window.confirm('Are you sure you want to clear all items in the cart?')) {
      return;
    }
    setCart([]);
    setAdditionalDiscount('');
    setErrorBanner('');
  };

  // Real-time calculations (Selling Price is GST inclusive)
  const isInterState = taxMode === 'INTER_STATE';

  let subtotalGross = 0;
  let totalLineDiscounts = 0;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  cart.forEach((item) => {
    const unitPrice = Number(item.product.sellingPrice || 0);
    const qty = Number(item.quantity || 0);
    const gross = unitPrice * qty;
    const disc = Number(item.discountAmount || 0);
    const lineTotal = Math.max(0, gross - disc);
    const gstRate = Number(item.product.gstRate || 0);

    let taxable = lineTotal;
    let tax = 0;
    if (gstRate > 0) {
      const divisor = 1 + gstRate / 100;
      taxable = lineTotal / divisor;
      tax = lineTotal - taxable;
    }

    subtotalGross += gross;
    totalLineDiscounts += disc;
    totalTaxable += taxable;

    if (isInterState) {
      totalIgst += tax;
    } else {
      totalCgst += tax / 2;
      totalSgst += tax / 2;
    }
  });

  const billExtraDiscount = Math.max(0, parseFloat(additionalDiscount) || 0);
  const overallDiscount = totalLineDiscounts + billExtraDiscount;
  const netBeforeRound = Math.max(0, subtotalGross - overallDiscount);
  const grandTotalRounded = Math.round(netBeforeRound);
  const roundOff = grandTotalRounded - netBeforeRound;

  // Format helper
  const fmt = (v) => Number(v || 0).toFixed(2);

  // Save bill handler
  const handleSaveBill = async (shouldPrint = false) => {
    if (cart.length === 0) {
      setErrorBanner('Cart is empty. Add at least one product before saving.');
      return;
    }

    setErrorBanner('');
    setSaving(true);

    try {
      const payload = {
        paymentMethod,
        taxMode,
        additionalDiscount: billExtraDiscount,
        items: cart.map((item) => ({
          productId: item.product.productId,
          quantity: item.quantity,
          discountAmount: item.discountAmount,
        })),
      };

      const saved = await billService.create(payload);

      // Successfully saved!
      // 1. Clear cart
      setCart([]);
      setAdditionalDiscount('');

      // 2. Refresh catalog stock in background
      loadCatalog();

      // 3. Notify parent (e.g. for dashboard counter update)
      if (onBillSaved) onBillSaved(saved);

      // 4. Open printable bill modal
      setSavedBillForPrint(saved);

      // 5. If print was requested, print dialog opens
      if (shouldPrint) {
        setTimeout(() => {
          window.print();
        }, 300);
      }
    } catch (err) {
      console.error('Failed to create bill:', err);
      setErrorBanner(err.message || 'Failed to save bill. Please check stock and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      {/* Top Bar */}
      <div className="page-top-bar no-print">
        <div className="page-title-group">
          <h1>Point of Sale (POS)</h1>
          <p>Scan or search products, manage customer cart, and generate tax invoices</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={clearCart} disabled={cart.length === 0 || saving}>
            <RotateCcw size={16} />
            <span>Clear Cart</span>
          </button>
        </div>
      </div>

      {errorBanner && (
        <div
          className="no-print"
          style={{
            background: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={18} />
          <span>{errorBanner}</span>
        </div>
      )}

      {/* POS Two-Column Workspace */}
      <div className="pos-layout">
        {/* Left Column: Product Selection & Catalog */}
        <div className="pos-catalog-panel no-print">
          {/* Search bar */}
          <div className="catalog-search-bar">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon-inside" />
              <input
                type="text"
                className="search-input"
                placeholder="Search products by Name, SKU, or Barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            {searchQuery && (
              <button className="btn btn-secondary btn-sm" onClick={() => setSearchQuery('')}>
                Clear
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="category-chips">
            <button
              className={`category-chip ${selectedCategory === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('ALL')}
            >
              All Items ({products.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Product Cards Grid */}
          {loadingProducts ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              No products found matching "{searchQuery}".
            </div>
          ) : (
            <div className="product-picker-grid">
              {filteredProducts.map((p) => {
                const stock = Number(p.stockQuantity || 0);
                const isOut = stock <= 0;
                const isLow = stock > 0 && stock <= Number(p.reorderLevel || 5);

                return (
                  <div
                    key={p.productId}
                    className={`product-picker-card ${isOut ? 'out-of-stock' : ''}`}
                    onClick={() => !isOut && addToCart(p)}
                    title={isOut ? 'Out of stock' : 'Click to add to cart'}
                  >
                    <div className="picker-card-header">
                      <span className="picker-product-sku">{p.sku}</span>
                      <div className="picker-product-name">{p.productName}</div>
                      <div className="picker-product-category">{p.packSize || p.unit}</div>
                    </div>

                    <div className="picker-card-footer">
                      <div className="picker-price-area">
                        <span className="picker-price">₹{fmt(p.sellingPrice)}</span>
                        <span className="picker-gst-tag">GST {Number(p.gstRate)}% incl.</span>
                      </div>
                      <span
                        className={`picker-stock-tag ${
                          isOut ? 'no-stock' : isLow ? 'low-stock' : 'in-stock'
                        }`}
                      >
                        {isOut ? 'Out' : `${stock} ${p.unit}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: POS Cart & Checkout Summary */}
        <div className="pos-cart-panel no-print">
          <div className="cart-header">
            <div className="cart-header-title">
              <ShoppingCart size={20} color="var(--primary)" />
              <span>Current Cart</span>
              <span className="cart-count-badge">{cart.length} items</span>
            </div>
            {cart.length > 0 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={clearCart}
                style={{ color: 'var(--danger)', borderColor: '#fca5a5' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Cart Item List */}
          <div className="cart-items-container">
            {cart.length === 0 ? (
              <div className="cart-empty-state">
                <ShoppingCart size={36} className="cart-empty-icon" />
                <p style={{ fontWeight: 600 }}>Cart is empty</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', marginTop: '0.25rem' }}>
                  Click any product on the left or scan a barcode to add it to the bill.
                </p>
              </div>
            ) : (
              cart.map((item) => {
                const unitPrice = Number(item.product.sellingPrice || 0);
                const gross = unitPrice * item.quantity;
                const lineTotal = Math.max(0, gross - (item.discountAmount || 0));

                return (
                  <div key={item.product.productId} className="cart-item-row">
                    <div className="cart-item-info">
                      <span className="cart-item-title">{item.product.productName}</span>
                      <span className="cart-item-sub">
                        ₹{fmt(unitPrice)} × {item.quantity} {item.product.unit} (GST {Number(item.product.gstRate)}%)
                      </span>
                    </div>

                    {/* Qty +/- Controls */}
                    <div className="qty-counter">
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => updateQuantity(item.product.productId, -1)}
                        title="Decrease"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        className="qty-input"
                        value={item.quantity}
                        min="0.001"
                        step={item.product.unit === 'kg' ? '0.1' : '1'}
                        onChange={(e) => setDirectQuantity(item.product.productId, e.target.value)}
                      />
                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() => updateQuantity(item.product.productId, 1)}
                        title="Increase"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Line discount */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Disc ₹"
                        className="form-input"
                        style={{ width: '60px', padding: '0.2rem 0.4rem', fontSize: '0.75rem', textAlign: 'right' }}
                        value={item.discountAmount || ''}
                        onChange={(e) => updateDiscount(item.product.productId, e.target.value)}
                        title="Line item discount in ₹"
                      />
                    </div>

                    {/* Line Total */}
                    <div className="cart-item-total">
                      ₹{fmt(lineTotal)}
                    </div>

                    {/* Remove button */}
                    <button
                      className="btn btn-secondary btn-icon"
                      onClick={() => removeFromCart(item.product.productId)}
                      title="Remove item"
                      style={{ color: 'var(--danger)', padding: '0.25rem' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* POS Bill Config */}
          <div className="pos-controls-row">
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                className="form-select"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="CARD">Credit/Debit Card</option>
                <option value="OTHER">Other / Credit</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Tax Mode</label>
              <select
                className="form-select"
                value={taxMode}
                onChange={(e) => setTaxMode(e.target.value)}
              >
                <option value="INTRA_STATE">Intra-State (CGST + SGST)</option>
                <option value="INTER_STATE">Inter-State (IGST)</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Additional Bill Discount (₹)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-input"
              placeholder="e.g. 10.00"
              value={additionalDiscount}
              onChange={(e) => setAdditionalDiscount(e.target.value)}
            />
          </div>

          {/* Bill Summary Box */}
          <div className="bill-summary-box">
            <div className="summary-line">
              <span>Gross Subtotal:</span>
              <span className="summary-val">₹{fmt(subtotalGross)}</span>
            </div>

            {overallDiscount > 0 && (
              <div className="summary-line" style={{ color: 'var(--danger)' }}>
                <span>Total Discount:</span>
                <span className="summary-val" style={{ color: 'var(--danger)' }}>
                  -₹{fmt(overallDiscount)}
                </span>
              </div>
            )}

            <div className="summary-line">
              <span>Taxable Value:</span>
              <span className="summary-val">₹{fmt(totalTaxable)}</span>
            </div>

            {!isInterState ? (
              <>
                <div className="summary-line tax">
                  <span>CGST:</span>
                  <span className="summary-val">₹{fmt(totalCgst)}</span>
                </div>
                <div className="summary-line tax">
                  <span>SGST:</span>
                  <span className="summary-val">₹{fmt(totalSgst)}</span>
                </div>
              </>
            ) : (
              <div className="summary-line tax">
                <span>IGST:</span>
                <span className="summary-val">₹{fmt(totalIgst)}</span>
              </div>
            )}

            {roundOff !== 0 && (
              <div className="summary-line">
                <span>Round Off:</span>
                <span className="summary-val">{roundOff > 0 ? `+₹${fmt(roundOff)}` : `-₹${fmt(Math.abs(roundOff))}`}</span>
              </div>
            )}

            <div className="summary-line grand">
              <span>NET PAYABLE:</span>
              <span className="summary-val grand">₹{fmt(grandTotalRounded)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="cart-actions-row">
            <button
              className="btn btn-secondary"
              disabled={cart.length === 0 || saving}
              onClick={() => handleSaveBill(false)}
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Bill'}</span>
            </button>

            <button
              className="btn btn-primary"
              disabled={cart.length === 0 || saving}
              onClick={() => handleSaveBill(true)}
            >
              <Printer size={16} />
              <span>{saving ? 'Processing...' : 'Save & Print'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Print & Receipt Preview Modal */}
      {savedBillForPrint && (
        <PrintableBill
          bill={savedBillForPrint}
          storeInfo={storeInfo}
          onClose={() => setSavedBillForPrint(null)}
        />
      )}
    </div>
  );
}
