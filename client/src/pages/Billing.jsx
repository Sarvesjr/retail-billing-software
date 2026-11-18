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
  UserCheck,
  Gift,
  Percent,
  Tag,
  Star,
  MessageSquareHeart,
  Clock,
  AlertTriangle,
  ShieldAlert
} from 'lucide-react';

export function Billing() {
  const { t, lang } = useI18n();
  const [cart, setCart] = useState([]);

  // Damaged Product Reporting during Billing (POS Quarantine)
  const [damagedModalItem, setDamagedModalItem] = useState(null);
  const [damageQty, setDamageQty] = useState(1);
  const [damageReason, setDamageReason] = useState('Broken / Leaking detected at counter');
  const [deductFromBill, setDeductFromBill] = useState(true);
  const [isQuarantining, setIsQuarantining] = useState(false);

  // Quick Damage Toolbar modal (F7)
  const [isQuickDamageModalOpen, setIsQuickDamageModalOpen] = useState(false);
  const [quickDamageSearch, setQuickDamageSearch] = useState('');
  const [quickDamageSuggestions, setQuickDamageSuggestions] = useState([]);
  const [selectedQuickDamageProduct, setSelectedQuickDamageProduct] = useState(null);
  const [isSearchingQuickDamage, setIsSearchingQuickDamage] = useState(false);

  // Bill-Level Discount state
  const [discountType, setDiscountType] = useState('NONE'); // 'NONE' | 'FIXED' | 'PERCENT'
  const [discountValue, setDiscountValue] = useState('');

  // 7-Second Feedback Prompt state (Non-blocking, skippable)
  const [feedbackPrompt, setFeedbackPrompt] = useState(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackCountdown, setFeedbackCountdown] = useState(7);
  const feedbackTimerRef = useRef(null);

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
  const lastScanBarcodeRef = useRef('');
  const lastScanTimeRef = useRef(0);
  const isScanningInProgressRef = useRef(false);
  const lastKeyTimeRef = useRef(0);
  const rapidKeyCountRef = useRef(0);
  const rapidScanTimerRef = useRef(null);
  const cartRef = useRef(cart);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
    // Load customers and shop settings
    api.getCustomers().then((res) => setCustomers(res.data || [])).catch(() => {});
    api.getSettings().then((res) => setShopSettings(res.data)).catch(() => {});
  }, []);

  // Debounce for Quick Damage search (F7)
  useEffect(() => {
    const q = quickDamageSearch.trim();
    if (!q || !isQuickDamageModalOpen) {
      setQuickDamageSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingQuickDamage(true);
      try {
        const res = await api.getProducts({ search: q, limit: 8 });
        setQuickDamageSuggestions(res.data || []);
      } catch (err) {
        console.error('Quick damage search error:', err);
      } finally {
        setIsSearchingQuickDamage(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [quickDamageSearch, isQuickDamageModalOpen]);

  // Global Keyboard shortcuts: F2 (Catalog Lookup), F5 (Save Bill), F7 (Mark Damaged), Escape (Close)
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
      } else if (e.key === 'F7') {
        e.preventDefault();
        setIsQuickDamageModalOpen(true);
        setSelectedQuickDamageProduct(null);
        setDamageQty(1);
        setDamageReason('Broken / Leaking detected at counter');
      } else if (e.key === 'Escape') {
        setShowDropdown(false);
        setIsCatalogOpen(false);
        setReceiptData(null);
        setDamagedModalItem(null);
        setIsQuickDamageModalOpen(false);
        if (searchInputRef.current) searchInputRef.current.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cart, isSubmitting]);

  // Direct Barcode Scan Processor (Hardware USB + Phone Camera)
  const handleDirectBarcodeScan = async (rawCode, inputSource = 'HARDWARE_USB') => {
    const code = String(rawCode || '').trim();
    if (!code) return;

    const now = Date.now();
    // 1. Strict Cooldown: Ignore identical barcode scanned within 1200ms
    if (code === lastScanBarcodeRef.current && (now - lastScanTimeRef.current) < 1200) {
      setSearchInput('');
      if (searchInputRef.current) searchInputRef.current.value = '';
      return;
    }

    // 2. Strict Mutex: If a scan is currently processing, drop concurrent requests
    if (isScanningInProgressRef.current) {
      return;
    }

    lastScanBarcodeRef.current = code;
    lastScanTimeRef.current = now;
    isScanningInProgressRef.current = true;

    // Immediately stop search debounce and suppress dropdown
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (rapidScanTimerRef.current) clearTimeout(rapidScanTimerRef.current);
    setShowDropdown(false);
    setSuggestions([]);
    setSelectedIndex(-1);
    setSearchInput('');
    if (searchInputRef.current) searchInputRef.current.value = '';

    try {
      const barcodeRes = await api.lookupBarcode(code, inputSource);
      if (barcodeRes.found && barcodeRes.product) {
        const prod = barcodeRes.product;
        const stock = Number(prod.currentStock ?? prod.current_stock ?? 0);
        const isActive = prod.is_active !== undefined ? Boolean(Number(prod.is_active)) : true;
        const prodName = prod.name || prod.product_name || `Item (${code})`;
        const unit = prod.unit || prod.unit_code || 'PCS';

        if (!isActive) {
          setLastScannedMessage({
            success: false,
            text: `"${prodName}" is INACTIVE`
          });
          setErrorMsg(`Cannot add "${prodName}": Product is marked INACTIVE in store inventory.`);
          return;
        }

        if (stock <= 0) {
          setLastScannedMessage({
            success: false,
            text: `"${prodName}" is OUT OF STOCK (0 in stock)!`
          });
          setErrorMsg(`Cannot add "${prodName}": Product is OUT OF STOCK (0 in stock)!`);
          return;
        }

        const existingInCart = (cartRef.current || []).find((item) => Number(item.id) === Number(prod.id || prod.product_id));
        if (existingInCart && existingInCart.qty + 1 > stock) {
          setLastScannedMessage({
            success: false,
            text: `"${prodName}" reached stock limit (${stock} ${unit})!`
          });
          setErrorMsg(`Cannot add more of "${prodName}": Maximum available stock is ${stock} ${unit}.`);
          return;
        }

        addProductToCart(prod);
        setLastScannedMessage({
          success: true,
          text: `Added "${prodName}" via ${inputSource}`
        });
        setErrorMsg('');
        return;
      }

      // Fallback check by SKU or product name in MySQL
      const searchRes = await api.getProducts({ search: code, limit: 1 });
      if (searchRes.data && searchRes.data.length > 0) {
        const prod = searchRes.data[0];
        const stock = Number(prod.current_stock ?? 0);
        const isActive = prod.is_active !== undefined ? Boolean(Number(prod.is_active)) : true;
        const prodName = prod.name;
        const unit = prod.unit_code || 'PCS';

        if (!isActive) {
          setLastScannedMessage({
            success: false,
            text: `"${prodName}" is INACTIVE`
          });
          setErrorMsg(`Cannot add "${prodName}": Product is marked INACTIVE in store inventory.`);
          return;
        }

        if (stock <= 0) {
          setLastScannedMessage({
            success: false,
            text: `"${prodName}" is OUT OF STOCK (0 in stock)!`
          });
          setErrorMsg(`Cannot add "${prodName}": Product is OUT OF STOCK (0 in stock)!`);
          return;
        }

        const existingInCart = (cartRef.current || []).find((item) => Number(item.id) === Number(prod.id));
        if (existingInCart && existingInCart.qty + 1 > stock) {
          setLastScannedMessage({
            success: false,
            text: `"${prodName}" reached stock limit (${stock} ${unit})!`
          });
          setErrorMsg(`Cannot add more of "${prodName}": Maximum available stock is ${stock} ${unit}.`);
          return;
        }

        addProductToCart(prod);
        setLastScannedMessage({
          success: true,
          text: `Added "${prodName}" via ${inputSource}`
        });
        setErrorMsg('');
        return;
      }

      setLastScannedMessage({
        success: false,
        text: `Barcode "${code}" not found in MySQL`
      });
      setErrorMsg(`Barcode "${code}" not found in MySQL database.`);
    } catch (err) {
      console.error('Direct barcode scan error:', err);
      setErrorMsg(`Barcode scan failed: ${err.message}`);
    } finally {
      isScanningInProgressRef.current = false;
      if (searchInputRef.current) searchInputRef.current.focus();
    }
  };

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

      handleDirectBarcodeScan(scanData.barcode, scanData.inputSource || 'PHONE_CAMERA');
    };

    window.addEventListener(SCAN_EVENT, handleScanEvent);
    return () => window.removeEventListener(SCAN_EVENT, handleScanEvent);
  }, []);

  // Omni-search suggestions debounce (ONLY for manual product name typing, NEVER for barcodes)
  useEffect(() => {
    const query = searchInput.trim();
    if (!query) {
      setSuggestions([]);
      setShowDropdown(false);
      setSelectedIndex(-1);
      return;
    }

    // 1. If barcode/numeric is typed/scanned: NEVER show dropdown!
    if (/^\d{5,}$/.test(query)) {
      setShowDropdown(false);
      setSuggestions([]);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      return;
    }

    // 2. If rapid scanner typing detected, do not show dropdown
    if (rapidKeyCountRef.current >= 4) {
      setShowDropdown(false);
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
    }, 180);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  const addProductToCart = (p) => {
    if (!p) return;
    const id = Number(p.id || p.product_id);
    const sku = p.sku || `PRD-${id}`;
    const name = p.name || p.product_name;
    const tamilName = p.tamilName || p.tamil_name || p.product_tamil_name || '';
    const barcode = p.barcode || (p.barcodes ? p.barcodes.split(',')[0].trim() : '') || sku;
    const sellingPrice = Number(p.sellingPrice ?? p.selling_price ?? 0);
    const gstRate = Number(p.gstRate ?? p.gst_rate ?? 0);
    const unit = p.unit || p.unit_code || 'PCS';
    const currentStock = Number(p.currentStock ?? p.current_stock ?? 0);
    const isActive = p.is_active !== undefined ? Boolean(Number(p.is_active)) : true;

    if (!isActive) {
      setErrorMsg(`Cannot add "${name}": Product is marked INACTIVE in store inventory.`);
      return;
    }

    if (currentStock <= 0) {
      setErrorMsg(`Cannot add "${name}": Product is OUT OF STOCK (Available: 0 ${unit})!`);
      return;
    }

    const existingItem = (cartRef.current || []).find((item) => Number(item.id) === id);
    if (existingItem) {
      const currentPaid = Number(existingItem.qty) || 0;
      const currentFree = Number(existingItem.freeQty) || 0;
      if (currentPaid + currentFree + 1 > currentStock) {
        setErrorMsg(`Cannot add more of "${name}": Total units (${currentPaid + currentFree + 1}) exceed available stock (${currentStock} ${unit}).`);
        return;
      }
    }

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => Number(item.id) === Number(id));
      if (existingIndex > -1) {
        // Pure immutable update: create new item object so React never mutates in-place
        return prevCart.map((item, idx) => {
          if (idx !== existingIndex) return item;
          const currentFree = Number(item.freeQty) || 0;
          const nextQty = Math.min(item.qty + 1, Math.max(0, currentStock - currentFree));
          const baseAmount = nextQty * item.sellingPrice;
          const taxAmount = (baseAmount * item.gstRate) / 100;
          return {
            ...item,
            currentStock,
            qty: nextQty,
            baseAmount,
            taxAmount,
            lineTotal: baseAmount + taxAmount
          };
        });
      } else {
        const baseAmount = 1 * sellingPrice;
        const taxAmount = (baseAmount * gstRate) / 100;
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
          qty: 1, // Paid units chosen to bill
          freeQty: 0, // Separate free samples column (defaults to 0, up to available stock - qty)
          baseAmount,
          taxAmount,
          lineTotal: baseAmount + taxAmount
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

  const handleSearchKeyDown = (e) => {
    const now = Date.now();
    const diff = now - lastKeyTimeRef.current;
    lastKeyTimeRef.current = now;

    if (diff < 50) {
      rapidKeyCountRef.current += 1;
    } else {
      rapidKeyCountRef.current = 1;
    }

    // If typing fast (scanner speed), hide dropdown immediately
    if (rapidKeyCountRef.current >= 4) {
      setShowDropdown(false);
    }

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
      if (rapidScanTimerRef.current) clearTimeout(rapidScanTimerRef.current);
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      rapidKeyCountRef.current = 0;

      const query = (e.target.value || searchInput).trim();
      if (!query) return;

      setShowDropdown(false);
      setSuggestions([]);
      setSearchInput('');
      e.target.value = '';

      // 1. If user navigated suggestions with arrows and explicitly chose one
      if (selectedIndex >= 0 && suggestions[selectedIndex] && suggestions[selectedIndex].name) {
        addProductToCart(suggestions[selectedIndex]);
        return;
      }

      // 2. Direct barcode lookup in MySQL
      handleDirectBarcodeScan(query, 'HARDWARE_USB');
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    } else {
      // For hardware scanners that DO NOT send an Enter key suffix:
      // Only fire after rapid scanner burst completes (120ms pause after 5+ rapid chars)
      if (rapidScanTimerRef.current) clearTimeout(rapidScanTimerRef.current);
      if (rapidKeyCountRef.current >= 5) {
        rapidScanTimerRef.current = setTimeout(() => {
          const val = (searchInputRef.current?.value || searchInput).trim();
          if (val && val.length >= 4) {
            rapidKeyCountRef.current = 0;
            handleDirectBarcodeScan(val, 'HARDWARE_USB');
          }
        }, 120);
      }
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
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        let qty = Math.max(0, Number(newQty) || 0);
        const freeQty = Number(item.freeQty) || 0;
        if (item.currentStock > 0 && qty + freeQty > item.currentStock) {
          qty = Math.max(0, item.currentStock - freeQty);
          setErrorMsg(`Paid quantity for "${item.name}" adjusted to available stock (${item.currentStock} ${item.unit} total, with ${freeQty} free samples).`);
        }
        const itemDisc = Math.min(item.sellingPrice * qty, Number(item.discountAmount) || 0);
        const baseAmount = Math.max(0, (qty * item.sellingPrice) - itemDisc);
        const taxAmount = (baseAmount * item.gstRate) / 100;
        return {
          ...item,
          qty,
          baseAmount,
          taxAmount,
          lineTotal: baseAmount + taxAmount
        };
      })
    );
  };

  // Separate Column: Dynamic Free Sample quantity (from 0 to available products max left after subtracting current chosen to bill)
  const updateFreeQuantity = (id, newFreeQty) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const paidQty = Number(item.qty) || 0;
        const maxFreeAllowed = Math.max(0, item.currentStock - paidQty);
        let freeQty = Math.max(0, Number(newFreeQty) || 0);
        if (freeQty > maxFreeAllowed) {
          freeQty = maxFreeAllowed;
          setErrorMsg(`Free samples for "${item.name}" capped at remaining available stock (${maxFreeAllowed} ${item.unit}).`);
        }
        return {
          ...item,
          freeQty
        };
      })
    );
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // --------------------------------------------------------------------------
  // POS Damaged Stock Reporting (Quarantine while Billing)
  // --------------------------------------------------------------------------
  const handleReportCartItemDamaged = (item) => {
    setDamagedModalItem(item);
    setDamageQty(1);
    setDamageReason('Broken / Leaking detected at counter');
    setDeductFromBill(true);
  };

  const handleConfirmQuarantine = async (e) => {
    e.preventDefault();
    const targetProduct = damagedModalItem || selectedQuickDamageProduct;
    if (!targetProduct) return;

    const qQty = Math.max(1, Number(damageQty) || 1);
    setIsQuarantining(true);
    try {
      const res = await api.quarantineDamagedStock({
        product_id: targetProduct.id,
        damaged_quantity: qQty,
        damage_reason: damageReason,
        source: 'BILLING_COUNTER'
      });

      const updatedStock = res.data?.currentStock ?? Math.max(0, Number(targetProduct.currentStock) - qQty);

      // If the product is in current cart, update stock and deduct from bill if requested
      setCart((prev) =>
        prev
          .map((it) => {
            if (Number(it.id) !== Number(targetProduct.id)) return it;
            let newPaid = it.qty;
            if (deductFromBill && damagedModalItem) {
              newPaid = Math.max(0, it.qty - qQty);
            }
            let newFree = it.freeQty || 0;
            if (newPaid + newFree > updatedStock) {
              newFree = Math.max(0, updatedStock - newPaid);
            }
            const itemDisc = Math.min(it.sellingPrice * newPaid, Number(it.discountAmount) || 0);
            const baseAmount = Math.max(0, (newPaid * it.sellingPrice) - itemDisc);
            const taxAmount = (baseAmount * it.gstRate) / 100;
            return {
              ...it,
              currentStock: updatedStock,
              qty: newPaid,
              freeQty: newFree,
              baseAmount,
              taxAmount,
              lineTotal: baseAmount + taxAmount
            };
          })
          .filter((it) => (Number(it.qty) > 0 || (Number(it.freeQty) || 0) > 0))
      );

      setLastScannedMessage({
        success: true,
        text: `Quarantined ${qQty} unit(s) of "${targetProduct.name}" into Damaged Stock. Available stock is now ${updatedStock}.`
      });

      setDamagedModalItem(null);
      setIsQuickDamageModalOpen(false);
      setSelectedQuickDamageProduct(null);
      setQuickDamageSearch('');
    } catch (err) {
      setErrorMsg('Failed to quarantine damaged stock: ' + err.message);
    } finally {
      setIsQuarantining(false);
    }
  };

  // 100% PRECISE BILLING MATH (Zero mix-ups between free samples, discounts, taxes, and grand totals)
  // 1. Items Base Subtotal (Sum of Price * Qty for non-sample items minus item discounts)
  const itemsSubtotal = cart.reduce((acc, item) => {
    const paidQty = Number(item.qty) || 0;
    if (paidQty <= 0) return acc;
    const itemDisc = Math.min(item.sellingPrice * paidQty, Number(item.discountAmount) || 0);
    return acc + Math.max(0, (item.sellingPrice * paidQty) - itemDisc);
  }, 0);
  const subtotal = Number(itemsSubtotal.toFixed(2));

  // 2. Bill-Level Discount (Flat ₹ or % Percentage of subtotal)
  let billDiscount = 0;
  const numDiscVal = Number(discountValue) || 0;
  if (discountType === 'FIXED' && numDiscVal > 0) {
    billDiscount = Math.min(subtotal, numDiscVal);
  } else if (discountType === 'PERCENT' && numDiscVal > 0) {
    billDiscount = Number(((subtotal * Math.min(100, numDiscVal)) / 100).toFixed(2));
  }

  const netSubtotal = Math.max(0, Number((subtotal - billDiscount).toFixed(2)));

  // 3. GST Tax Amount (Calculated strictly on payable items)
  const taxTotal = Number(cart.reduce((acc, item) => {
    const paidQty = Number(item.qty) || 0;
    if (paidQty <= 0) return acc;
    const itemDisc = Math.min(item.sellingPrice * paidQty, Number(item.discountAmount) || 0);
    const itemBase = Math.max(0, (item.sellingPrice * paidQty) - itemDisc);
    return acc + ((itemBase * item.gstRate) / 100);
  }, 0).toFixed(2));
  const totalTax = taxTotal;

  // 4. Combined Total Discount (Item discounts + Bill-level discount)
  const itemDiscountsSum = cart.reduce((acc, item) => {
    const paidQty = Number(item.qty) || 0;
    if (paidQty <= 0) return acc;
    return acc + (Number(item.discountAmount) || 0);
  }, 0);
  const totalDiscount = Number((itemDiscountsSum + billDiscount).toFixed(2));

  // 5. Net Grand Total = Net Subtotal + GST Tax
  const grandTotal = Number((netSubtotal + taxTotal).toFixed(2));

  // 7-Second Feedback Prompt Handlers (Non-blocking, auto-closing, skippable)
  const startFeedbackPrompt = (invoiceNo, custName, custPhone) => {
    if (feedbackTimerRef.current) clearInterval(feedbackTimerRef.current);
    setFeedbackPrompt({
      invoiceNo,
      customerName: custName || 'Walk-in Customer',
      customerPhone: custPhone || ''
    });
    setFeedbackRating(5);
    setFeedbackComment('');
    setFeedbackCountdown(7);

    feedbackTimerRef.current = setInterval(() => {
      setFeedbackCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(feedbackTimerRef.current);
          setFeedbackPrompt(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleDismissFeedback = () => {
    if (feedbackTimerRef.current) clearInterval(feedbackTimerRef.current);
    setFeedbackPrompt(null);
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackPrompt) return;
    try {
      await api.createFeedback({
        invoice_no: feedbackPrompt.invoiceNo,
        customer_name: feedbackPrompt.customerName,
        customer_phone: feedbackPrompt.customerPhone,
        rating: feedbackRating,
        comment: feedbackComment
      });
    } catch (err) {
      console.warn('Feedback submit error:', err);
    } finally {
      handleDismissFeedback();
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    const totalUnits = cart.reduce((acc, it) => acc + (Number(it.qty) || 0) + (Number(it.freeQty) || 0), 0);
    if (totalUnits <= 0) {
      setErrorMsg('Please enter at least 1 unit to bill or give as a free sample.');
      return;
    }

    if (paymentMode === 'CREDIT' && !selectedCustomerId) {
      setErrorMsg('Please select a registered customer for Credit (Udhar) sales!');
      return;
    }

    if (paymentMode === 'CASH') {
      const cashReceived = Number(receivedAmount);
      if (!receivedAmount || isNaN(cashReceived) || cashReceived < grandTotal) {
        const shortAmt = (grandTotal - (isNaN(cashReceived) ? 0 : cashReceived)).toFixed(2);
        setErrorMsg(
          `Insufficient money! Received cash ₹${(isNaN(cashReceived) ? 0 : cashReceived).toFixed(2)} is less than bill total ₹${grandTotal.toFixed(2)}. (Short by ₹${shortAmt})`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Regular paid items first
      const saleItems = [];
      for (const i of cart) {
        const paidQty = Number(i.qty) || 0;
        if (paidQty > 0) {
          saleItems.push({
            id: i.id,
            qty: paidQty,
            quantity: paidQty,
            sellingPrice: i.sellingPrice,
            unit_price: i.sellingPrice,
            barcode: i.barcode,
            is_free_sample: false,
            discount_amount: Number(i.discountAmount) || 0
          });
        }
      }
      // 2. All Free Samples placed strictly at the bottom
      for (const i of cart) {
        const freeQty = Number(i.freeQty) || 0;
        if (freeQty > 0) {
          saleItems.push({
            id: i.id,
            qty: freeQty,
            quantity: freeQty,
            sellingPrice: 0,
            unit_price: 0,
            barcode: i.barcode,
            is_free_sample: true,
            discount_amount: 0
          });
        }
      }

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
        discount_type: discountType,
        discount_value: numDiscVal,
        items: saleItems
      };

      const res = await api.createSale(salePayload);
      
      // Open Thermal Receipt Modal - Paid items first, Free samples at the bottom on green
      const receiptItems = [];
      for (const it of cart) {
        if (Number(it.qty) > 0) {
          receiptItems.push({
            ...it,
            name: it.name,
            qty: Number(it.qty),
            sellingPrice: it.sellingPrice,
            lineTotal: it.lineTotal,
            isFreeSample: false
          });
        }
      }
      for (const it of cart) {
        if (Number(it.freeQty) > 0) {
          receiptItems.push({
            ...it,
            name: it.name,
            qty: Number(it.freeQty),
            sellingPrice: 0,
            lineTotal: 0,
            isFreeSample: true
          });
        }
      }

      setReceiptData({
        invoiceNo: res.data.invoiceNo,
        date: new Date().toLocaleString(),
        customer: customerName,
        items: receiptItems,
        subtotal,
        discountTotal: totalDiscount,
        totalDiscount,
        taxTotal,
        grandTotal,
        paymentMode,
        receivedAmount: paymentMode === 'CASH' && receivedAmount ? Number(receivedAmount) : grandTotal,
        change: paymentMode === 'CASH' && receivedAmount ? Math.max(0, Number(receivedAmount) - grandTotal) : 0
      });

      // Launch 7-second Feedback Prompt for customer
      const foundCust = customers.find((c) => String(c.id) === String(selectedCustomerId));
      startFeedbackPrompt(res.data.invoiceNo, customerName, foundCust?.phone || '');

      setCart([]);
      setReceivedAmount('');
      setDiscountType('NONE');
      setDiscountValue('');
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
                        className={`text-[10px] font-bold mt-0.5 ${
                          Number(item.current_stock) > 0
                            ? selectedIndex === idx
                              ? 'text-emerald-200'
                              : 'text-emerald-600'
                            : selectedIndex === idx
                            ? 'text-white bg-rose-700 px-1 py-0.5 rounded'
                            : 'text-rose-700 bg-rose-50 px-1 py-0.5 rounded border border-rose-200'
                        }`}
                      >
                        {Number(item.current_stock) > 0
                          ? `Stock: ${item.current_stock} ${item.unit_code || 'PCS'}`
                          : `OUT OF STOCK (0 ${item.unit_code || 'PCS'})`}
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
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0 bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100 font-semibold"
          >
            <Layers className="w-3.5 h-3.5 text-blue-700" />
            <span>{t('searchCatalogBtn') || 'Find Item (F2)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsQuickDamageModalOpen(true);
              setSelectedQuickDamageProduct(null);
              setDamageQty(1);
              setDamageReason('Broken / Leaking detected at counter');
            }}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0 bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100 font-bold"
            title="Mark damaged product at POS counter (F7)"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            <span>Mark Damaged (F7)</span>
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

      {/* 7-Second Non-Blocking Post-Billing Customer Feedback Prompt */}
      {feedbackPrompt && (
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 text-white px-4 py-2.5 shadow-lg border-b border-rose-500/50 flex items-center justify-between z-30 transition-all print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-rose-600 rounded-full flex items-center justify-center shrink-0 border border-rose-300">
              <MessageSquareHeart className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wide text-rose-200">
                  Customer Feedback:
                </span>
                <span className="font-mono text-xs font-bold text-white">
                  {feedbackPrompt.invoiceNo} ({feedbackPrompt.customerName})
                </span>
                <span className="bg-rose-900/80 text-rose-200 text-[10px] font-mono px-2 py-0.5 rounded border border-rose-700 flex items-center gap-1 font-bold">
                  <Clock className="w-3 h-3 text-rose-300 animate-spin" />
                  Auto-closing in {feedbackCountdown}s
                </span>
              </div>
              {/* 1-5 Star Clickable Rating */}
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFeedbackRating(s)}
                    className="p-0.5 hover:scale-125 transition-transform"
                    title={`${s} Stars`}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        s <= feedbackRating ? 'fill-amber-400 text-amber-400' : 'text-gray-500'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-[11px] font-mono font-bold text-amber-300 ml-1.5">
                  {feedbackRating} / 5 Stars
                </span>
              </div>
            </div>
          </div>

          {/* Comment Input and Action Buttons */}
          <div className="flex items-center gap-2 flex-1 max-w-md ml-4">
            <input
              type="text"
              placeholder="Customer comments / notes (optional)..."
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmitFeedback();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleDismissFeedback();
                }
              }}
              className="form-input text-xs py-1 px-2.5 bg-white/10 border-rose-400/40 text-white placeholder-rose-200/60 w-full focus:bg-white focus:text-gray-900 focus:border-rose-500"
            />
            <button
              type="button"
              onClick={handleSubmitFeedback}
              className="btn-primary text-xs py-1 px-3 bg-amber-500 hover:bg-amber-400 text-blue-950 font-bold border-amber-600 shrink-0"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={handleDismissFeedback}
              className="text-rose-200 hover:text-white text-xs px-2 py-1 font-semibold shrink-0"
              title="Skip feedback without saving"
            >
              Skip (Esc)
            </button>
          </div>
        </div>
      )}

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
                  <th className="text-center w-20">Billed Qty</th>
                  <th className="text-center w-28 bg-emerald-50 text-emerald-900 border-x border-emerald-300 font-bold">
                    Free Sample (இலவசம்)
                  </th>
                  <th className="text-right">{t('gst')}</th>
                  <th className="text-right">{t('total')}</th>
                  <th className="text-center w-20">Damaged?</th>
                  <th className="w-10 text-center">{t('remove')}</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-16 text-gray-400">
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
                  cart.map((item, idx) => {
                    const paidQty = Number(item.qty) || 0;
                    const freeQty = Number(item.freeQty) || 0;
                    const maxFreeAllowed = Math.max(0, Number(item.currentStock) - paidQty);
                    const maxPaidAllowed = Math.max(0, Number(item.currentStock) - freeQty);

                    return (
                      <tr key={item.id} className={freeQty > 0 ? 'bg-emerald-50/40' : ''}>
                        <td className="text-center font-mono text-gray-500">{idx + 1}</td>
                        <td>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-gray-900">{item.name}</span>
                            {freeQty > 0 && (
                              <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded font-mono shadow-xs">
                                +{freeQty} FREE SAMPLE
                              </span>
                            )}
                          </div>
                          {item.tamilName && <div className="text-gray-600 text-[11px]">{item.tamilName}</div>}
                        </td>
                        <td className="font-mono text-indigo-700">{item.barcode || item.sku}</td>
                        <td className="num-cell">
                          <span>₹{item.sellingPrice.toFixed(2)}</span>
                        </td>

                        {/* Billed Paid Quantity Column */}
                        <td className="text-center">
                          <input
                            type="number"
                            min="0"
                            max={maxPaidAllowed}
                            value={paidQty}
                            onChange={(e) => updateQuantity(item.id, e.target.value)}
                            className="form-input w-16 text-center font-bold font-mono py-0.5 text-xs"
                          />
                          <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                            max {maxPaidAllowed}
                          </div>
                        </td>

                        {/* Free Sample Separate Column: from 0 up to remaining available stock (currentStock - billedQty) */}
                        <td className="text-center bg-emerald-50/50 border-x border-emerald-300">
                          <div className="flex flex-col items-center">
                            <input
                              type="number"
                              min="0"
                              max={maxFreeAllowed}
                              value={freeQty}
                              onChange={(e) => updateFreeQuantity(item.id, e.target.value)}
                              className={`form-input w-16 text-center font-bold font-mono py-0.5 text-xs ${
                                freeQty > 0
                                  ? 'bg-emerald-100 text-emerald-950 border-emerald-500 focus:ring-emerald-500 font-extrabold'
                                  : 'text-gray-700'
                              }`}
                            />
                            <span className="text-[9px] text-emerald-800 font-mono mt-0.5 font-bold">
                              max left: {maxFreeAllowed}
                            </span>
                          </div>
                        </td>

                        {/* GST */}
                        <td className="num-cell text-gray-700">
                          {paidQty <= 0 ? (
                            <span className="text-gray-400 font-mono">0% (₹0)</span>
                          ) : (
                            <>
                              <div className="font-semibold">{item.gstRate}%</div>
                              {item.gstRate > 0 && (
                                <div className="text-[10px] text-gray-500 font-mono">
                                  +₹{((item.sellingPrice * paidQty * item.gstRate) / 100).toFixed(2)}
                                </div>
                              )}
                            </>
                          )}
                        </td>

                        {/* Total */}
                        <td className="num-cell font-bold text-blue-900">
                          <span>₹{(paidQty <= 0 ? 0 : item.lineTotal).toFixed(2)}</span>
                        </td>

                        {/* Report Damaged Button */}
                        <td className="text-center">
                          <button
                            type="button"
                            onClick={() => handleReportCartItemDamaged(item)}
                            className="text-[10px] font-bold px-1.5 py-1 rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center justify-center gap-1 mx-auto transition"
                            title="Found a damaged/defective unit of this product at billing? Quarantine it immediately"
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            <span>Damage</span>
                          </button>
                        </td>

                        {/* Remove Button */}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          <div className="bg-gray-50 p-2.5 border-t border-gray-300 flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-600">
              {t('itemsCount')}: <b className="text-gray-900">{cart.length}</b> | {t('totalUnits')}:{' '}
              <b className="text-gray-900">
                {cart.reduce((a, b) => a + (Number(b.qty) || 0) + (Number(b.freeQty) || 0), 0)} PCS
              </b>
              {cart.some((it) => (Number(it.freeQty) || 0) > 0) && (
                <span className="ml-2 text-emerald-700 font-bold font-mono">
                  (Paid: {cart.reduce((a, b) => a + (Number(b.qty) || 0), 0)}, Free Samples:{' '}
                  {cart.reduce((a, b) => a + (Number(b.freeQty) || 0), 0)})
                </span>
              )}
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

          {/* Discounts & Promotional Offers Card */}
          <div className="bg-amber-50/90 border border-amber-300 rounded p-2.5 text-xs shadow-2xs">
            <div className="flex items-center justify-between font-bold text-amber-950 mb-1.5">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>Bill Discount (தள்ளுபடி):</span>
              </span>
              {billDiscount > 0 && (
                <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">
                  -₹{billDiscount.toFixed(2)} Off
                </span>
              )}
            </div>

            {/* Discount Type Selector Buttons */}
            <div className="grid grid-cols-3 gap-1 mb-2">
              <button
                type="button"
                onClick={() => { setDiscountType('NONE'); setDiscountValue(''); }}
                className={`py-1 text-[10px] font-bold rounded border text-center transition ${
                  discountType === 'NONE'
                    ? 'bg-amber-700 text-white border-amber-800'
                    : 'bg-white text-gray-700 hover:bg-amber-100 border-amber-300'
                }`}
              >
                None (0)
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('FIXED')}
                className={`py-1 text-[10px] font-bold rounded border text-center transition ${
                  discountType === 'FIXED'
                    ? 'bg-amber-700 text-white border-amber-800'
                    : 'bg-white text-gray-700 hover:bg-amber-100 border-amber-300'
                }`}
              >
                Flat ₹ Off
              </button>
              <button
                type="button"
                onClick={() => setDiscountType('PERCENT')}
                className={`py-1 text-[10px] font-bold rounded border text-center transition ${
                  discountType === 'PERCENT'
                    ? 'bg-amber-700 text-white border-amber-800'
                    : 'bg-white text-gray-700 hover:bg-amber-100 border-amber-300'
                }`}
              >
                % Percent Off
              </button>
            </div>

            {/* Discount Value Input & Quick Presets */}
            {discountType !== 'NONE' && (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-bold font-mono text-xs">
                    {discountType === 'FIXED' ? '₹' : '%'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'PERCENT' ? 100 : subtotal}
                    placeholder={discountType === 'FIXED' ? 'Enter discount amount...' : 'Enter % discount...'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="form-input w-full text-right font-mono font-bold text-xs py-1 border-amber-400 bg-white"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1 text-[10px]">
                  <span className="text-gray-500 text-[10px]">Quick:</span>
                  {discountType === 'FIXED' ? (
                    <>
                      {[10, 20, 50, 100].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setDiscountValue(String(amt))}
                          className="bg-white hover:bg-amber-200 border border-amber-300 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold"
                        >
                          ₹{amt}
                        </button>
                      ))}
                    </>
                  ) : (
                    <>
                      {[2, 5, 10, 15, 20].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDiscountValue(String(pct))}
                          className="bg-white hover:bg-amber-200 border border-amber-300 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold"
                        >
                          {pct}%
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-blue-950 text-white p-3 rounded text-center">
            <div className="text-xs uppercase tracking-wider text-blue-200 font-bold">{t('grandTotal')}</div>
            <div className="text-3xl font-black font-mono mt-1 text-yellow-300">
              ₹{grandTotal.toFixed(2)}
            </div>
            <div className="text-[11px] text-blue-200 mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 font-mono">
              <span>Subtotal: ₹{subtotal.toFixed(2)}</span>
              {billDiscount > 0 && (
                <span className="text-amber-300 font-bold">- Discount: ₹{billDiscount.toFixed(2)}</span>
              )}
              <span>+ GST: ₹{totalTax.toFixed(2)}</span>
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
            <div className="bg-gray-50 p-2.5 border border-gray-200 rounded space-y-2 text-xs">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="font-bold text-gray-700">{t('receivedAmount')} *</label>
                  <span className="text-[10px] text-gray-500 font-medium">Bill: ₹{grandTotal.toFixed(2)}</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder={`Min ₹${grandTotal.toFixed(2)}`}
                  value={receivedAmount}
                  onChange={(e) => {
                    setReceivedAmount(e.target.value);
                    if (errorMsg && errorMsg.includes('Insufficient')) {
                      setErrorMsg('');
                    }
                  }}
                  className={`form-input w-full font-mono font-bold text-right text-sm ${
                    receivedAmount !== '' && Number(receivedAmount) < grandTotal
                      ? 'border-red-500 bg-red-50 text-red-900 focus:ring-red-400'
                      : receivedAmount !== '' && Number(receivedAmount) >= grandTotal
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-950 focus:ring-emerald-400'
                      : ''
                  }`}
                />
              </div>

              {/* Insufficient Cash Warning */}
              {receivedAmount !== '' && Number(receivedAmount) < grandTotal && (
                <div className="p-2 bg-red-100 border border-red-300 rounded text-red-800 font-bold text-[11px] flex items-center justify-between">
                  <span>⚠️ Insufficient Money! Short:</span>
                  <span className="font-mono text-sm text-red-900">
                    -₹{(grandTotal - Number(receivedAmount)).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Sufficient Cash: Change to return */}
              {receivedAmount !== '' && Number(receivedAmount) >= grandTotal && (
                <div className="p-2 bg-emerald-100 border border-emerald-300 rounded text-emerald-950 font-bold text-[11px] flex items-center justify-between">
                  <span>{t('balanceToGive')} (Change):</span>
                  <span className="font-mono text-base text-emerald-900 font-black">
                    ₹{(Number(receivedAmount) - grandTotal).toFixed(2)}
                  </span>
                </div>
              )}

              {/* Quick Exact / Rounded Cash Presets */}
              <div className="flex gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setReceivedAmount(grandTotal.toFixed(2))}
                  className="flex-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-[10px] py-1 px-1 rounded font-bold"
                >
                  Exact (₹{grandTotal.toFixed(2)})
                </button>
                {Math.ceil(grandTotal / 50) * 50 > grandTotal && (
                  <button
                    type="button"
                    onClick={() => setReceivedAmount(String(Math.ceil(grandTotal / 50) * 50))}
                    className="flex-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-[10px] py-1 px-1 rounded font-bold"
                  >
                    ₹{Math.ceil(grandTotal / 50) * 50}
                  </button>
                )}
                {Math.ceil(grandTotal / 100) * 100 > grandTotal && (
                  <button
                    type="button"
                    onClick={() => setReceivedAmount(String(Math.ceil(grandTotal / 100) * 100))}
                    className="flex-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-[10px] py-1 px-1 rounded font-bold"
                  >
                    ₹{Math.ceil(grandTotal / 100) * 100}
                  </button>
                )}
                {Math.ceil(grandTotal / 500) * 500 > grandTotal && (
                  <button
                    type="button"
                    onClick={() => setReceivedAmount(String(Math.ceil(grandTotal / 500) * 500))}
                    className="flex-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-[10px] py-1 px-1 rounded font-bold"
                  >
                    ₹{Math.ceil(grandTotal / 500) * 500}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Checkout & Commit Button */}
          <button
            disabled={
              cart.length === 0 ||
              isSubmitting ||
              (paymentMode === 'CASH' && (!receivedAmount || Number(receivedAmount) < grandTotal))
            }
            onClick={handleCheckout}
            className="w-full btn-success text-sm py-3 justify-center text-center font-bold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <td className={`text-center font-bold ${Number(item.current_stock) <= 0 ? 'text-red-700 bg-red-50' : ''}`}>
                        {item.current_stock} {item.unit_code || 'PCS'}
                        {Number(item.current_stock) <= 0 && (
                          <span className="block text-[9px] font-black text-red-600 uppercase tracking-tighter">
                            Out of Stock
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        {Number(item.current_stock) <= 0 ? (
                          <button
                            type="button"
                            disabled
                            className="bg-gray-100 text-gray-400 border border-gray-300 text-[10px] font-bold py-1 px-2 rounded cursor-not-allowed opacity-60"
                            title="Cannot add out-of-stock product"
                          >
                            Out of Stock
                          </button>
                        ) : (
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
                        )}
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
                    <tr
                      key={idx}
                      className={
                        it.isFreeSample
                          ? 'bg-emerald-50 text-emerald-950 font-medium border-y border-emerald-300'
                          : ''
                      }
                    >
                      <td className="py-1">
                        <div className="font-bold flex items-center gap-1.5 flex-wrap">
                          <span className={it.isFreeSample ? 'text-emerald-950 font-bold' : 'truncate max-w-[130px]'}>
                            {it.name}
                          </span>
                          {it.isFreeSample && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-600 text-white shadow-xs tracking-wider uppercase">
                              ★ FREE SAMPLE / இலவசம்
                            </span>
                          )}
                        </div>
                        {it.tamilName && (
                          <div className={`text-[9px] ${it.isFreeSample ? 'text-emerald-700 font-medium' : 'text-gray-600'}`}>
                            {it.tamilName}
                          </div>
                        )}
                      </td>
                      <td className="text-center font-bold">
                        <span className={it.isFreeSample ? 'text-emerald-800' : ''}>{it.qty}</span>
                      </td>
                      <td className="text-right font-semibold">
                        {it.isFreeSample ? (
                          <span className="text-emerald-800 font-extrabold bg-emerald-100 px-1 py-0.5 rounded text-[9px]">
                            FREE
                          </span>
                        ) : (
                          `₹${it.sellingPrice.toFixed(2)}`
                        )}
                      </td>
                      <td className="text-right font-bold">
                        {it.isFreeSample ? (
                          <span className="text-emerald-800 font-extrabold bg-emerald-100 px-1 py-0.5 rounded text-[9px]">
                            ₹0.00
                          </span>
                        ) : (
                          `₹${it.lineTotal.toFixed(2)}`
                        )}
                      </td>
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
                {receiptData.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 text-[10px] font-semibold">
                    <span>Discount:</span>
                    <span>-₹{receiptData.totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 text-[10px]">
                  <span>GST Tax:</span>
                  <span>+₹{receiptData.taxTotal.toFixed(2)}</span>
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

      {/* Modal 1: Report Damaged Product on Cart Item */}
      {damagedModalItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-400 overflow-hidden max-w-md w-full animate-fade-in flex flex-col">
            <div className="bg-amber-800 text-white p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-200" />
                <span className="font-bold text-xs uppercase tracking-wider">
                  Report Damaged Product (POS Quarantine / சேதமடைந்த சரக்கு)
                </span>
              </div>
              <button
                onClick={() => setDamagedModalItem(null)}
                className="text-amber-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmQuarantine} className="p-4 space-y-3 text-xs">
              <div className="bg-amber-50 p-2.5 rounded border border-amber-200">
                <div className="font-bold text-gray-900 text-sm">{damagedModalItem.name}</div>
                {damagedModalItem.tamilName && (
                  <div className="text-gray-600 text-xs">{damagedModalItem.tamilName}</div>
                )}
                <div className="flex items-center justify-between text-[11px] mt-1 text-gray-600">
                  <span>Barcode: {damagedModalItem.barcode || damagedModalItem.sku}</span>
                  <span className="font-bold text-emerald-800 font-mono">
                    Store Stock: {damagedModalItem.currentStock} {damagedModalItem.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Damaged Quantity to Quarantine (சேதமடைந்த எண்ணிக்கை)
                </label>
                <input
                  type="number"
                  min="1"
                  max={damagedModalItem.currentStock}
                  value={damageQty}
                  onChange={(e) => setDamageQty(Math.max(1, Number(e.target.value) || 1))}
                  className="form-input w-full font-bold font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Damage Reason (சேதத்திற்கான காரணம்)
                </label>
                <input
                  type="text"
                  value={damageReason}
                  onChange={(e) => setDamageReason(e.target.value)}
                  className="form-input w-full mb-1.5"
                  required
                />
                <div className="flex flex-wrap gap-1">
                  {['Broken / Leaking', 'Dented / Crushed', 'Packaging Torn', 'Seal Tampered', 'Expired / Spoiled'].map(
                    (preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDamageReason(preset)}
                        className={`text-[10px] px-2 py-0.5 rounded border transition ${
                          damageReason === preset
                            ? 'bg-amber-700 text-white border-amber-800 font-bold'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                        }`}
                      >
                        {preset}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deductFromBill}
                    onChange={(e) => setDeductFromBill(e.target.checked)}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="font-semibold text-gray-800 text-xs">
                    Remove / deduct damaged unit from current customer's bill
                  </span>
                </label>
              </div>

              <div className="bg-gray-50 -mx-4 -mb-4 p-3 border-t border-gray-200 flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setDamagedModalItem(null)}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isQuarantining}
                  className="btn-primary text-xs py-1.5 px-4 font-bold bg-amber-700 hover:bg-amber-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{isQuarantining ? 'Quarantining...' : 'Quarantine Damaged Stock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Quick Mark Damaged (F7) Search & Quarantine */}
      {isQuickDamageModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl border border-gray-400 overflow-hidden max-w-lg w-full animate-fade-in flex flex-col max-h-[85vh]">
            <div className="bg-amber-900 text-white p-3 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-200" />
                <span className="font-bold text-xs uppercase tracking-wider">
                  Quick Mark Damaged Product (POS Counter F7)
                </span>
              </div>
              <button
                onClick={() => setIsQuickDamageModalOpen(false)}
                className="text-amber-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs flex-1 flex flex-col overflow-hidden">
              {!selectedQuickDamageProduct ? (
                <>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Scan Barcode or Search Product to Quarantine:
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Scan barcode or type product name..."
                        value={quickDamageSearch}
                        onChange={(e) => setQuickDamageSearch(e.target.value)}
                        className="form-input pl-9 w-full font-medium"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto border border-gray-200 rounded divide-y divide-gray-100 max-h-60">
                    {isSearchingQuickDamage ? (
                      <div className="p-4 text-center text-gray-400">Searching products...</div>
                    ) : quickDamageSuggestions.length === 0 ? (
                      <div className="p-4 text-center text-gray-400">
                        {quickDamageSearch ? 'No matching products found.' : 'Scan or type to find product.'}
                      </div>
                    ) : (
                      quickDamageSuggestions.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setSelectedQuickDamageProduct(p);
                            setDamageQty(1);
                            setDamageReason('Broken / Leaking detected at counter');
                          }}
                          className="p-2.5 hover:bg-amber-50 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-gray-900">{p.name}</div>
                            <div className="text-[10px] text-gray-500 font-mono">
                              SKU: {p.sku} | Barcode: {p.barcodes || '-'}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-amber-800">
                              Stock: {p.current_stock}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <form onSubmit={handleConfirmQuarantine} className="space-y-3">
                  <div className="bg-amber-50 p-2.5 rounded border border-amber-200 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">
                        {selectedQuickDamageProduct.name}
                      </div>
                      <div className="text-[11px] text-gray-600 font-mono">
                        SKU: {selectedQuickDamageProduct.sku}
                      </div>
                      <div className="text-[11px] text-emerald-800 font-bold font-mono mt-0.5">
                        Current Store Stock: {selectedQuickDamageProduct.current_stock}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedQuickDamageProduct(null)}
                      className="text-xs text-blue-700 underline font-semibold"
                    >
                      Change Product
                    </button>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Damaged Quantity to Quarantine:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedQuickDamageProduct.current_stock}
                      value={damageQty}
                      onChange={(e) => setDamageQty(Math.max(1, Number(e.target.value) || 1))}
                      className="form-input w-full font-bold font-mono text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Damage Reason / Note:
                    </label>
                    <input
                      type="text"
                      value={damageReason}
                      onChange={(e) => setDamageReason(e.target.value)}
                      className="form-input w-full mb-1.5"
                      required
                    />
                    <div className="flex flex-wrap gap-1">
                      {['Broken / Leaking', 'Dented / Crushed', 'Packaging Torn', 'Seal Tampered', 'Expired / Spoiled'].map(
                        (preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setDamageReason(preset)}
                            className={`text-[10px] px-2 py-0.5 rounded border transition ${
                              damageReason === preset
                                ? 'bg-amber-700 text-white border-amber-800 font-bold'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                            }`}
                          >
                            {preset}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setIsQuickDamageModalOpen(false)}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isQuarantining}
                      className="btn-primary text-xs py-1.5 px-4 font-bold bg-amber-700 hover:bg-amber-800 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{isQuarantining ? 'Quarantining...' : 'Quarantine Damaged Stock'}</span>
                    </button>
                  </div>
                </form>
              )}
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
