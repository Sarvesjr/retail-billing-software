import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { api } from '../services/api';
import { SCAN_EVENT } from './BarcodeListener';
import { Database, Smartphone, Globe, Clock, PlusCircle } from 'lucide-react';

export function Navbar() {
  const { lang, toggleLanguage, t } = useI18n();
  const navigate = useNavigate();
  const [dbStatus, setDbStatus] = useState('checking');
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [lastScanAlert, setLastScanAlert] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);

    const checkDb = async () => {
      try {
        const res = await api.getHealth();
        setDbStatus(res.database === 'connected' ? 'online' : 'offline');
      } catch (err) {
        setDbStatus('offline');
      }
    };

    checkDb();
    const dbInterval = setInterval(checkDb, 15000);

    // Listen for incoming scans from mobile or hardware scanner
    const handleScan = (e) => {
      const data = e.detail;
      if (data && data.barcode) {
        setLastScanAlert(data);
      }
    };

    window.addEventListener(SCAN_EVENT, handleScan);

    return () => {
      clearInterval(timer);
      clearInterval(dbInterval);
      window.removeEventListener(SCAN_EVENT, handleScan);
    };
  }, []);

  const handleAddScanned = () => {
    navigate('/products');
  };

  return (
    <header className="bg-blue-900 text-white px-4 py-2 flex items-center justify-between border-b border-blue-950 shadow-sm select-none">
      <div className="flex items-center gap-3">
        <div className="bg-yellow-400 text-blue-950 px-2 py-0.5 rounded text-xs font-black tracking-wider uppercase">
          RETAIL POS
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
            {t('appName')}
            <span className="text-xs font-normal text-blue-200">| {t('singlePcNotice')}</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs">
        {/* Live Scanned Barcode Alert Pill */}
        {lastScanAlert && (
          <button
            onClick={handleAddScanned}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-400 text-amber-950 hover:bg-amber-300 font-bold border border-amber-500 shadow-xs animate-bounce"
            title="Click to add this scanned barcode as a product"
          >
            <PlusCircle className="w-3.5 h-3.5 text-blue-900" />
            <span>Scanned: {lastScanAlert.barcode} {lastScanAlert.found ? `(${lastScanAlert.product?.name})` : '(New)'}</span>
          </button>
        )}

        {/* MySQL Database Status */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-950 border border-blue-800">
          <Database className={`w-3.5 h-3.5 ${dbStatus === 'online' ? 'text-green-400' : 'text-red-400'}`} />
          <span className="font-mono">
            MySQL 9: {dbStatus === 'online' ? <span className="text-green-400 font-semibold">CONNECTED</span> : <span className="text-red-400 font-semibold">OFFLINE</span>}
          </span>
        </div>

        {/* Phone Scanner Link */}
        <a
          href="https://10.159.238.198:5001/phone-scanner"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-600 transition"
          title="Open Mobile Camera Barcode Scanner"
        >
          <Smartphone className="w-3.5 h-3.5 text-yellow-300" />
          <span>{t('openPhoneScanner')}</span>
        </a>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-800 hover:bg-blue-700 text-white border border-blue-600 transition font-bold"
          title="Switch Language: தமிழ் / English"
        >
          <Globe className="w-3.5 h-3.5 text-yellow-300" />
          <span>{lang === 'ta' ? 'English' : 'தமிழ்'}</span>
        </button>

        {/* Clock */}
        <div className="flex items-center gap-1 text-blue-200 font-mono px-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{time}</span>
        </div>
      </div>
    </header>
  );
}
