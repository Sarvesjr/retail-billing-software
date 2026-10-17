import React, { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboardService';
import { billService } from '../services/billService';
import { Package, Receipt, IndianRupee, AlertTriangle, ArrowRight, Layers, Eye } from 'lucide-react';
import StockModal from '../components/StockModal';
import { productService } from '../services/productService';

export default function DashboardPage({ setActiveTab, onSelectBillForView }) {
  const [summary, setSummary] = useState(null);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentBills, setRecentBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Stock edit modal
  const [stockModalProduct, setStockModalProduct] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [sumData, lowData, billsData] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getLowStock(6),
        billService.getAll({ limit: 5 }),
      ]);
      setSummary(sumData);
      setLowStockProducts(lowData || []);
      setRecentBills((billsData || []).slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Error loading dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStock = async (productId, newStock) => {
    await productService.updateStock(productId, newStock);
    loadData();
  };

  const fmt = (v) => Number(v || 0).toFixed(2);

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          Loading dashboard metrics...
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Top Banner */}
      <div className="page-top-bar">
        <div className="page-title-group">
          <h1>Store Dashboard</h1>
          <p>Real-time retail metrics, inventory alerts and sales summary</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-primary" onClick={() => setActiveTab('billing')}>
            <span>Open POS Counter</span>
            <ArrowRight size={16} />
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
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-data">
            <h3>Active Products</h3>
            <div className="metric-value">{summary?.activeProducts ?? 0}</div>
            <div className="metric-sub">out of {summary?.totalProducts ?? 0} catalog items</div>
          </div>
          <div className="metric-icon-box blue">
            <Package size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-data">
            <h3>Bills Generated</h3>
            <div className="metric-value">{summary?.totalBills ?? 0}</div>
            <div className="metric-sub">All-time invoices generated</div>
          </div>
          <div className="metric-icon-box purple">
            <Receipt size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-data">
            <h3>Today's Sales</h3>
            <div className="metric-value">₹{fmt(summary?.todaySales)}</div>
            <div className="metric-sub">Total: ₹{fmt(summary?.totalSales)}</div>
          </div>
          <div className="metric-icon-box green">
            <IndianRupee size={24} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-data">
            <h3>Low-Stock Items</h3>
            <div className="metric-value" style={{ color: (summary?.lowStockCount || 0) > 0 ? 'var(--warning)' : 'inherit' }}>
              {summary?.lowStockCount ?? 0}
            </div>
            <div className="metric-sub">Below reorder threshold</div>
          </div>
          <div className="metric-icon-box amber">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Low Stock Alerts + Recent Bills */}
      <div className="dashboard-grid">
        {/* Left: Low Stock Inventory Alerts */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <AlertTriangle size={18} color="var(--warning)" />
              <span>Low-Stock Inventory Alerts</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('products')}>
              Manage All Products
            </button>
          </div>

          {lowStockProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              All inventory levels are healthy! No items currently below reorder levels.
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Available</th>
                    <th>Reorder Level</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((p) => {
                    const isOutOfStock = Number(p.stockQuantity) <= 0;
                    return (
                      <tr key={p.productId}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{p.productName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SKU: {p.sku}</div>
                        </td>
                        <td>{p.category}</td>
                        <td>
                          <span className={`badge ${isOutOfStock ? 'badge-danger' : 'badge-warning'}`}>
                            {Number(p.stockQuantity)} {p.unit}
                          </span>
                        </td>
                        <td>{Number(p.reorderLevel)} {p.unit}</td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setStockModalProduct(p)}
                          >
                            <Layers size={14} />
                            <span>Restock</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Recent Bills Generated */}
        <div className="dashboard-card">
          <div className="dashboard-card-header">
            <div className="dashboard-card-title">
              <Receipt size={18} color="var(--primary)" />
              <span>Recent Invoices</span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('history')}>
              View All
            </button>
          </div>

          {recentBills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
              No bills generated yet today. Open POS to generate your first invoice!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentBills.map((b) => (
                <div
                  key={b.billId}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    background: '#ffffff',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{b.billNumber}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(b.billDate || b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} •{' '}
                      <strong>{b.paymentMethod}</strong>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        ₹{fmt(b.grandTotal)}
                      </div>
                      <span className={`badge ${b.paymentStatus === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
                        {b.paymentStatus}
                      </span>
                    </div>
                    <button
                      className="btn btn-secondary btn-icon"
                      title="View Bill Details"
                      onClick={() => onSelectBillForView(b)}
                    >
                      <Eye size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stock Modal */}
      <StockModal
        isOpen={!!stockModalProduct}
        product={stockModalProduct}
        onClose={() => setStockModalProduct(null)}
        onUpdateStock={handleUpdateStock}
      />
    </div>
  );
}
