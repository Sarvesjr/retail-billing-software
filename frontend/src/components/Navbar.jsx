import React, { useState, useEffect } from 'react';
import { ShoppingBag, LayoutDashboard, Calculator, Package, History, AlertTriangle, Clock } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, lowStockCount = 0, storeInfo = {} }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="main-header no-print">
      <div className="brand-section">
        <div className="brand-logo-icon">
          <ShoppingBag size={22} />
        </div>
        <div>
          <span className="brand-title">{storeInfo.name || 'SuperMart POS'}</span>
          <span className="brand-badge">Retail</span>
        </div>
      </div>

      <nav className="nav-links">
        <button
          className={`nav-link-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        <button
          className={`nav-link-btn ${activeTab === 'billing' ? 'active' : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          <Calculator size={18} />
          <span>New Bill (POS)</span>
        </button>

        <button
          className={`nav-link-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Package size={18} />
          <span>Products</span>
        </button>

        <button
          className={`nav-link-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} />
          <span>Bill History</span>
        </button>
      </nav>

      <div className="header-status-area">
        {lowStockCount > 0 && (
          <div
            className="status-chip warning"
            style={{ cursor: 'pointer' }}
            onClick={() => setActiveTab('products')}
            title="Click to view low-stock items"
          >
            <AlertTriangle size={14} />
            <span>{lowStockCount} Low Stock</span>
          </div>
        )}

        <div className="status-chip">
          <Clock size={14} />
          <span className="live-clock">{timeStr}</span>
        </div>
      </div>
    </header>
  );
}
