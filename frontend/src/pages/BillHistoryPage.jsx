import React, { useState, useEffect } from 'react';
import { billService } from '../services/billService';
import {
  Search,
  Calendar,
  Eye,
  Printer,
  XCircle,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import PrintableBill from '../components/PrintableBill';

export default function BillHistoryPage({ storeInfo = {} }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal for Viewing / Printing
  const [selectedBillForPrint, setSelectedBillForPrint] = useState(null);

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await billService.getAll({
        search: search.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setBills(data || []);
    } catch (err) {
      console.error('Failed to load bills:', err);
      setError(err.message || 'Error fetching invoice records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [statusFilter]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchBills();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
    billService.getAll().then(setBills);
  };

  const handleViewBill = async (bill) => {
    try {
      // Fetch full bill details including line items
      const full = await billService.getById(bill.billId);
      setSelectedBillForPrint(full);
    } catch (err) {
      alert('Failed to load bill details: ' + err.message);
    }
  };

  const handleCancelBill = async (bill) => {
    if (bill.paymentStatus === 'CANCELLED') {
      alert('This bill is already cancelled.');
      return;
    }

    const confirmMsg = `Are you sure you want to CANCEL Bill #${bill.billNumber}?\n\nThis will mark the bill as CANCELLED and automatically restore all items back into store inventory.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      await billService.cancel(bill.billId);
      setSuccessBanner(`Bill #${bill.billNumber} cancelled successfully. Product stock has been restored.`);
      fetchBills();
    } catch (err) {
      alert('Failed to cancel bill: ' + err.message);
    }
  };

  const fmt = (v) => Number(v || 0).toFixed(2);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-top-bar">
        <div className="page-title-group">
          <h1>Invoice & Bill History</h1>
          <p>Review customer receipts, reprint historical invoices and manage transaction statuses</p>
        </div>
        <div>
          <button className="btn btn-secondary" onClick={fetchBills} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {successBanner && (
        <div
          style={{
            background: 'var(--success-bg)',
            color: 'var(--success-text)',
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successBanner}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'var(--danger-bg)',
            color: 'var(--danger-text)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <form
        onSubmit={handleFilterSubmit}
        style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Search by Bill Number */}
        <div style={{ flex: '1 1 200px' }}>
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon-inside" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by Bill Number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Start Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>From:</label>
          <input
            type="date"
            className="form-input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        {/* End Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>To:</label>
          <input
            type="date"
            className="form-input"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Status:</label>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="submit" className="btn btn-primary btn-sm">
            Filter
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearFilters}>
            Clear
          </button>
        </div>
      </form>

      {/* Bills Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            Loading invoices...
          </div>
        ) : bills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            No bills found matching your filter criteria.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Bill Number</th>
                <th>Date & Time</th>
                <th>Subtotal</th>
                <th>Discount</th>
                <th>Taxable</th>
                <th>Grand Total</th>
                <th>Payment Mode</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.billId}>
                  <td>
                    <span className="table-code" style={{ fontWeight: 700 }}>
                      {b.billNumber}
                    </span>
                  </td>

                  <td>{formatDate(b.billDate || b.createdAt)}</td>

                  <td className="price-cell">₹{fmt(b.subtotal)}</td>

                  <td style={{ color: Number(b.discountAmount) > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                    {Number(b.discountAmount) > 0 ? `-₹${fmt(b.discountAmount)}` : '-'}
                  </td>

                  <td className="price-cell">₹{fmt(b.taxableAmount)}</td>

                  <td>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: 'var(--secondary)' }}>
                      ₹{fmt(b.grandTotal)}
                    </div>
                  </td>

                  <td>
                    <span className="badge badge-muted">{b.paymentMethod}</span>
                  </td>

                  <td>
                    <span
                      className={`badge ${
                        b.paymentStatus === 'PAID' ? 'badge-success' : 'badge-danger'
                      }`}
                    >
                      {b.paymentStatus}
                    </span>
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                      <button
                        className="btn btn-secondary btn-icon"
                        title="View / Reprint Invoice"
                        onClick={() => handleViewBill(b)}
                      >
                        <Printer size={15} />
                      </button>

                      {b.paymentStatus !== 'CANCELLED' && (
                        <button
                          className="btn btn-secondary btn-icon"
                          title="Cancel Bill & Restore Stock"
                          onClick={() => handleCancelBill(b)}
                          style={{ color: 'var(--danger)' }}
                        >
                          <XCircle size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Printable Invoice Modal */}
      {selectedBillForPrint && (
        <PrintableBill
          bill={selectedBillForPrint}
          storeInfo={storeInfo}
          onClose={() => setSelectedBillForPrint(null)}
        />
      )}
    </div>
  );
}
