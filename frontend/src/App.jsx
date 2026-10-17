import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import BillingPage from './pages/BillingPage';
import ProductsPage from './pages/ProductsPage';
import BillHistoryPage from './pages/BillHistoryPage';
import PrintableBill from './components/PrintableBill';
import { dashboardService } from './services/dashboardService';

export default function App() {
  const [activeTab, setActiveTab] = useState('billing'); // Default to POS counter
  const [storeInfo, setStoreInfo] = useState({
    name: 'SuperMart Retail Store',
    taxMode: 'INTRA_STATE',
  });
  const [lowStockCount, setLowStockCount] = useState(0);
  const [selectedBillForModal, setSelectedBillForModal] = useState(null);

  // Load store metadata and inventory alert count
  const refreshStoreData = async () => {
    try {
      const [info, summary] = await Promise.all([
        dashboardService.getStoreInfo(),
        dashboardService.getSummary(),
      ]);
      if (info) setStoreInfo(info);
      if (summary) setLowStockCount(summary.lowStockCount || 0);
    } catch (err) {
      console.warn('Could not load store metadata:', err.message);
    }
  };

  useEffect(() => {
    refreshStoreData();
  }, [activeTab]);

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lowStockCount={lowStockCount}
        storeInfo={storeInfo}
      />

      {/* Main Page Content */}
      <main>
        {activeTab === 'dashboard' && (
          <DashboardPage
            setActiveTab={setActiveTab}
            onSelectBillForView={(bill) => setSelectedBillForModal(bill)}
          />
        )}

        {activeTab === 'billing' && (
          <BillingPage
            storeInfo={storeInfo}
            onBillSaved={() => refreshStoreData()}
          />
        )}

        {activeTab === 'products' && (
          <ProductsPage
            onProductCatalogChanged={() => refreshStoreData()}
          />
        )}

        {activeTab === 'history' && (
          <BillHistoryPage
            storeInfo={storeInfo}
          />
        )}
      </main>

      {/* Selected Bill Modal from Dashboard */}
      {selectedBillForModal && (
        <PrintableBill
          bill={selectedBillForModal}
          storeInfo={storeInfo}
          onClose={() => setSelectedBillForModal(null)}
        />
      )}
    </div>
  );
}
