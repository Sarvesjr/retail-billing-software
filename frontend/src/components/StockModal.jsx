import React, { useState } from 'react';
import { X, Layers, AlertCircle } from 'lucide-react';

export default function StockModal({ isOpen, onClose, onUpdateStock, product }) {
  if (!isOpen || !product) return null;

  const [quantity, setQuantity] = useState(product.stockQuantity || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (quantity === '' || Number(quantity) < 0) {
      setError('Stock quantity cannot be negative.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onUpdateStock(product.productId, Number(quantity));
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-dialog">
        <div className="modal-header">
          <h2 className="modal-title">Update Inventory Stock</h2>
          <button className="btn btn-secondary btn-icon" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div
                style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger-text)',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--secondary)' }}>
                {product.productName}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                SKU: <span style={{ fontFamily: 'var(--font-mono)' }}>{product.sku}</span> | Unit:{' '}
                <strong>{product.unit}</strong> | Current Stock:{' '}
                <strong>{Number(product.stockQuantity)}</strong>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">New Stock Quantity ({product.unit}) *</label>
              <input
                type="number"
                step="0.001"
                min="0"
                className="form-input"
                style={{ fontSize: '1.2rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                autoFocus
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                Reorder threshold is {Number(product.reorderLevel)} {product.unit}
              </span>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Layers size={16} />
              <span>{loading ? 'Updating...' : 'Update Stock'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
