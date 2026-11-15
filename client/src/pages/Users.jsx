import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import {
  UserCog,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  X,
  Lock,
  Phone,
  User,
  KeyRound,
  Check,
  Minus
} from 'lucide-react';

export function Users() {
  const { t, lang } = useI18n();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    role: 'CASHIER',
    phone: '',
    password: '',
    is_active: true
  });

  // Delete Confirmation state
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.getUsers();
      setUsers(res.data || []);
    } catch (err) {
      setErrorMsg('Failed to load users from MySQL: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setEditingUserId(null);
    setFormData({
      username: '',
      display_name: '',
      role: 'CASHIER',
      phone: '',
      password: '',
      is_active: true
    });
    setErrorMsg('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setIsEditMode(true);
    setEditingUserId(user.id);
    setFormData({
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      phone: user.phone || '',
      password: '', // Blank means keep existing password
      is_active: Boolean(user.is_active)
    });
    setErrorMsg('');
    setSuccessMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isEditMode) {
        const payload = {
          display_name: formData.display_name.trim(),
          role: formData.role,
          phone: formData.phone.trim() || null,
          is_active: formData.is_active
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        await api.updateUser(editingUserId, payload);
        setSuccessMsg(`User "${formData.display_name}" updated successfully in MySQL.`);
      } else {
        const payload = {
          username: formData.username.trim(),
          password: formData.password.trim(),
          display_name: formData.display_name.trim(),
          role: formData.role,
          phone: formData.phone.trim() || null,
          is_active: formData.is_active
        };
        await api.createUser(payload);
        setSuccessMsg(`User "${payload.display_name}" created successfully in MySQL.`);
      }

      setIsModalOpen(false);
      loadUsers();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    setDeleting(true);
    setErrorMsg('');
    try {
      await api.deleteUser(deleteConfirmUser.id);
      setSuccessMsg(`User "${deleteConfirmUser.username}" removed from MySQL.`);
      setDeleteConfirmUser(null);
      loadUsers();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const managerCount = users.filter((u) => u.role === 'MANAGER').length;
  const cashierCount = users.filter((u) => u.role === 'CASHIER').length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Top Header */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-300 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <UserCog className="w-5 h-5 text-indigo-700" />
          <div>
            <h2 className="font-bold text-sm text-gray-900">
              {lang === 'ta' ? 'பயனர்கள் & அனுமதி மேலாண்மை' : 'Users & Permissions Management'}
            </h2>
            <p className="text-[11px] text-gray-500">
              {lang === 'ta'
                ? 'பயனர் கணக்குகள், கடவுச்சொற்கள் மற்றும் பங்கு அனுமதிகளை நிர்வகிக்கவும்'
                : 'Manage system operators, cashier logins, and role-based access rights'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-1.5 text-gray-600 hover:text-gray-900 border border-gray-300 rounded bg-white"
            title="Refresh Users"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAdd}
            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{lang === 'ta' ? '+ புதிய பயனர்' : '+ Add New User'}</span>
          </button>
        </div>
      </div>

      {/* Messages Banner */}
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

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Metric Badges */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded border border-gray-300 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-700">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500">Total Users</div>
              <div className="text-xl font-bold font-mono text-gray-900">{users.length}</div>
            </div>
          </div>

          <div className="bg-white p-3 rounded border border-purple-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-purple-800">Administrators</div>
              <div className="text-xl font-bold font-mono text-purple-900">{adminCount}</div>
            </div>
          </div>

          <div className="bg-white p-3 rounded border border-blue-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-blue-800">Managers</div>
              <div className="text-xl font-bold font-mono text-blue-900">{managerCount}</div>
            </div>
          </div>

          <div className="bg-white p-3 rounded border border-emerald-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-800">Cashiers</div>
              <div className="text-xl font-bold font-mono text-emerald-900">{cashierCount}</div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700">
              System Operators &amp; Login Accounts ({users.length})
            </h3>
          </div>

          <table className="excel-table text-xs">
            <thead>
              <tr>
                <th className="w-10 text-center">#</th>
                <th>Username</th>
                <th>Display Name</th>
                <th>Role &amp; Access Tier</th>
                <th>Phone Number</th>
                <th className="text-center">Status</th>
                <th>Created At</th>
                <th className="text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-400">
                    Loading users from MySQL...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-400">
                    No users found in database. Click &quot;+ Add New User&quot; to create one.
                  </td>
                </tr>
              ) : (
                users.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-blue-50/40 transition">
                    <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                    <td>
                      <div className="font-mono font-bold text-blue-950 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>{u.username}</span>
                      </div>
                    </td>
                    <td>
                      <div className="font-bold text-gray-900">{u.display_name}</div>
                    </td>
                    <td>
                      {u.role === 'ADMIN' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                          <ShieldAlert className="w-3 h-3 text-purple-700" />
                          <span>Admin (முழு அணுகல்)</span>
                        </span>
                      )}
                      {u.role === 'MANAGER' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                          <ShieldCheck className="w-3 h-3 text-blue-700" />
                          <span>Manager (மேலாளர்)</span>
                        </span>
                      )}
                      {u.role === 'CASHIER' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          <UserCheck className="w-3 h-3 text-emerald-700" />
                          <span>Cashier (காசாளர்)</span>
                        </span>
                      )}
                    </td>
                    <td className="font-mono text-gray-600">
                      {u.phone || <span className="text-gray-400 italic">None</span>}
                    </td>
                    <td className="text-center">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                          <X className="w-3 h-3 text-red-600" />
                          <span>Disabled</span>
                        </span>
                      )}
                    </td>
                    <td className="text-gray-500 font-mono text-[11px]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-100 rounded"
                          title="Edit User"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmUser(u)}
                          className="p-1 text-red-600 hover:text-red-900 hover:bg-red-100 rounded"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Role Permissions Matrix Section */}
        <div className="bg-white border border-gray-300 rounded shadow-xs overflow-hidden">
          <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-300" />
              <h3 className="font-bold text-xs uppercase tracking-wide">
                Role-Based Access Control (RBAC) Permissions Matrix
              </h3>
            </div>
            <span className="text-[10px] bg-blue-800 text-blue-200 px-2 py-0.5 rounded font-mono">
              Enforced by MySQL
            </span>
          </div>

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-xs border border-gray-200">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
                  <th className="text-left py-2 px-3 font-bold">Module / Capability</th>
                  <th className="text-center py-2 px-3 font-bold text-purple-900 w-32 bg-purple-50">Admin</th>
                  <th className="text-center py-2 px-3 font-bold text-blue-900 w-32 bg-blue-50">Manager</th>
                  <th className="text-center py-2 px-3 font-bold text-emerald-900 w-32 bg-emerald-50">Cashier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-700">
                <tr>
                  <td className="py-2 px-3 font-semibold">Billing POS, Barcode Scanning &amp; Thermal Receipts</td>
                  <td className="text-center py-2 px-3 bg-purple-50/40 text-emerald-700 font-bold">✓ Full</td>
                  <td className="text-center py-2 px-3 bg-blue-50/40 text-emerald-700 font-bold">✓ Full</td>
                  <td className="text-center py-2 px-3 bg-emerald-50/40 text-emerald-700 font-bold">✓ Full</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold">Customer Khata (Udhar) &amp; Payment Receipts</td>
                  <td className="text-center py-2 px-3 bg-purple-50/40 text-emerald-700 font-bold">✓ Full</td>
                  <td className="text-center py-2 px-3 bg-blue-50/40 text-emerald-700 font-bold">✓ Full</td>
                  <td className="text-center py-2 px-3 bg-emerald-50/40 text-blue-700 font-semibold">View &amp; Collect</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold">Product Catalog, Selling Prices &amp; Barcodes</td>
                  <td className="text-center py-2 px-3 bg-purple-50/40 text-emerald-700 font-bold">✓ Full</td>
                  <td className="text-center py-2 px-3 bg-blue-50/40 text-emerald-700 font-bold">✓ Full</td>
                  <td className="text-center py-2 px-3 bg-emerald-50/40 text-gray-400 font-mono">- Read Only -</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold">Stock Inward, Purchases &amp; Supplier Management</td>
                  <td className="text-center py-2 px-3 bg-purple-50/40 text-emerald-700 font-bold">✓ Full</td>
                  <td className="text-center py-2 px-3 bg-blue-50/40 text-emerald-700 font-bold">✓ Full</td>
                  <td className="text-center py-2 px-3 bg-emerald-50/40 text-gray-400 font-mono">- No Access -</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold">Daily Expense Logging &amp; Petty Cash</td>
                  <td className="text-center py-2 px-3 bg-purple-50/40 text-emerald-700 font-bold">✓ Full</td>
                  <td className="text-center py-2 px-3 bg-blue-50/40 text-emerald-700 font-bold">✓ Full</td>
                  <td className="text-center py-2 px-3 bg-emerald-50/40 text-blue-700 font-semibold">Entry Only</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold">Sales Reports, Profit/Loss &amp; Analytics</td>
                  <td className="text-center py-2 px-3 bg-purple-50/40 text-emerald-700 font-bold">✓ Full</td>
                  <td className="text-center py-2 px-3 bg-blue-50/40 text-emerald-700 font-bold">✓ Full</td>
                  <td className="text-center py-2 px-3 bg-emerald-50/40 text-gray-400 font-mono">- No Access -</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold">User Creation &amp; Password Management</td>
                  <td className="text-center py-2 px-3 bg-purple-50/40 text-emerald-700 font-bold">✓ Full</td>
                  <td className="text-center py-2 px-3 bg-blue-50/40 text-gray-400 font-mono">- No Access -</td>
                  <td className="text-center py-2 px-3 bg-emerald-50/40 text-gray-400 font-mono">- No Access -</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold">Store Settings, GSTIN, FSSAI &amp; Database Backups</td>
                  <td className="text-center py-2 px-3 bg-purple-50/40 text-emerald-700 font-bold">✓ Full</td>
                  <td className="text-center py-2 px-3 bg-blue-50/40 text-gray-400 font-mono">- No Access -</td>
                  <td className="text-center py-2 px-3 bg-emerald-50/40 text-gray-400 font-mono">- No Access -</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md border border-gray-300 overflow-hidden animate-fade-in">
            <div className="bg-blue-900 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCog className="w-4 h-4 text-blue-300" />
                <h3 className="font-bold text-xs uppercase tracking-wide">
                  {isEditMode ? `Edit User #${editingUserId} (${formData.username})` : 'Create New User Account'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-blue-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    disabled={isEditMode}
                    placeholder="e.g. cashier2"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className={`form-input w-full font-mono text-xs ${isEditMode ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Role / Tier *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="form-input w-full font-bold text-xs"
                  >
                    <option value="CASHIER">CASHIER (Counter Billing)</option>
                    <option value="MANAGER">MANAGER (Inventory &amp; Sales)</option>
                    <option value="ADMIN">ADMIN (Full Store Access)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar (Evening Shift)"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  className="form-input w-full font-semibold text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Password {isEditMode ? '(Blank = Keep)' : '*'}
                  </label>
                  <input
                    type="password"
                    required={!isEditMode}
                    placeholder={isEditMode ? '••••••••' : 'Min 4 characters'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="form-input w-full font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="form-input w-full font-mono text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-gray-800">Account Active (Permitted to log in and bill)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-1.5 px-4 font-bold disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : isEditMode ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm border border-red-300 overflow-hidden animate-fade-in">
            <div className="bg-red-800 text-white px-4 py-2.5 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wide">Confirm User Deletion</h3>
              <button onClick={() => setDeleteConfirmUser(null)} className="text-red-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <p className="text-gray-800">
                Are you sure you want to delete user account{' '}
                <b className="text-red-700 font-mono">{deleteConfirmUser.username}</b> (
                {deleteConfirmUser.display_name})?
              </p>
              <p className="text-[11px] text-gray-500">
                This operator will no longer be able to log in or use the billing terminal.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmUser(null)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteUser}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-4 font-bold rounded shadow-md disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
