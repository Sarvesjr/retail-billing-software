import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import {
  ReceiptText,
  Search,
  Calendar,
  Filter,
  Download,
  Printer,
  Eye,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  Clock,
  CreditCard,
  Wallet,
  Smartphone,
  Banknote,
  FileImage,
  Layers,
  X,
  ExternalLink,
  ShieldCheck,
  Package
} from 'lucide-react';

export function PreviousBills() {
  const { t, lang } = useI18n();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [paymentMode, setPaymentMode] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Bill for Full-Resolution Lossless Viewer Modal
  const [selectedBill, setSelectedBill] = useState(null);
  const [billDetails, setBillDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imageFormat, setImageFormat] = useState('svg'); // 'svg' or 'png'

  const printFrameRef = useRef(null);

  const fetchSales = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSales({
        search,
        payment_mode: paymentMode,
        startDate,
        endDate,
        limit: 100
      });
      setSales(res.data || []);
    } catch (err) {
      console.error('Failed to load previous sales:', err);
      setError(err.message || 'Failed to load past invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [paymentMode, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSales();
  };

  const handleOpenBill = async (sale) => {
    setSelectedBill(sale);
    setZoomLevel(1);
    setDetailsLoading(true);
    try {
      const full = await api.getSale(sale.id);
      setBillDetails(full.data || full);
    } catch (err) {
      console.error('Failed to load sale breakdown:', err);
      setBillDetails(sale);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedBill(null);
    setBillDetails(null);
  };

  const handlePrintThermal = (invoiceNo) => {
    const imageUrl = `/api/sales/bills/${encodeURIComponent(invoiceNo)}/image?format=svg`;
    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Invoice ${invoiceNo}</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body { margin: 0; padding: 8px; display: flex; justify-content: center; background: #fff; font-family: monospace; }
              img { width: 100%; max-width: 380px; height: auto; display: block; }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" onload="window.print(); setTimeout(() => window.close(), 1000);" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // KPI Calculations
  const totalRevenue = sales.reduce((acc, s) => acc + Number(s.grand_total || 0), 0);
  const cashTotal = sales.filter(s => s.payment_mode === 'CASH').reduce((acc, s) => acc + Number(s.grand_total || 0), 0);
  const upiTotal = sales.filter(s => s.payment_mode === 'UPI').reduce((acc, s) => acc + Number(s.grand_total || 0), 0);
  const creditTotal = sales.filter(s => s.payment_mode === 'CREDIT').reduce((acc, s) => acc + Number(s.grand_total || 0), 0);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-gray-100 p-4 space-y-4">
      {/* Top Header & Overview */}
      <div className="bg-white border border-gray-300 p-3.5 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-blue-700" />
            <h2 className="text-base font-bold text-gray-900">{t('previousBills')}</h2>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              100% Lossless Digital Image Store
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('previousBillsDesc')}
          </p>
        </div>

        <button
          onClick={fetchSales}
          className="btn-secondary text-xs flex items-center gap-1.5"
          title="Refresh Bills from MySQL"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('refresh')}</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white p-3 border border-gray-300 shadow-xs rounded-xs">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase">{t('totalBills')}</span>
            <ReceiptText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1 font-mono">
            {sales.length}
          </div>
          <div className="text-[11px] text-gray-500 mt-0.5 font-mono">
            ₹{totalRevenue.toFixed(2)} Total Sales
          </div>
        </div>

        <div className="bg-white p-3 border border-gray-300 shadow-xs rounded-xs border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase text-emerald-800">{t('cashSales')}</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-1 font-mono">
            ₹{cashTotal.toFixed(2)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">
            {sales.filter(s => s.payment_mode === 'CASH').length} Invoices
          </div>
        </div>

        <div className="bg-white p-3 border border-gray-300 shadow-xs rounded-xs border-l-4 border-l-purple-600">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase text-purple-800">{t('upiSales')}</span>
            <Smartphone className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-900 mt-1 font-mono">
            ₹{upiTotal.toFixed(2)}
          </div>
          <div className="text-[11px] text-purple-700 mt-0.5">
            {sales.filter(s => s.payment_mode === 'UPI').length} Invoices
          </div>
        </div>

        <div className="bg-white p-3 border border-gray-300 shadow-xs rounded-xs border-l-4 border-l-amber-600">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-xs font-bold uppercase text-amber-800">{t('creditSales')}</span>
            <CreditCard className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-1 font-mono">
            ₹{creditTotal.toFixed(2)}
          </div>
          <div className="text-[11px] text-amber-700 mt-0.5">
            {sales.filter(s => s.payment_mode === 'CREDIT').length} Invoices
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-300 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={t('searchInvoicePlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-3 py-1.5 pl-8 focus:outline-none focus:border-blue-600"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          </div>
          <button type="submit" className="btn-primary text-xs py-1.5 px-3">
            {t('queryMysql')}
          </button>
        </form>

        <div className="flex items-center gap-2">
          {/* Payment Mode Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-700">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">{t('allPaymentModes')}</option>
              <option value="CASH">CASH (ரொக்கம்)</option>
              <option value="UPI">UPI / QR (ஜிபே)</option>
              <option value="CARD">CARD (கார்டு)</option>
              <option value="CREDIT">CREDIT (உதார் கடன்)</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1 text-xs text-gray-700">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
            />
          </div>

          {(startDate || endDate || search || paymentMode !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setPaymentMode('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-blue-600 hover:underline px-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Bills Data Table */}
      <div className="bg-white border border-gray-300 shadow-xs rounded-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <RotateCcw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
            <p className="text-xs">Loading past invoices from MySQL database...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 bg-red-50 text-xs">
            {error}
          </div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ReceiptText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold text-gray-700">{t('noBillsFound')}</p>
            <p className="text-xs text-gray-400 mt-1">Make a sale in Billing (POS) [F2] to see generated lossless receipts here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="excel-table">
              <thead>
                <tr>
                  <th className="w-12 text-center">{t('sNo')}</th>
                  <th>Invoice No</th>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th className="text-center">Items</th>
                  <th className="text-right">Subtotal (₹)</th>
                  <th className="text-right">Tax (₹)</th>
                  <th className="text-right font-bold">Grand Total (₹)</th>
                  <th className="text-center">{t('paymentMode')}</th>
                  <th className="text-center w-52">{t('actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale, idx) => {
                  const modeBadge = {
                    CASH: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                    UPI: 'bg-purple-100 text-purple-800 border-purple-300',
                    CARD: 'bg-blue-100 text-blue-800 border-blue-300',
                    CREDIT: 'bg-amber-100 text-amber-800 border-amber-300'
                  }[sale.payment_mode] || 'bg-gray-100 text-gray-800 border-gray-300';

                  const dateFormatted = new Date(sale.created_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });

                  return (
                    <tr key={sale.id} className="hover:bg-blue-50/50">
                      <td className="text-center font-mono text-gray-500 text-xs">{idx + 1}</td>
                      <td className="font-mono font-bold text-blue-900 text-xs">
                        {sale.invoice_no}
                      </td>
                      <td className="text-xs text-gray-600 font-mono">
                        {dateFormatted}
                      </td>
                      <td className="text-xs font-medium text-gray-900">
                        {sale.customer_name || 'Walk-in Customer'}
                      </td>
                      <td className="text-xs font-mono text-gray-500">
                        {sale.customer_phone || '-'}
                      </td>
                      <td className="text-center font-mono text-xs text-gray-700">
                        {sale.total_items || '-'}
                      </td>
                      <td className="text-right font-mono text-xs text-gray-700">
                        ₹{Number(sale.subtotal || 0).toFixed(2)}
                      </td>
                      <td className="text-right font-mono text-xs text-gray-500">
                        ₹{Number(sale.tax_total || 0).toFixed(2)}
                      </td>
                      <td className="text-right font-mono font-black text-sm text-gray-900">
                        ₹{Number(sale.grand_total || 0).toFixed(2)}
                      </td>
                      <td className="text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${modeBadge}`}>
                          {sale.payment_mode}
                        </span>
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Lossless Image Preview */}
                          <button
                            onClick={() => handleOpenBill(sale)}
                            className="p-1 px-2 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded flex items-center gap-1"
                            title="Open full-resolution lossless receipt"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t('viewBillImage')}</span>
                          </button>

                          {/* Print Thermal Bill */}
                          <button
                            onClick={() => handlePrintThermal(sale.invoice_no)}
                            className="p-1 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded border border-gray-200"
                            title="Print thermal bill slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {/* Download Lossless Image PNG */}
                          <a
                            href={`/api/sales/bills/${encodeURIComponent(sale.invoice_no)}/image?format=png&download=1`}
                            download={`${sale.invoice_no}.png`}
                            className="p-1 text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded border border-gray-200"
                            title="Download lossless PNG copy"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full-Resolution Lossless Receipt Viewer Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-2xl border border-gray-300 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between border-b border-blue-950">
              <div className="flex items-center gap-2.5">
                <FileImage className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <span>{selectedBill.invoice_no}</span>
                    <span className="text-xs font-normal text-blue-200">
                      ({new Date(selectedBill.created_at).toLocaleString('en-IN')})
                    </span>
                  </h3>
                  <p className="text-[11px] text-blue-300">
                    {t('losslessNotice')}
                  </p>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2">
                {/* Format Toggle */}
                <div className="flex items-center bg-blue-950 rounded p-0.5 border border-blue-800 text-xs">
                  <button
                    onClick={() => setImageFormat('svg')}
                    className={`px-2 py-0.5 rounded font-mono font-bold ${imageFormat === 'svg' ? 'bg-blue-600 text-white' : 'text-blue-300 hover:text-white'}`}
                    title="Render as mathematical vector SVG (Infinite clarity, zero blur)"
                  >
                    SVG (Vector)
                  </button>
                  <button
                    onClick={() => setImageFormat('png')}
                    className={`px-2 py-0.5 rounded font-mono font-bold ${imageFormat === 'png' ? 'bg-blue-600 text-white' : 'text-blue-300 hover:text-white'}`}
                    title="Render as 32-bit lossless PNG bitmap"
                  >
                    PNG (Lossless)
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center bg-blue-950 rounded border border-blue-800 text-xs">
                  <button
                    onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.2))}
                    className="p-1 text-blue-200 hover:text-white hover:bg-blue-800 rounded-l"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 font-mono text-[11px] text-blue-200">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel(prev => Math.min(2.5, prev + 0.2))}
                    className="p-1 text-blue-200 hover:text-white hover:bg-blue-800"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 text-blue-200 hover:text-white hover:bg-blue-800 rounded-r text-[10px] font-mono px-1.5"
                    title="Reset Zoom to 100%"
                  >
                    100%
                  </button>
                </div>

                {/* Download PNG Button */}
                <a
                  href={`/api/sales/bills/${encodeURIComponent(selectedBill.invoice_no)}/image?format=png&download=1`}
                  download={`${selectedBill.invoice_no}.png`}
                  className="btn-primary text-xs py-1 px-2.5 bg-emerald-700 hover:bg-emerald-800 border-emerald-800 flex items-center gap-1.5"
                  title="Download Lossless PNG file directly"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('downloadPng')}</span>
                </a>

                {/* Print Button */}
                <button
                  onClick={() => handlePrintThermal(selectedBill.invoice_no)}
                  className="btn-primary text-xs py-1 px-2.5 bg-yellow-500 hover:bg-yellow-400 text-blue-950 border-yellow-600 font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t('printThermal')}</span>
                </button>

                {/* Close Button */}
                <button
                  onClick={handleCloseModal}
                  className="text-blue-300 hover:text-white p-1 ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Split Master/Detail */}
            <div className="flex-1 overflow-hidden grid grid-cols-12 bg-gray-200">
              {/* Left Column: Lossless Receipt Image Viewer */}
              <div className="col-span-7 bg-gray-800 overflow-auto flex items-center justify-center p-6 border-r border-gray-400">
                <div
                  className="transition-transform duration-150 origin-center bg-white shadow-2xl rounded-xs border border-gray-400"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <img
                    src={`/api/sales/bills/${encodeURIComponent(selectedBill.invoice_no)}/image?format=${imageFormat}`}
                    alt={`Receipt ${selectedBill.invoice_no}`}
                    className="max-w-[400px] h-auto select-none block"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                </div>
              </div>

              {/* Right Column: Complete Itemized Breakdown */}
              <div className="col-span-5 bg-white overflow-y-auto p-4 flex flex-col justify-between">
                <div>
                  <div className="border-b border-gray-200 pb-2 mb-3">
                    <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-700" />
                      <span>{t('billDetails')}</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <div>
                        <span className="text-gray-500">Customer: </span>
                        <span className="font-bold text-gray-900">{selectedBill.customer_name || 'Walk-in'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Mode: </span>
                        <span className="font-bold text-blue-800">{selectedBill.payment_mode}</span>
                      </div>
                    </div>
                  </div>

                  {detailsLoading ? (
                    <div className="text-center py-8 text-gray-500 text-xs">
                      <RotateCcw className="w-4 h-4 animate-spin mx-auto text-blue-600 mb-1" />
                      Loading bill items...
                    </div>
                  ) : billDetails?.items?.length ? (
                    <div className="space-y-2">
                      <table className="excel-table text-xs">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th className="text-center">Qty</th>
                            <th className="text-right">Rate</th>
                            <th className="text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {billDetails.items.map((it, i) => (
                            <tr key={i}>
                              <td>
                                <div className="font-semibold text-gray-900">{it.product_name}</div>
                                {it.tamil_name && (
                                  <div className="text-[11px] text-gray-500">{it.tamil_name}</div>
                                )}
                                {it.barcode && (
                                  <div className="text-[10px] font-mono text-gray-400">{it.barcode}</div>
                                )}
                              </td>
                              <td className="text-center font-mono font-bold">{it.quantity}</td>
                              <td className="text-right font-mono">₹{Number(it.unit_price).toFixed(2)}</td>
                              <td className="text-right font-mono font-bold text-blue-900">
                                ₹{Number(it.line_total).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 italic py-4">
                      No separate item rows found for this invoice.
                    </div>
                  )}
                </div>

                {/* Bill Summary Totals Box */}
                <div className="mt-4 pt-3 border-t border-gray-200 bg-gray-50 p-3 rounded text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>₹{Number(selectedBill.subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>GST Tax Component:</span>
                    <span>₹{Number(selectedBill.tax_total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-blue-950 pt-1.5 border-t border-gray-300">
                    <span>NET GRAND TOTAL:</span>
                    <span className="text-base text-blue-900">₹{Number(selectedBill.grand_total || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
