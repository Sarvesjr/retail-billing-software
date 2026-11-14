import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { UserCheck, Plus, Search, Phone, IndianRupee, History, CheckCircle2, AlertCircle, RefreshCw, X, Edit, Trash2 } from 'lucide-react';

export function Customers() {
  const { t, lang } = useI18n();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Add / Edit Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCustId, setEditingCustId] = useState(null);
  const [custForm, setCustForm] = useState({
    name: '',
    tamil_name: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: 5000
  });

  // Payment Collection Modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedCust, setSelectedCust] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('CASH');
  const [payNotes, setPayNotes] = useState('');

  // Ledger History Modal
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [ledgerCust, setLedgerCust] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.getCustomers({ search });
      setCustomers(res.data || []);
    } catch (err) {
      setErrorMsg('Failed to load customers: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [search]);

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setEditingCustId(null);
    setCustForm({
      name: '',
      tamil_name: '',
      phone: '',
      email: '',
      address: '',
      credit_limit: 5000
    });
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (cust) => {
    setIsEditMode(true);
    setEditingCustId(cust.id);
    setCustForm({
      name: cust.name,
      tamil_name: cust.tamil_name || '',
      phone: cust.phone || '',
      email: cust.email || '',
      address: cust.address || '',
      credit_limit: cust.credit_limit !== undefined ? Number(cust.credit_limit) : 5000
    });
    setErrorMsg('');
    setIsAddModalOpen(true);
  };

  const handleDeleteCustomer = async (cust) => {
    if (Number(cust.current_balance) > 0) {
      alert(`Cannot delete "${cust.name}" because they have an active Udhar balance of ₹${Number(cust.current_balance).toFixed(2)}. Please collect the balance first.`);
      return;
    }
    if (!window.confirm(`Are you sure you want to delete customer "${cust.name}"?`)) {
      return;
    }
    try {
      await api.deleteCustomer(cust.id);
      setSuccessMsg(`Customer "${cust.name}" deleted successfully.`);
      loadCustomers();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete customer');
    }
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      if (isEditMode && editingCustId) {
        await api.updateCustomer(editingCustId, custForm);
        setSuccessMsg(`Customer "${custForm.name}" updated successfully.`);
      } else {
        await api.createCustomer(custForm);
        setSuccessMsg(`Customer "${custForm.name}" registered in MySQL.`);
      }
      setIsAddModalOpen(false);
      setIsEditMode(false);
      setEditingCustId(null);
      loadCustomers();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPayment = (cust) => {
    setSelectedCust(cust);
    setPayAmount(String(cust.current_balance > 0 ? cust.current_balance : ''));
    setPayMode('CASH');
    setPayNotes('Udhar Collection');
    setErrorMsg('');
    setPayModalOpen(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    if (!payAmount || Number(payAmount) <= 0) {
      setErrorMsg('Enter a valid payment amount');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.createCustomerPayment({
        customer_id: selectedCust.id,
        amount: Number(payAmount),
        payment_mode: payMode,
        notes: payNotes
      });
      setSuccessMsg(`Payment of ₹${payAmount} collected from ${selectedCust.name}. Remaining Udhar: ₹${res.data.remainingBalance.toFixed(2)}`);
      setPayModalOpen(false);
      loadCustomers();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenLedger = async (cust) => {
    setLedgerCust(cust);
    setLedgerModalOpen(true);
    setLoadingLedger(true);
    try {
      const res = await fetch(`/api/customers/${cust.id}/ledger`);
      const json = await res.json();
      setLedgerEntries(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLedger(false);
    }
  };

  const totalUdhar = customers.reduce((acc, c) => acc + Number(c.current_balance || 0), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Top Header */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-300 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-700" />
            <h2 className="font-bold text-sm text-gray-900">
              {lang === 'ta' ? 'வாடிக்கையாளர்கள் & கடன் கணக்கு (Customers & Udhar Khata)' : 'Customers & Credit (Udhar Khata)'}
            </h2>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
            <input
              type="text"
              placeholder={lang === 'ta' ? 'பெயர் அல்லது போன் எண் தேட...' : 'Search by name or phone...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-8 py-1 text-xs w-56"
            />
          </div>

          <div className="text-xs bg-rose-50 text-rose-900 border border-rose-200 px-2.5 py-0.5 rounded font-semibold">
            Total Customer Udhar: <b className="font-mono text-rose-700">₹{totalUdhar.toFixed(2)}</b>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ta' ? '+ புதிய வாடிக்கையாளர்' : '+ Add Customer'}</span>
          </button>
          <button onClick={loadCustomers} className="btn-secondary text-xs p-1.5" title="Refresh">
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

      {/* Customers Table */}
      <div className="flex-1 overflow-auto p-3">
        <div className="bg-white border border-gray-300 shadow-xs">
          <table className="excel-table text-xs">
            <thead>
              <tr>
                <th className="w-12 text-center">#</th>
                <th>Customer Name</th>
                <th>Tamil Name (தமிழ் பெயர்)</th>
                <th>Phone Number</th>
                <th>Address</th>
                <th className="text-right">Credit Limit (₹)</th>
                <th className="text-center">Total Bills</th>
                <th className="text-right">Total Purchases (₹)</th>
                <th className="text-right">Outstanding Udhar (₹)</th>
                <th className="w-56 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-gray-400">Loading customer khata from MySQL...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-gray-400">
                    No customers registered yet. Click &quot;+ Add Customer&quot; to create one.
                  </td>
                </tr>
              ) : (
                customers.map((c, idx) => {
                  const hasUdhar = Number(c.current_balance) > 0;
                  return (
                    <tr key={c.id} className="hover:bg-blue-50/40">
                      <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                      <td className="font-bold text-gray-900">{c.name}</td>
                      <td className="text-gray-700">{c.tamil_name || '-'}</td>
                      <td className="font-mono font-bold text-indigo-800">{c.phone}</td>
                      <td className="text-gray-600">{c.address || '-'}</td>
                      <td className="num-cell font-mono text-gray-600">₹{Number(c.credit_limit).toFixed(2)}</td>
                      <td className="text-center font-mono font-bold text-blue-700">{c.total_bills || 0}</td>
                      <td className="num-cell font-mono">₹{Number(c.total_spend || 0).toFixed(2)}</td>
                      <td className="num-cell">
                        <span
                          className={`font-mono font-bold text-sm ${
                            hasUdhar ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          ₹{Number(c.current_balance).toFixed(2)}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenPayment(c)}
                            className="bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 px-1.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-0.5"
                            title="Collect Udhar Payment"
                          >
                            <IndianRupee className="w-3 h-3" />
                            <span>Collect</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenLedger(c)}
                            className="bg-blue-50 text-blue-800 border border-blue-300 hover:bg-blue-100 px-1.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-0.5"
                            title="View Khata Statement"
                          >
                            <History className="w-3 h-3" />
                            <span>Khata</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 px-1.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-0.5"
                            title="Edit Customer Details"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(c)}
                            className="bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 px-1.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-0.5"
                            title="Delete Customer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-300 overflow-hidden animate-fade-in">
            <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wide">
                {isEditMode ? `Edit Customer: ${custForm.name}` : 'Register New Customer'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={custForm.name}
                  onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                  className="form-input w-full"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Tamil Name (தமிழ் பெயர்)</label>
                <input
                  type="text"
                  placeholder="எ.கா. ரமேஷ் குமார்"
                  value={custForm.tamil_name}
                  onChange={(e) => setCustForm({ ...custForm, tamil_name: e.target.value })}
                  className="form-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210"
                    value={custForm.phone}
                    onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })}
                    className="form-input w-full font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={custForm.credit_limit}
                    onChange={(e) => setCustForm({ ...custForm, credit_limit: e.target.value })}
                    className="form-input w-full font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Address / Street</label>
                <textarea
                  rows="2"
                  placeholder="Door number, street name, area"
                  value={custForm.address}
                  onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
                  className="form-input w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-1.5 px-4 font-bold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : isEditMode ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Udhar Payment Modal */}
      {payModalOpen && selectedCust && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm border border-gray-300 overflow-hidden animate-fade-in">
            <div className="bg-emerald-900 text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wide">
                Collect Udhar: {selectedCust.name}
              </h3>
              <button onClick={() => setPayModalOpen(false)} className="text-emerald-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSavePayment} className="p-4 space-y-3 text-xs">
              <div className="bg-rose-50 border border-rose-200 p-2.5 rounded text-center">
                <div className="text-[11px] text-gray-600 font-semibold">Current Udhar Balance:</div>
                <div className="text-2xl font-black font-mono text-rose-700 mt-0.5">
                  ₹{Number(selectedCust.current_balance).toFixed(2)}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Amount Received (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  autoFocus
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="form-input w-full font-mono text-lg font-bold text-center border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="form-input w-full font-bold"
                >
                  <option value="CASH">CASH (ரொக்கம்)</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="CARD">Bank Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-success text-xs py-1.5 px-4 font-bold shadow-md disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Khata Ledger Statement Modal */}
      {ledgerModalOpen && ledgerCust && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl border border-gray-300 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wide">
                Khata Statement: {ledgerCust.name} ({ledgerCust.phone})
              </h3>
              <button onClick={() => setLedgerModalOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {loadingLedger ? (
                <div className="text-center py-10 text-gray-400 text-xs">Loading ledger transactions...</div>
              ) : ledgerEntries.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs">No transaction history found.</div>
              ) : (
                <table className="excel-table text-xs">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Ref Number</th>
                      <th>Payment Mode</th>
                      <th className="text-right">Debit (Sale)</th>
                      <th className="text-right">Credit (Received)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((row, i) => (
                      <tr key={i}>
                        <td className="font-mono text-gray-600">
                          {new Date(row.created_at).toLocaleDateString()}
                        </td>
                        <td className="font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              row.type === 'SALE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="font-mono text-indigo-700">{row.ref_no}</td>
                        <td className="font-semibold text-gray-700">{row.payment_mode}</td>
                        <td className="num-cell font-bold text-rose-700">
                          {row.type === 'SALE' ? `₹${Number(row.amount).toFixed(2)}` : '-'}
                        </td>
                        <td className="num-cell font-bold text-emerald-700">
                          {row.type === 'PAYMENT' ? `₹${Number(row.amount).toFixed(2)}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs">
              <span className="font-bold text-gray-700">
                Current Udhar Balance: <span className="text-rose-700 font-mono">₹{Number(ledgerCust.current_balance).toFixed(2)}</span>
              </span>
              <button
                type="button"
                onClick={() => setLedgerModalOpen(false)}
                className="btn-secondary text-xs py-1 px-3"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

