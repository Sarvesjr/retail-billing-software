import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { I18nProvider } from './i18n';
import { BarcodeListener } from './components/BarcodeListener';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Products } from './pages/Products';
import { PreviousBills } from './pages/PreviousBills';
import { BarcodeDiagnostic } from './pages/BarcodeDiagnostic';
import { Billing } from './pages/Billing';
import { Categories } from './pages/Categories';
import { BarcodeManagement } from './pages/BarcodeManagement';
import { Purchases } from './pages/Purchases';
import { Suppliers } from './pages/Suppliers';
import { Customers } from './pages/Customers';
import { Inventory } from './pages/Inventory';
import { SalesReturns } from './pages/SalesReturns';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

function KeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        navigate('/');
      } else if (e.key === 'F2') {
        e.preventDefault();
        navigate('/billing');
      } else if (e.key === 'F3') {
        e.preventDefault();
        navigate('/products');
      } else if (e.key === 'F4') {
        e.preventDefault();
        navigate('/bills');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return null;
}

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <BarcodeListener>
          <KeyboardShortcuts />
          <div className="flex flex-col h-screen w-screen overflow-hidden">
            <Navbar />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 flex flex-col overflow-hidden bg-gray-100">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/bills" element={<PreviousBills />} />
                  <Route path="/diagnostic" element={<PreviousBills />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/barcodes" element={<BarcodeManagement />} />
                  <Route path="/purchases" element={<Purchases />} />
                  <Route path="/suppliers" element={<Suppliers />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/sales-returns" element={<SalesReturns />} />
                  <Route path="/purchase-returns" element={<Purchases />} />
                  <Route path="/outstanding" element={<Customers />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/users" element={<Settings />} />
                </Routes>
              </main>
            </div>
          </div>
        </BarcodeListener>
      </BrowserRouter>
    </I18nProvider>
  );
}
