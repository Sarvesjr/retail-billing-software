import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { Wallet, Plus, Trash2, Calendar, IndianRupee, CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-react';

export function Expenses() {
  const { t, lang } = useI18n();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Expense Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category_id: '',
    title: '',
    amount: '',
    payment_mode: 'CASH',
    expense_date: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [expRes, catRes] = await Promise.all([
        fetch('/api/expenses').then((r) => r.json()),
        fetch('/api/expenses/categories').then((r) => r.json())
      ]);
      setExpenses(expRes.data || []);
      setCategories(catRes.data || []);
      if (catRes.data?.length > 0 && !expenseForm.category_id) {
        setExpenseForm((prev) => ({ ...prev, category_id: String(catRes.data[0].id) }));
      }
    } catch (err) {
      setErrorMsg('Failed to load expenses: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setExpenseForm({
      category_id: categories.length > 0 ? String(categories[0].id) : '',
      title: '',
      amount: '',
      payment_mode: 'CASH',
      expense_date: new Date().toISOString().slice(0, 10),
      notes: ''
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!expenseForm.title || !expenseForm.amount || Number(expenseForm.amount) <= 0) {
      setErrorMsg('Enter valid expense title and amount');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record expense');

      setSuccessMsg(`Expense "₹${expenseForm.amount} - ${expenseForm.title}" recorded in MySQL.`);
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense entry?')) return;
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTotal = expenses
    .filter((e) => e.expense_date === todayStr)
    .reduce((acc, e) => acc + Number(e.amount), 0);
  const allTimeTotal = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Top Header */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-300 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-700" />
            <h2 className="font-bold text-sm text-gray-900">
              {lang === 'ta' ? 'கடை தினசரி செலவுகள் (Daily Shop Expenses)' : 'Daily Shop Expenses Tracker'}
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="bg-rose-50 text-rose-900 px-2.5 py-0.5 rounded font-bold border border-rose-200">
              Today: <b className="font-mono text-rose-700">₹{todayTotal.toFixed(2)}</b>
            </span>
            <span className="bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded font-semibold border border-gray-300">
              Total Expenses: <b className="font-mono">₹{allTimeTotal.toFixed(2)}</b>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAdd}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'ta' ? '+ புதிய செலவு பதிவு' : '+ Add Expense'}</span>
          </button>
          <button onClick={loadData} className="btn-secondary text-xs p-1.5" title="Refresh">
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

      {/* Expenses Table */}
      <div className="flex-1 overflow-auto p-3">
        <div className="bg-white border border-gray-300 shadow-xs">
          <table className="excel-table text-xs">
            <thead>
              <tr>
                <th className="w-12 text-center">#</th>
                <th>Date</th>
                <th>Expense Title / Purpose</th>
                <th>Category</th>
                <th className="text-center">Payment Mode</th>
                <th className="text-right">Amount (₹)</th>
                <th>Notes / Remarks</th>
                <th className="w-12 text-center">Delete</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-gray-400">Loading expenses from MySQL...</td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-gray-400">
                    No expenses recorded yet. Click &quot;+ Add Expense&quot; to log daily store costs (tea, rent, electricity, wages).
                  </td>
                </tr>
              ) : (
                expenses.map((e, idx) => (
                  <tr key={e.id} className="hover:bg-blue-50/40">
                    <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                    <td className="font-mono text-gray-600">{new Date(e.expense_date).toLocaleDateString()}</td>
                    <td className="font-bold text-gray-900">{e.title}</td>
                    <td>
                      <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-gray-200">
                        {e.category_name} {e.category_tamil_name ? `(${e.category_tamil_name})` : ''}
                      </span>
                    </td>
                    <td className="text-center font-bold text-gray-700">{e.payment_mode}</td>
                    <td className="num-cell font-mono font-bold text-rose-700 text-sm">
                      ₹{Number(e.amount).toFixed(2)}
                    </td>
                    <td className="text-gray-500">{e.notes || '-'}</td>
                    <td className="text-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(e.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md border border-gray-300 overflow-hidden animate-fade-in">
            <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wide">Record Shop Expense</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Expense Category *</label>
                <select
                  required
                  value={expenseForm.category_id}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category_id: e.target.value })}
                  className="form-input w-full font-bold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.tamil_name ? `(${c.tamil_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Expense Purpose / Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Afternoon Tea & Biscuits, Shop Light Bill, Porter charges"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="form-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="form-input w-full font-mono text-base font-bold text-center border-rose-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Expense Date</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.expense_date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Payment Mode</label>
                <select
                  value={expenseForm.payment_mode}
                  onChange={(e) => setExpenseForm({ ...expenseForm, payment_mode: e.target.value })}
                  className="form-input w-full"
                >
                  <option value="CASH">CASH (ரொக்கம்)</option>
                  <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                  <option value="BANK_TRANSFER">Bank Cheque / NEFT</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Remarks / குறிப்பு</label>
                <input
                  type="text"
                  placeholder="Optional bill or payee note"
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
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
                  {submitting ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

