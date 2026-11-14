import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import {
  Package,
  ReceiptText,
  ScanBarcode,
  Database,
  TrendingUp,
  Boxes,
  CheckCircle2
} from 'lucide-react';

export function Dashboard() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    productsCount: 0,
    categoriesCount: 0,
    totalStockUnits: 0,
    totalStockValue: 0
  });
  const [recentProducts, setRecentProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [prodRes, catRes] = await Promise.all([
          api.getProducts({ limit: 10 }),
          api.getCategories()
        ]);
        const products = prodRes.data || [];
        const totalUnits = products.reduce((acc, p) => acc + Number(p.current_stock || 0), 0);
        const totalVal = products.reduce((acc, p) => acc + (Number(p.current_stock || 0) * Number(p.selling_price || 0)), 0);

        setStats({
          productsCount: prodRes.count || products.length,
          categoriesCount: (catRes.data || []).length,
          totalStockUnits: totalUnits,
          totalStockValue: totalVal
        });
        setRecentProducts(products.slice(0, 5));
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-gray-100 p-4 space-y-4">
      {/* Quick Action Shortcut Ribbon */}
      <div className="bg-white border border-gray-300 p-3 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-900">{t('dashboard')}</h2>
          <p className="text-xs text-gray-500">
            {t('systemTitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/billing')}
            className="btn-primary text-xs bg-emerald-700 hover:bg-emerald-800 border-emerald-800"
          >
            <ReceiptText className="w-3.5 h-3.5" />
            <span>F2: {t('billing')}</span>
          </button>
          <button
            onClick={() => navigate('/products')}
            className="btn-primary text-xs"
          >
            <Package className="w-3.5 h-3.5" />
            <span>F3: {t('products')}</span>
          </button>
          <button
            onClick={() => navigate('/bills')}
            className="btn-secondary text-xs"
          >
            <ReceiptText className="w-3.5 h-3.5 text-blue-700" />
            <span>F4: {t('previousBills')}</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-3.5 border border-gray-300 shadow-xs rounded-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">{t('products')}</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1 font-mono">
            {stats.productsCount}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">{t('inDatabase')}</div>
        </div>

        <div className="bg-white p-3.5 border border-gray-300 shadow-xs rounded-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">{t('categories')}</span>
            <Boxes className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1 font-mono">
            {stats.categoriesCount}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">{t('categories')}</div>
        </div>

        <div className="bg-white p-3.5 border border-gray-300 shadow-xs rounded-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">{t('currentStock')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
            {stats.totalStockUnits.toFixed(1)}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">{t('availableUnits')}</div>
        </div>

        <div className="bg-white p-3.5 border border-gray-300 shadow-xs rounded-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">{t('stockValue')}</span>
            <Database className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-1 font-mono">
            ₹{stats.totalStockValue.toFixed(2)}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">{t('estimatedValue')}</div>
        </div>
      </div>

      {/* Real-time Status Card */}
      <div className="bg-blue-50 border border-blue-200 p-3 rounded-xs flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-blue-900">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <b>Phase 1 &amp; Phase 2:</b> Single-computer foundation active. React + Electron communicates with Express backend and MySQL 9.6 database.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5 rounded">
            CAMERA READY
          </span>
          <span className="text-gray-600">
            HTTPS on port 5001 + Snap camera on port 5000
          </span>
        </div>
      </div>

      {/* Seed Products Table preview */}
      <div className="bg-white border border-gray-300 shadow-xs">
        <div className="bg-gray-100 px-3 py-2 border-b border-gray-300 font-bold text-xs text-gray-800 flex items-center justify-between">
          <span>{t('products')} ({t('inDatabase')})</span>
          <button onClick={() => navigate('/products')} className="text-blue-700 hover:underline text-xs">
            {t('products')} &rarr;
          </button>
        </div>
        <table className="excel-table text-xs">
          <thead>
            <tr>
              <th className="w-12 text-center">{t('id')}</th>
              <th>{t('sku')}</th>
              <th>{t('productName')}</th>
              <th>{t('tamilName')}</th>
              <th>{t('barcode')}</th>
              <th className="text-right">{t('sellingPrice')}</th>
              <th className="text-right">{t('currentStock')}</th>
            </tr>
          </thead>
          <tbody>
            {recentProducts.map((p) => (
              <tr key={p.id}>
                <td className="text-center font-mono text-gray-500">{p.id}</td>
                <td className="font-mono text-blue-900 font-bold">{p.sku}</td>
                <td className="font-semibold text-gray-900">{p.name}</td>
                <td className="text-gray-700">{p.tamil_name || '-'}</td>
                <td className="font-mono text-indigo-700">{p.barcodes || '-'}</td>
                <td className="num-cell font-bold">₹{Number(p.selling_price).toFixed(2)}</td>
                <td className="num-cell font-bold text-blue-900">{Number(p.current_stock).toFixed(2)} {p.unit_code}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
