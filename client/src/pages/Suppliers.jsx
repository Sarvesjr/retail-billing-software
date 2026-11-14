import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { Users2, Plus, Phone, Mail, MapPin, CheckCircle2, AlertCircle, RefreshCw, X, Edit, Trash2 } from 'lucide-react';

export function Suppliers() {
  const { t, lang } = useI18n();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSuppId, setEditingSuppId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    tamil_name: '',
    phone: '',
    email: '',
    gstin: '',
    address: '',
    city: '',
    opening_balance: 0
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.getSuppliers();
      setSuppliers(res.data || []);
    } catch (err) {
      setErrorMsg('Failed to load suppliers: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setEditingSuppId(null);
    setFormData({
      name: '',
      tamil_name: '',
      phone: '',
      email: '',
      gstin: '',
      address: '',
      city: '',
      opening_balance: 0
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supp) => {
    setIsEditMode(true);
    setEditingSuppId(supp.id);
    setFormData({
      name: supp.name,
      tamil_name: supp.tamil_name || '',
      phone: supp.phone || '',
      email: supp.email || '',
      gstin: supp.gstin || '',
      address: supp.address || '',
      city: supp.city || '',
      opening_balance: supp.opening_balance !== undefined ? Number(supp.opening_balance) : 0
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleDeleteSupplier = async (supp) => {
    if (Number(supp.current_balance) > 0) {
      alert(`Cannot delete "${supp.name}" because there is an outstanding payable balance of ₹${Number(supp.current_balance).toFixed(2)}. Please settle the balance first.`);
      return;
    }
    if (!window.confirm(`Are you sure you want to delete supplier "${supp.name}"?`)) {
      return;
    }
    try {
      await api.deleteSupplier(supp.id);
      setSuccessMsg(`Supplier "${supp.name}" deleted successfully.`);
      loadSuppliers();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete supplier');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (isEditMode && editingSuppId) {
        await api.updateSupplier(editingSuppId, formData);
        setSuccessMsg(`Supplier "${formData.name}" updated successfully.`);
      } else {
        await api.createSupplier(formData);
        setSuccessMsg(`Supplier "${formData.name}" added to MySQL.`);
      }
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingSuppId(null);
      loadSuppliers();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totalOutstanding = suppliers.reduce((acc, s) => acc + Number(s.current_balance || 0), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Top Header */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-300 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-indigo-700" />
            <h2 className="font-bold text-sm text-gray-900">
              {lang === 'ta' ? 'சரக்கு வழங்குநர்கள் (Suppliers & Vendors)' : 'Suppliers & Vendors Master'}
            </h2>
          </div>
          <div className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded font-semibold">
            Total Payable to Suppliers: <b className="font-mono">₹{totalOutstanding.toFixed(2)}</b>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ta' ? '+ புதிய வழங்குநர்' : '+ Add Supplier'}</span>
          </button>
          <button onClick={loadSuppliers} className="btn-secondary text-xs p-1.5" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
          </button>
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

      {/* Suppliers Table */}
      <div className="flex-1 overflow-auto p-3">
        <div className="bg-white border border-gray-300 shadow-xs">
          <table className="excel-table text-xs">
            <thead>
              <tr>
                <th className="w-12 text-center">#</th>
                <th>Supplier Name (English)</th>
                <th>Tamil Name (தமிழ் பெயர்)</th>
                <th>Phone</th>
                <th>GSTIN</th>
                <th>City / Address</th>
                <th className="text-center">Purchases</th>
                <th className="text-right">Total Inward (₹)</th>
                <th className="text-right">Balance Payable (₹)</th>
                <th className="w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-gray-400">Loading suppliers from MySQL...</td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-gray-400">
                    No suppliers added yet. Click &quot;+ Add Supplier&quot; to register your first distributor.
                  </td>
                </tr>
              ) : (
                suppliers.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-blue-50/40">
                    <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                    <td className="font-bold text-gray-900">{s.name}</td>
                    <td className="text-gray-700">{s.tamil_name || '-'}</td>
                    <td className="font-mono text-indigo-800">{s.phone || '-'}</td>
                    <td className="font-mono text-gray-600">{s.gstin || '-'}</td>
                    <td className="text-gray-600">{s.city ? `${s.city}` : s.address || '-'}</td>
                    <td className="text-center font-mono font-bold text-blue-700">{s.total_purchases || 0}</td>
                    <td className="num-cell font-mono">₹{Number(s.total_purchase_amount || 0).toFixed(2)}</td>
                    <td className="num-cell">
                      <span
                        className={`font-mono font-bold ${
                          Number(s.current_balance) > 0 ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        ₹{Number(s.current_balance).toFixed(2)}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1"
                          title="Edit Supplier"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSupplier(s)}
                          className="bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 px-1.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1"
                          title="Delete Supplier"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-gray-300 overflow-hidden animate-fade-in">
            <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wide">
                {isEditMode ? `Edit Supplier: ${formData.name}` : 'Add Supplier / Distributor'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Parle Agro Agency"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Tamil Name (தமிழ் பெயர்)
                  </label>
                  <input
                    type="text"
                    placeholder="எ.கா. பார்லே ஏஜென்சி"
                    value={formData.tamil_name}
                    onChange={(e) => setFormData({ ...formData, tamil_name: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-input w-full font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="form-input w-full font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">City / Town</label>
                  <input
                    type="text"
                    placeholder="e.g. Madurai, Chennai"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Opening Balance (₹)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.opening_balance}
                    onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
                    className="form-input w-full font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Address</label>
                <textarea
                  rows="2"
                  placeholder="Street address, shop number, etc."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="form-input w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-1.5 px-4 font-bold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : isEditMode ? 'Update Supplier' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

