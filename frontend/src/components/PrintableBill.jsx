import React from 'react';
import { Printer, X } from 'lucide-react';

export default function PrintableBill({ bill, storeInfo = {}, onClose }) {
  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  // Format currency helper
  const fmt = (val) => Number(val || 0).toFixed(2);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleString('en-IN');
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const hasIgst = Number(bill.igstAmount || 0) > 0;

  return (
    <div className="modal-backdrop printing-active">
      <div className="modal-dialog modal-lg">
        <div className="modal-header no-print">
          <h2 className="modal-title">Tax Invoice #{bill.billNumber}</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>
              <Printer size={16} />
              <span>Print Invoice</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              <X size={16} />
              <span>Close</span>
            </button>
          </div>
        </div>

        <div className="modal-body">
          <div className="receipt-wrapper">
            {/* Store Header */}
            <div className="receipt-header">
              <div className="receipt-store-name">{storeInfo.name || 'SuperMart Retail Store'}</div>
              <div className="receipt-meta-text">{storeInfo.address || 'Shop 12, Main Market Road, Bangalore - 560001'}</div>
              <div className="receipt-meta-text">Phone: {storeInfo.phone || '+91 98765 43210'} | GSTIN: {storeInfo.gstin || '29AAAAA0000A1Z5'}</div>
              <div style={{ fontWeight: 800, marginTop: '0.4rem', letterSpacing: '0.05em' }}>RETAIL TAX INVOICE</div>
            </div>

            {/* Bill Meta Info */}
            <div className="receipt-info-grid">
              <div><strong>Invoice No:</strong> {bill.billNumber}</div>
              <div><strong>Date & Time:</strong> {formatDate(bill.billDate || bill.createdAt)}</div>
              <div><strong>Payment Mode:</strong> {bill.paymentMethod}</div>
              <div><strong>Payment Status:</strong> {bill.paymentStatus}</div>
            </div>

            {/* Itemized Table */}
            <table className="receipt-table">
              <thead>
                <tr>
                  <th>Item / SKU</th>
                  <th>HSN</th>
                  <th className="num">Qty</th>
                  <th className="num">Rate</th>
                  <th className="num">Disc</th>
                  <th className="num">Taxable</th>
                  <th className="num">GST</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {(bill.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <div><strong>{item.productName}</strong></div>
                      <div style={{ fontSize: '0.7rem', color: '#555' }}>SKU: {item.sku}</div>
                    </td>
                    <td>{item.hsncode || item.hsnCode || '-'}</td>
                    <td className="num">{Number(item.quantity).toFixed(item.unit === 'kg' ? 3 : 0)} {item.unit}</td>
                    <td className="num">₹{fmt(item.unitPrice)}</td>
                    <td className="num">{Number(item.discountAmount) > 0 ? `₹${fmt(item.discountAmount)}` : '-'}</td>
                    <td className="num">₹{fmt(item.taxableAmount)}</td>
                    <td className="num">{Number(item.gstRate)}%</td>
                    <td className="num"><strong>₹{fmt(item.lineTotal)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Section */}
            <div className="receipt-totals">
              <div className="receipt-total-row">
                <span>Subtotal (Gross):</span>
                <span>₹{fmt(bill.subtotal)}</span>
              </div>

              {Number(bill.discountAmount || 0) > 0 && (
                <div className="receipt-total-row" style={{ color: '#b91c1c' }}>
                  <span>Total Discount:</span>
                  <span>- ₹{fmt(bill.discountAmount)}</span>
                </div>
              )}

              <div className="receipt-total-row">
                <span>Taxable Amount:</span>
                <span>₹{fmt(bill.taxableAmount)}</span>
              </div>

              {!hasIgst ? (
                <>
                  <div className="receipt-total-row">
                    <span>CGST:</span>
                    <span>₹{fmt(bill.cgstAmount)}</span>
                  </div>
                  <div className="receipt-total-row">
                    <span>SGST:</span>
                    <span>₹{fmt(bill.sgstAmount)}</span>
                  </div>
                </>
              ) : (
                <div className="receipt-total-row">
                  <span>IGST:</span>
                  <span>₹{fmt(bill.igstAmount)}</span>
                </div>
              )}

              {Number(bill.roundOff || 0) !== 0 && (
                <div className="receipt-total-row">
                  <span>Round Off:</span>
                  <span>{Number(bill.roundOff) > 0 ? `+₹${fmt(bill.roundOff)}` : `-₹${fmt(Math.abs(bill.roundOff))}`}</span>
                </div>
              )}

              <div className="receipt-total-row grand">
                <span>GRAND TOTAL:</span>
                <span>₹{fmt(bill.grandTotal)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="receipt-footer">
              <div>Thank you for your business!</div>
              <div style={{ marginTop: '0.2rem', fontSize: '0.7rem' }}>Goods once sold can be exchanged within 7 days with original invoice.</div>
              <div style={{ marginTop: '0.3rem', fontSize: '0.68rem', color: '#777' }}>This is a computer generated invoice.</div>
            </div>
          </div>
        </div>

        <div className="modal-footer no-print">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
}
