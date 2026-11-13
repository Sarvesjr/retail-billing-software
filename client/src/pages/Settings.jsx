import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { Settings as SettingsIcon, Store, Printer, Database, Trash2, CheckCircle2, AlertCircle, RefreshCw, X, ShieldAlert } from 'lucide-react';

export function Settings() {
  const { t, lang } = useI18n();
  const [settings, setSettings] = useState({
    shop_name: '',
    shop_tamil_name: '',
    shop_phone: '',
    shop_address: '',
    shop_gstin: '',
    shop_fssai: '',
    receipt_footer: '',
    thermal_width: '80mm',
    currency_symbol: '₹'
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [wipeProducts, setWipeProducts] = useState(false);
  const [resetting, setResetting] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getSettings();
      setSettings(res.data);
    } catch (err) {
      setErrorMsg('Failed to load settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.updateSettings(settings);
      setSuccessMsg('Store profile and receipt settings updated in MySQL.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetData = async () => {
    setResetting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/settings/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wipeProducts })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');

      setSuccessMsg(data.message);
      setResetModalOpen(false);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Top Header */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-300 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-indigo-700" />
          <h2 className="font-bold text-sm text-gray-900">
            {lang === 'ta' ? 'கடை அமைப்புகள் & தரவுத்தள மேலாண்மை' : 'Store Settings & Database Maintenance'}
          </h2>
        </div>
      </div>

      {/* Messages */}
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

      {/* Main Settings Form */}
      <div className="flex-1 overflow-auto p-4 space-y-4 max-w-4xl">
        <form onSubmit={handleSaveSettings} className="space-y-4">
          {/* Shop Information Card */}
          <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
            <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-300" />
              <h3 className="font-bold text-xs uppercase tracking-wide">
                Store Profile &amp; Receipt Header Details
              </h3>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Shop Name (English) *</label>
                <input
                  type="text"
                  required
                  value={settings.shop_name}
                  onChange={(e) => setSettings({ ...settings, shop_name: e.target.value })}
                  className="form-input w-full font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tamil Name (கடை தமிழ் பெயர்) *</label>
                <input
                  type="text"
                  required
                  value={settings.shop_tamil_name}
                  onChange={(e) => setSettings({ ...settings, shop_tamil_name: e.target.value })}
                  className="form-input w-full font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Phone Number / Contact</label>
                <input
                  type="text"
                  value={settings.shop_phone}
                  onChange={(e) => setSettings({ ...settings, shop_phone: e.target.value })}
                  className="form-input w-full font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">GSTIN (ஜிஎஸ்டி எண்)</label>
                <input
                  type="text"
                  value={settings.shop_gstin}
                  onChange={(e) => setSettings({ ...settings, shop_gstin: e.target.value.toUpperCase() })}
                  className="form-input w-full font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">FSSAI License No</label>
                <input
                  type="text"
                  value={settings.shop_fssai}
                  onChange={(e) => setSettings({ ...settings, shop_fssai: e.target.value })}
                  className="form-input w-full font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Thermal Receipt Width</label>
                <select
                  value={settings.thermal_width}
                  onChange={(e) => setSettings({ ...settings, thermal_width: e.target.value })}
                  className="form-input w-full font-bold"
                >
                  <option value="80mm">80mm (Standard Indian 3-inch POS Printer)</option>
                  <option value="58mm">58mm (Compact 2-inch Thermal Printer)</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block font-bold text-gray-700 mb-1">Shop Address</label>
                <textarea
                  rows="2"
                  value={settings.shop_address}
                  onChange={(e) => setSettings({ ...settings, shop_address: e.target.value })}
                  className="form-input w-full"
                />
              </div>

              <div className="col-span-2">
                <label className="block font-bold text-gray-700 mb-1">Bill Footer Message / நன்றி வாசகம்</label>
                <input
                  type="text"
                  value={settings.receipt_footer}
                  onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })}
                  className="form-input w-full"
                />
              </div>
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary text-xs py-2 px-5 font-bold disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>

        {/* Database Clean & Reset Tool */}
        <div className="bg-white border border-rose-300 rounded shadow-xs overflow-hidden">
          <div className="bg-rose-900 text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-300" />
              <h3 className="font-bold text-xs uppercase tracking-wide">
                Sample Data Reset &amp; Production Prep Tool
              </h3>
            </div>
          </div>
          <div className="p-4 space-y-3 text-xs">
            <p className="text-gray-700">
              Once you finish testing with sample items, use this tool to remove fabricated test sales, purchases, and expenses so the system is clean and ready for your real retail shop operations.
            </p>

            <button
              type="button"
              onClick={() => setResetModalOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs py-2 px-4 rounded font-bold flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Reset Sample Data...</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md border border-rose-400 overflow-hidden animate-fade-in">
            <div className="bg-rose-900 text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wide">Confirm Database Reset</h3>
              <button onClick={() => setResetModalOpen(false)} className="text-rose-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="bg-rose-50 border border-rose-200 p-3 rounded text-rose-900 font-semibold leading-relaxed">
                ⚠️ This will permanently delete all test sales bills, purchase records, expenses, and scanner logs in MySQL, and reset stock balances to zero.
              </div>

              <div className="bg-gray-50 p-2.5 rounded border border-gray-200 space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="wipeProdCheck"
                    checked={wipeProducts}
                    onChange={(e) => setWipeProducts(e.target.checked)}
                    className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                  />
                  <label htmlFor="wipeProdCheck" className="font-bold text-gray-900">
                    Also delete demo sample products (Parle-G, Salt, etc.)
                  </label>
                </div>
                <p className="text-[11px] text-gray-500 pl-6">
                  Check this if you want an entirely empty product list to enter your store&apos;s real inventory from scratch.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={resetting}
                  onClick={handleResetData}
                  className="bg-rose-700 hover:bg-rose-800 text-white text-xs py-1.5 px-4 font-bold rounded shadow-md disabled:opacity-50"
                >
                  {resetting ? 'Resetting MySQL...' : 'Yes, Wipe Test Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

