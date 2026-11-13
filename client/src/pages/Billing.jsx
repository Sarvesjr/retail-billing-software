import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useI18n } from '../i18n';
import { SCAN_EVENT } from '../components/BarcodeListener';
import { generateCode128Svg } from '../utils/barcodeGenerator';
import {
  ReceiptText,
  ScanBarcode,
  Search,
  Trash2,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  Plus,
  X,
  Package,
  Layers,
  UserCheck
} from 'lucide-react';

export function Billing() {
  const { t, lang } = useI18n();
  const [cart, setCart] = useState([]);

  // Customer state
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('Walk-in Customer');

  // Omni-search input state
  const [searchInput, setSearchInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Catalog Modal (F2)
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Billing & Payment state
  const [paymentMode, setPaymentMode] = useState('CASH'); // 'CASH' | 'UPI' | 'CARD' | 'CREDIT'
  const [receivedAmount, setReceivedAmount] = useState('');
  const [lastScannedMessage, setLastScannedMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Thermal Receipt Modal
  const [receiptData, setReceiptData] = useState(null);
  const [shopSettings, setShopSettings] = useState(null);

  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const catalogSearchRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const lastProcessedScanIdRef = useRef('');
  const lastProcessedBarcodeRef = useRef('');
  const lastProcessedScanTimeRef = useRef(0);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    // Load customers and shop settings
    api.getCustomers().then((res) => setCustomers(res.data || [])).catch(() => {});
    api.getSettings().then((res) => setShopSettings(res.data)).catch(() => {});
  }, []);

  // Global Keyboard shortcuts: F2 (Catalog Lookup), F5 (Save Bill), Escape (Close)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        openCatalogModal();
      } else if (e.key === 'F5') {
        e.preventDefault();
        if (cart.length > 0 && !isSubmitting) {
          handleCheckout();
        }
      } else if (e.key === 'Escape') {
        setShowDropdown(false);
        setIsCatalogOpen(false);
        setReceiptData(null);
        if (searchInputRef.current) searchInputRef.current.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cart, isSubmitting]);

  // Real-time Barcode listener from Mobile Phone or USB scanner
  useEffect(() => {
    const handleScanEvent = (e) => {
      const scanData = e.detail;
      if (!scanData || !scanData.barcode) return;

      const now = Date.now();
      const scanId = scanData.scanId;

      // 1. Deduplicate by unique scanId
      if (scanId && lastProcessedScanIdRef.current === scanId) {
        return;
      }
      // 2. Debounce rapid twin events (within 300ms)
      if (scanData.barcode === lastProcessedBarcodeRef.current && (now - lastProcessedScanTimeRef.current) < 300) {
        return;
      }

      lastProcessedScanIdRef.current = scanId || '';
      lastProcessedBarcodeRef.current = scanData.barcode;
      lastProcessedScanTimeRef.current = now;

      if (scanData.found && scanData.product) {
        addProductToCart(scanData.product);
        setLastScannedMessage({
          success: true,
          text: `Added "${scanData.product.name}" via ${scanData.inputSource}`
        });
        setErrorMsg('');
      } else if (!scanData.found) {
        setLastScannedMessage({
          success: false,
          text: `Barcode "${scanData.barcode}" not found in MySQL`
        });
      }
    };

    window.addEventListener(SCAN_EVENT, handleScanEvent);
    return () => window.removeEventListener(SCAN_EVENT, handleScanEvent);
  }, []);

  // Omni-search suggestions debounce
  useEffect(() => {
    const query = searchInput.trim();
    if (!query) {
      setSuggestions([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
      return;
    }

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.getProducts({ search: query, limit: 10 });
        const items = res.data || [];
        setSuggestions(items);
        setShowDropdown(items.length > 0);
        setSelectedIndex(items.length > 0 ? 0 : -1);
      } catch (err) {
        console.error('Omni-search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 120);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  const addProductToCart = (p) => {
    if (!p) return;
    const id = p.id || p.product_id;
    const sku = p.sku || `PRD-${id}`;
    const name = p.name || p.product_name;
    const tamilName = p.tamilName || p.tamil_name || p.product_tamil_name || '';
    const barcode = p.barcode || (p.barcodes ? p.barcodes.split(',')[0].trim() : '') || sku;
    const sellingPrice = Number(p.sellingPrice ?? p.selling_price ?? 0);
    const gstRate = Number(p.gstRate ?? p.gst_rate ?? 0);
    const unit = p.unit || p.unit_code || 'PCS';
    const currentStock = Number(p.currentStock ?? p.current_stock ?? 0);

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => Number(item.id) === Number(id));
      if (existingIndex > -1) {
        // Pure immutable update: create new item object so React never mutates in-place
        return prevCart.map((item, idx) => {
          if (idx !== existingIndex) return item;
          const nextQty = item.qty + 1;
          return {
            ...item,
            qty: nextQty,
            lineTotal: nextQty * item.sellingPrice
          };
        });
      } else {
        const item = {
          id: Number(id),
          sku,
          name,
          tamilName,
          barcode,
          sellingPrice,
          gstRate,
          unit,
          currentStock,
          qty: 1,
          lineTotal: sellingPrice
        };
        return [...prevCart, item];
      }
    });

    setSearchInput('');
    setShowDropdown(false);
    setSelectedIndex(-1);
    setErrorMsg('');
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const handleSearchKeyDown = async (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchInput.trim();
      if (!query) return;

      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        addProductToCart(suggestions[selectedIndex]);
        return;
      }
      if (suggestions.length === 1) {
        addProductToCart(suggestions[0]);
        return;
      }

      try {
        const barcodeRes = await api.lookupBarcode(query, 'MANUAL');
        if (barcodeRes.found && barcodeRes.product) {
          addProductToCart(barcodeRes.product);
          return;
        }

        const searchRes = await api.getProducts({ search: query, limit: 1 });
        if (searchRes.data && searchRes.data.length > 0) {
          addProductToCart(searchRes.data[0]);
          return;
        }

        setErrorMsg(`No product found matching "${query}" in MySQL database.`);
      } catch (err) {
        setErrorMsg('Search failed: ' + err.message);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const openCatalogModal = async () => {
    setIsCatalogOpen(true);
    setLoadingCatalog(true);
    try {
      const res = await api.getProducts({ limit: 100 });
      setCatalogItems(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCatalog(false);
      setTimeout(() => {
        if (catalogSearchRef.current) catalogSearchRef.current.focus();
      }, 100);
    }
  };

  const updateQuantity = (id, newQty) => {
    const qty = Math.max(1, Number(newQty) || 1);
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty, lineTotal: qty * item.sellingPrice } : item
      )
    );
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.lineTotal, 0);
  const taxTotal = cart.reduce((acc, item) => {
    const taxPart = (item.lineTotal * item.gstRate) / (100 + item.gstRate);
    return acc + taxPart;
  }, 0);
  const totalTax = taxTotal;
  const grandTotal = subtotal;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMode === 'CREDIT' && !selectedCustomerId) {
      setErrorMsg('Please select a registered customer for Credit (Udhar) sales!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const salePayload = {
        customer_id: selectedCustomerId ? Number(selectedCustomerId) : null,
        customer_name: customerName,
        payment_mode: paymentMode,
        paid_amount:
          paymentMode === 'CASH' && receivedAmount
            ? Number(receivedAmount)
            : paymentMode === 'CREDIT'
            ? 0
            : grandTotal,
        items: cart.map((i) => ({
          id: i.id,
          qty: i.qty,
          sellingPrice: i.sellingPrice,
          barcode: i.barcode
        }))
      };

      const res = await api.createSale(salePayload);
      
      // Open Thermal Receipt Modal
      setReceiptData({
        invoiceNo: res.data.invoiceNo,
        date: new Date().toLocaleString(),
        customer: customerName,
        items: [...cart],
        subtotal,
        taxTotal,
        grandTotal,
        paymentMode,
        receivedAmount: paymentMode === 'CASH' && receivedAmount ? Number(receivedAmount) : grandTotal,
        change: paymentMode === 'CASH' && receivedAmount ? Math.max(0, Number(receivedAmount) - grandTotal) : 0
      });

      setCart([]);
      setReceivedAmount('');
      setLastScannedMessage(null);
    } catch (err) {
      setErrorMsg('Checkout failed: ' + (err.message || 'Could not deduct stock'));
    } finally {
      setIsSubmitting(false);
      if (searchInputRef.current) searchInputRef.current.focus();
    }
  };

  const filteredCatalogItems = catalogItems.filter((i) => {
    if (!catalogSearch) return true;
    const q = catalogSearch.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      (i.tamil_name && i.tamil_name.toLowerCase().includes(q)) ||
      i.sku.toLowerCase().includes(q) ||
      (i.barcodes && i.barcodes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-100">
      {/* Top POS Action Toolbar */}
      <div className="bg-white px-4 py-2 border-b border-gray-300 flex items-center justify-between shadow-xs relative z-20 print:hidden">
        <div className="flex items-center gap-3 flex-1 max-w-3xl">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-sm shrink-0">
            <ReceiptText className="w-4 h-4 text-emerald-600" />
            <span>{t('billing')}</span>
          </div>

          {/* Omni-Search Box */}
          <div className="relative flex-1">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-2.5 text-blue-600 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t('billingSearchPlaceholder') || 'Scan barcode, type product name or SKU code (F2)...'}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="form-input pl-9 pr-8 w-full text-xs font-medium border-blue-400 bg-blue-50/20 focus:bg-white shadow-inner"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setShowDropdown(false);
                    if (searchInputRef.current) searchInputRef.current.focus();
                  }}
                  className="absolute right-2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute left-0 right-0 top-full mt-1 bg-white border border-blue-400 rounded-md shadow-xl max-h-80 overflow-y-auto z-50 divide-y divide-gray-100"
              >
                <div className="px-3 py-1.5 bg-blue-50 text-[11px] font-bold text-blue-800 flex justify-between items-center border-b border-blue-200">
                  <span>Found {suggestions.length} products matching in MySQL:</span>
                  <span className="text-[10px] text-blue-600 font-normal">Use ↑ ↓ keys and Enter to add</span>
                </div>
                {suggestions.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => addProductToCart(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between transition text-xs ${
                      selectedIndex === idx ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-gray-900'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate">{item.name}</span>
                        {item.tamil_name && (
                          <span
                            className={`text-[11px] truncate ${
                              selectedIndex === idx ? 'text-blue-100' : 'text-gray-500'
                            }`}
                          >
                            ({item.tamil_name})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px]">
                        <span
                          className={`font-mono px-1 rounded ${
                            selectedIndex === idx
                              ? 'bg-blue-700 text-white'
                              : 'bg-gray-100 text-indigo-700 border border-gray-200'
                          }`}
                        >
                          Code: {item.sku}
                        </span>
                        {item.barcodes && (
                          <span
                            className={`font-mono truncate ${
                              selectedIndex === idx ? 'text-blue-200' : 'text-gray-500'
                            }`}
                          >
                            Barcode: {item.barcodes.split(',')[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold font-mono text-sm">
                        ₹{Number(item.selling_price).toFixed(2)}
                      </div>
                      <div
                        className={`text-[10px] font-semibold mt-0.5 ${
                          Number(item.current_stock) > 0
                            ? selectedIndex === idx
                              ? 'text-emerald-200'
                              : 'text-emerald-600'
                            : selectedIndex === idx
                            ? 'text-rose-200'
                            : 'text-rose-600'
                        }`}
                      >
                        Stock: {item.current_stock} {item.unit_code || 'PCS'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={openCatalogModal}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0 bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100"
          >
            <Layers className="w-3.5 h-3.5 text-blue-700" />
            <span>{t('searchCatalogBtn') || 'Find Item (F2)'}</span>
          </button>
        </div>

        {/* Scan Status Toast Indicator */}
        {lastScannedMessage && (
          <div
            className={`text-xs px-2.5 py-1 rounded flex items-center gap-1.5 font-semibold shrink-0 ml-3 ${
              lastScannedMessage.success
                ? 'bg-green-100 text-green-900 border border-green-300'
                : 'bg-red-100 text-red-900 border border-red-300'
            }`}
          >
            {lastScannedMessage.success ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            )}
            <span>{lastScannedMessage.text}</span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-800 text-xs px-4 py-1.5 border-b border-red-200 flex items-center gap-2 print:hidden">
          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Billing Grid */}
      <div className="flex-1 flex overflow-hidden p-3 gap-3 print:hidden">
        {/* Left: Cart Table */}
        <div className="flex-1 bg-white border border-gray-300 shadow-xs flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="excel-table text-xs">
              <thead>
                <tr>
                  <th className="w-10 text-center">{t('sNo')}</th>
                  <th>{t('productName')}</th>
                  <th>{t('barcode')} / {t('sku')}</th>
                  <th className="text-right">{t('price')}</th>
                  <th className="text-center w-24">{t('qty')}</th>
                  <th className="text-right">{t('gst')}</th>
                  <th className="text-right">{t('total')}</th>
                  <th className="w-10 text-center">{t('remove')}</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-16 text-gray-400">
                      <ScanBarcode className="w-10 h-10 text-gray-300 mx-auto mb-2 animate-bounce" />
                      <div className="font-bold text-gray-600">{t('cartEmpty')}</div>
                      <div className="text-[11px] mt-1 text-gray-500 max-w-md mx-auto">
                        {t('cartEmptyDesc')}
                      </div>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={openCatalogModal}
                          className="btn-primary text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Browse Product Catalog (F2)</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  cart.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                      <td>
                        <div className="font-bold text-gray-900">{item.name}</div>
                        {item.tamilName && <div className="text-gray-600 text-[11px]">{item.tamilName}</div>}
                      </td>
                      <td className="font-mono text-indigo-700">{item.barcode || item.sku}</td>
                      <td className="num-cell">₹{item.sellingPrice.toFixed(2)}</td>
                      <td className="text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateQuantity(item.id, e.target.value)}
                          className="form-input w-16 text-center font-bold font-mono py-0.5 text-xs"
                        />
                      </td>
                      <td className="num-cell text-gray-500">{item.gstRate}%</td>
                      <td className="num-cell font-bold text-blue-900">₹{item.lineTotal.toFixed(2)}</td>
                      <td className="text-center">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove item"
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

          {/* Table Footer Summary */}
          <div className="bg-gray-50 p-2.5 border-t border-gray-300 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-600">
              {t('itemsCount')}: <b className="text-gray-900">{cart.length}</b> | {t('totalUnits')}:{' '}
              <b className="text-gray-900">{cart.reduce((a, b) => a + b.qty, 0)}</b>
            </span>
            <button
              onClick={() => setCart([])}
              disabled={cart.length === 0}
              className="text-red-600 hover:underline font-semibold disabled:opacity-40"
            >
              {t('clearCart')}
            </button>
          </div>
        </div>

        {/* Right: Customer & Payment POS Card */}
        <div className="w-80 bg-white border border-gray-300 shadow-xs flex flex-col p-4 space-y-3">
          {/* Customer Selection (Walk-in vs Khata / Udhar Customer) */}
          <div className="bg-gray-50 p-2.5 rounded border border-gray-200 text-xs">
            <label className="block font-bold text-gray-700 mb-1 flex items-center justify-between">
              <span>Customer (வாடிக்கையாளர்):</span>
              <UserCheck className="w-3.5 h-3.5 text-blue-700" />
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => {
                const cId = e.target.value;
                setSelectedCustomerId(cId);
                const found = customers.find((c) => String(c.id) === cId);
                setCustomerName(found ? found.name : 'Walk-in Customer');
              }}
              className="form-input w-full font-bold py-1 text-xs"
            >
              <option value="">Walk-in Customer (சில்லறை வாடிக்கையாளர்)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) - Udhar: ₹{Number(c.current_balance).toFixed(0)}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-950 text-white p-3 rounded text-center">
            <div className="text-xs uppercase tracking-wider text-blue-200 font-bold">{t('grandTotal')}</div>
            <div className="text-3xl font-black font-mono mt-1 text-yellow-300">
              ₹{grandTotal.toFixed(2)}
            </div>
            <div className="text-[11px] text-blue-300 mt-1">
              ({t('taxPart')}: ₹{totalTax.toFixed(2)})
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
              {t('paymentMode')}
            </label>
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => setPaymentMode('CASH')}
                className={`py-2 px-1 text-[11px] font-bold rounded flex flex-col items-center gap-1 border transition ${
                  paymentMode === 'CASH'
                    ? 'bg-blue-800 text-white border-blue-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Cash</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('UPI')}
                className={`py-2 px-1 text-[11px] font-bold rounded flex flex-col items-center gap-1 border transition ${
                  paymentMode === 'UPI'
                    ? 'bg-blue-800 text-white border-blue-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>UPI</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('CARD')}
                className={`py-2 px-1 text-[11px] font-bold rounded flex flex-col items-center gap-1 border transition ${
                  paymentMode === 'CARD'
                    ? 'bg-blue-800 text-white border-blue-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Card</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('CREDIT')}
                className={`py-2 px-1 text-[11px] font-bold rounded flex flex-col items-center gap-1 border transition ${
                  paymentMode === 'CREDIT'
                    ? 'bg-rose-800 text-white border-rose-900'
                    : 'bg-gray-100 text-rose-700 hover:bg-rose-50 border-gray-300'
                }`}
              >
                <ReceiptText className="w-3.5 h-3.5" />
                <span>கடன்</span>
              </button>
            </div>
          </div>

          {/* Cash calculation */}
          {paymentMode === 'CASH' && (
            <div className="bg-gray-50 p-2 border border-gray-200 rounded space-y-1.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-0.5">{t('receivedAmount')}</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  className="form-input w-full font-mono font-bold text-right text-sm"
                />
              </div>
              {Number(receivedAmount) >= grandTotal && (
                <div className="flex justify-between font-bold text-emerald-800 pt-1 border-t border-gray-200">
                  <span>{t('balanceToGive')}</span>
                  <span className="font-mono text-sm">₹{(Number(receivedAmount) - grandTotal).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Checkout & Commit Button */}
          <button
            disabled={cart.length === 0 || isSubmitting}
            onClick={handleCheckout}
            className="w-full btn-success text-sm py-3 justify-center text-center font-bold shadow-md cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>{isSubmitting ? t('saving') : t('saveAndPrint')}</span>
          </button>
        </div>
      </div>

      {/* F2 Product Catalog Modal */}
      {isCatalogOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col border border-gray-300 overflow-hidden">
            <div className="bg-blue-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-300" />
                <h3 className="font-bold text-sm">Product Catalog Search (F2)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCatalogOpen(false)}
                className="text-blue-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-500" />
                <input
                  ref={catalogSearchRef}
                  type="text"
                  placeholder="Filter by name, SKU or barcode..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="form-input pl-9 w-full text-xs font-medium"
                />
              </div>
              <span className="text-xs text-gray-500 shrink-0">
                {filteredCatalogItems.length} products
              </span>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <table className="excel-table text-xs">
                <thead>
                  <tr>
                    <th className="w-8 text-center">#</th>
                    <th>{t('productName')}</th>
                    <th>{t('sku')}</th>
                    <th>{t('barcode')}</th>
                    <th className="text-right">{t('price')}</th>
                    <th className="text-center">{t('currentStock')}</th>
                    <th className="w-20 text-center">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatalogItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-blue-50/60">
                      <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                      <td>
                        <div className="font-bold text-gray-900">{item.name}</div>
                        {item.tamil_name && <div className="text-gray-500 text-[11px]">{item.tamil_name}</div>}
                      </td>
                      <td className="font-mono text-indigo-700">{item.sku}</td>
                      <td className="font-mono text-gray-600">{item.barcodes || '-'}</td>
                      <td className="num-cell font-bold text-gray-900">
                        ₹{Number(item.selling_price).toFixed(2)}
                      </td>
                      <td className="text-center font-bold">
                        {item.current_stock} {item.unit_code || 'PCS'}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => {
                            addProductToCart(item);
                            setIsCatalogOpen(false);
                          }}
                          className="btn-primary text-[11px] py-1 px-2.5"
                        >
                          + Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      {receiptData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-400 overflow-hidden flex flex-col max-h-[92vh] max-w-sm w-full my-auto">
            <div className="bg-emerald-800 text-white p-3 flex justify-between items-center print:hidden">
              <span className="font-bold text-xs uppercase">Invoice {receiptData.invoiceNo} Saved!</span>
              <button onClick={() => setReceiptData(null)} className="text-emerald-200 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thermal Slip Content (Printable) */}
            <div className="p-4 bg-white text-black font-mono text-[11px] leading-tight printable-receipt overflow-y-auto">
              <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
                <div className="text-sm font-black uppercase tracking-wider">
                  {shopSettings?.shop_name || 'RETAIL BILLING SYSTEM'}
                </div>
                <div className="text-[12px] font-bold text-gray-800">
                  {shopSettings?.shop_tamil_name || 'சில்லறை பில்லிங் நிலையம்'}
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">
                  {shopSettings?.shop_address || 'Main Road, Retail Market'}
                </div>
                <div className="text-[10px] text-gray-600">
                  Phone: {shopSettings?.shop_phone || '+91 9876543210'}
                </div>
                {shopSettings?.shop_gstin && (
                  <div className="text-[10px] font-bold">GSTIN: {shopSettings.shop_gstin}</div>
                )}
              </div>

              <div className="flex justify-between border-b border-dashed border-gray-400 pb-1.5 mb-2 text-[10px]">
                <div>
                  <div>Bill: <b>{receiptData.invoiceNo}</b></div>
                  <div>Cust: {receiptData.customer}</div>
                </div>
                <div className="text-right">
                  <div>{receiptData.date}</div>
                  <div>Mode: <b>{receiptData.paymentMode}</b></div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-[10px] mb-2 border-b border-dashed border-gray-400 pb-2">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left py-1">Item</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Rate</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-0.5">
                        <div className="font-bold truncate max-w-[120px]">{it.name}</div>
                        {it.tamilName && <div className="text-[9px] text-gray-600">{it.tamilName}</div>}
                      </td>
                      <td className="text-center font-bold">{it.qty}</td>
                      <td className="text-right">₹{it.sellingPrice.toFixed(2)}</td>
                      <td className="text-right font-bold">₹{it.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="space-y-1 border-b border-dashed border-gray-400 pb-2 mb-2 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{receiptData.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 text-[10px]">
                  <span>Incl. GST Tax:</span>
                  <span>₹{receiptData.taxTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1 border-t border-gray-300">
                  <span>NET TOTAL:</span>
                  <span>₹{receiptData.grandTotal.toFixed(2)}</span>
                </div>
                {receiptData.paymentMode === 'CASH' && (
                  <>
                    <div className="flex justify-between text-[10px] pt-1">
                      <span>Received Cash:</span>
                      <span>₹{Number(receiptData.receivedAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[11px] text-emerald-800">
                      <span>Change Given:</span>
                      <span>₹{Number(receiptData.change).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Barcode of Invoice */}
              <div
                className="my-2 flex justify-center overflow-hidden"
                dangerouslySetInnerHTML={{
                  __html: generateCode128Svg(receiptData.invoiceNo, {
                    height: 24,
                    barWidth: 1.2,
                    showText: true
                  })
                }}
              />

              <div className="text-center text-[10px] text-gray-600 mt-2">
                {shopSettings?.receipt_footer || 'Thank you! Visit Again! / வருகைக்கு நன்றி!'}
              </div>
            </div>

            {/* Print Modal Buttons */}
            <div className="p-3 bg-gray-100 border-t border-gray-300 flex justify-between items-center print:hidden">
              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                Close (Esc)
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-success text-xs py-2 px-4 font-bold flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal Bill</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for Thermal Receipt Printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-receipt, .printable-receipt * {
            visibility: visible;
          }
          .printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            margin: 0;
            padding: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}
