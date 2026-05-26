import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@hooks/useRedux';
import { useDebounce } from '@hooks/useDebounce';
import { productService } from '@api/services/product.service';
import { customerService } from '@api/services/customer.service';
import { saleService } from '@api/services/sale.service';
import { priceTierService, PriceTier, ProductTierPrice } from '@api/services/priceTier.service';
import { categoryService, Category } from '@api/services/category.service';
import { addNotification } from '@store/slices/uiSlice';
import { fetchCurrentSession } from '@store/slices/sessionSlice';
import {
  Search, LayoutGrid, ShoppingCart, Plus, Minus, Trash2, Package,
  Tag, Lock, Flag, Wallet, X, Banknote, CreditCard, Smartphone,
  Building2, BookOpenCheck, ChevronUp, User,
} from 'lucide-react';
import InvoicePreview from '../../components/pos/InvoicePreview';
import GenerateInvoiceModal from '../../components/invoices/GenerateInvoiceModal';
import OpeningBalanceModal from '../../components/pos/OpeningBalanceModal';
import CloseRegisterModal from '../../components/pos/CloseRegisterModal';
import Modal from '../../components/common/Modal/Modal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CartItem {
  id: number;
  product_id: number;
  name: string;
  sku: string;
  unit_price: number;
  selling_price: number;
  quantity: number;
  gst_rate: number;
  hsn_code: string;
  tax_included: boolean;
  stock_quantity?: number;
  original_selling_price: number;
}

interface CartState {
  items: CartItem[];
  customer_id: number | null;
  billing_state: number | null;
  discount_percentage: number;
  discount_amount: number;
  discount_type: 'percentage' | 'amount';
}

interface CustomerSession {
  id: string;
  label: string;
  cart: CartState;
  currentCustomerObj: any | null;
  guestName: string;
  guestPhone: string;
}

const MAX_SESSIONS = 5;

const createEmptySession = (index: number): CustomerSession => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  label: `Customer ${index}`,
  cart: {
    items: [],
    customer_id: null,
    billing_state: null,
    discount_percentage: 0,
    discount_amount: 0,
    discount_type: 'amount',
  },
  currentCustomerObj: null,
  guestName: '',
  guestPhone: '',
});

// ─── Component ────────────────────────────────────────────────────────────────

const MobilePOS: React.FC = () => {
  const dispatch = useAppDispatch();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'browse' | 'scan'>('browse');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [badgePop, setBadgePop] = useState(false);

  // ── Session state ─────────────────────────────────────────────────────────
  const { needsSessionSetup, currentSession } = useAppSelector(
    (state) => state.session,
  );
  const initialSession = createEmptySession(1);
  const [sessions, setSessions] = useState<CustomerSession[]>([initialSession]);
  const [activeSessionId, setActiveSessionId] = useState<string>(initialSession.id);
  const [confirmClose, setConfirmClose] = useState<{
    sessionId: string;
    label: string;
    itemCount: number;
  } | null>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
  const cart = activeSession.cart;
  const currentCustomerObj = activeSession.currentCustomerObj;
  const guestName = activeSession.guestName;
  const guestPhone = activeSession.guestPhone;

  // ── Browse products ───────────────────────────────────────────────────────
  const [browseProducts, setBrowseProducts] = useState<any[]>([]);
  const [posPage, setPosPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [posLoading, setPosLoading] = useState(false);
  const posLoadingRef = useRef(false);
  const hasInitiallyFetched = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstSearch = useRef(true);

  // ── Categories ────────────────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // ── Scan products ─────────────────────────────────────────────────────────
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [scanProducts, setScanProducts] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Pricing ───────────────────────────────────────────────────────────────
  const [priceTiers, setPriceTiers] = useState<PriceTier[]>([]);
  const [productRules, setProductRules] = useState<ProductTierPrice[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<number | null>(null);

  // ── Sale state ────────────────────────────────────────────────────────────
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showGenerateInvoiceModal, setShowGenerateInvoiceModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ─── Session helpers ─────────────────────────────────────────────────────

  const updateActiveSession = useCallback(
    (updater: (s: CustomerSession) => CustomerSession) => {
      setSessions((prev) => prev.map((s) => (s.id === activeSessionId ? updater(s) : s)));
    },
    [activeSessionId],
  );

  const addSession = () => {
    if (sessions.length >= MAX_SESSIONS) {
      dispatch(addNotification({ message: `Maximum ${MAX_SESSIONS} sessions allowed`, type: 'error' }));
      return;
    }
    const newSession = createEmptySession(sessions.length + 1);
    setSessions((prev) => [...prev, newSession]);
    setActiveSessionId(newSession.id);
  };

  const doCloseSession = (sessionId: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);
      if (remaining.length === 0) {
        const fresh = createEmptySession(1);
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === sessionId) {
        const idx = prev.findIndex((s) => s.id === sessionId);
        setActiveSessionId(remaining[Math.max(0, idx - 1)].id);
      }
      return remaining;
    });
    setConfirmClose(null);
  };

  const closeSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    if (session.cart.items.length > 0) {
      setConfirmClose({ sessionId, label: session.label, itemCount: session.cart.items.length });
      return;
    }
    doCloseSession(sessionId);
  };

  // ─── Customer auto-lookup ────────────────────────────────────────────────

  useEffect(() => {
    const sessionId = activeSessionId;
    const searchCustomer = async () => {
      if (guestPhone && guestPhone.length === 10) {
        setIsLoading(true);
        try {
          const response = await customerService.search(guestPhone);
          const results = response.results || response;
          const exactMatch = results.find((c: any) => c.phone === guestPhone);
          if (exactMatch) {
            setSessions((prev) =>
              prev.map((s) =>
                s.id === sessionId
                  ? {
                      ...s,
                      label: exactMatch.name,
                      cart: { ...s.cart, customer_id: exactMatch.id },
                      currentCustomerObj: exactMatch,
                      guestPhone: '',
                      guestName: '',
                    }
                  : s,
              ),
            );
          }
        } catch (error) {
          console.error('Error searching customer by phone:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    searchCustomer();
  }, [guestPhone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Session fetch ────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(fetchCurrentSession());
  }, [dispatch]);

  // ─── Initial data fetch ───────────────────────────────────────────────────

  const fetchBrowseProducts = useCallback(
    async (page: number, search: string, reset: boolean, category?: number | null) => {
      if (posLoadingRef.current) return;
      posLoadingRef.current = true;
      setPosLoading(true);
      try {
        const data = await productService.getAll({
          page,
          page_size: 20,
          ...(search ? { search } : {}),
          ...(category ? { category } : {}),
        });
        const results: any[] = data.results || data;
        const inStock = results.filter((p: any) => p.stock_quantity > 0);
        setBrowseProducts((prev) => (reset ? inStock : [...prev, ...inStock]));
        setHasMore(data.next !== null && data.next !== undefined);
        setPosPage(page);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        posLoadingRef.current = false;
        setPosLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (hasInitiallyFetched.current) return;
    hasInitiallyFetched.current = true;

    const fetchInitialData = async () => {
      try {
        const [tiersData, rulesData, categoriesData] = await Promise.all([
          priceTierService.getAllTiers(),
          priceTierService.getProductRules(),
          categoryService.getAll(),
        ]);
        setPriceTiers(tiersData.filter((t: PriceTier) => t.is_active));
        setProductRules(rulesData);
        setCategories(categoriesData.filter((c: Category) => c.is_active));
      } catch (error) {
        console.error('Error fetching initial data:', error);
        dispatch(addNotification({ message: 'Failed to load POS data', type: 'error' }));
      }
    };

    fetchInitialData();
    fetchBrowseProducts(1, '', true, null);
  }, [dispatch, fetchBrowseProducts]);

  // ─── Infinite scroll ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !posLoadingRef.current) {
          fetchBrowseProducts(posPage + 1, productSearch, false, selectedCategory?.id);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, posPage, productSearch, selectedCategory, fetchBrowseProducts, needsSessionSetup]);

  // ─── Browse search debounce ───────────────────────────────────────────────

  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false;
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setBrowseProducts([]);
      setHasMore(false);
      fetchBrowseProducts(1, productSearch, true, selectedCategory?.id);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [productSearch, selectedCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Scan mode search ─────────────────────────────────────────────────────

  useEffect(() => {
    const searchProducts = async () => {
      if (!debouncedSearchTerm.trim()) {
        setScanProducts([]);
        return;
      }
      setIsSearchLoading(true);
      try {
        const response = await productService.getAll({ search: debouncedSearchTerm });
        const data = response.results || response;
        setScanProducts(data.filter((p: any) => p.stock_quantity > 0));
      } catch (error) {
        console.error('Error searching products:', error);
      } finally {
        setIsSearchLoading(false);
      }
    };
    searchProducts();
  }, [debouncedSearchTerm]);

  // ─── Auto-focus scan input on mode switch ─────────────────────────────────

  useEffect(() => {
    if (mode === 'scan' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [mode]);

  // ─── Click outside dropdown ───────────────────────────────────────────────

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Price calculation ────────────────────────────────────────────────────

  const calculateEffectivePrice = (product: any) => {
    const baseSellingPrice = parseFloat(product.selling_price);
    if (!selectedTierId) return baseSellingPrice;

    const rule = productRules.find(
      (r) => r.product === product.id && r.tier === selectedTierId,
    );
    if (rule) {
      if (rule.type === 'fixed') return parseFloat(rule.value as any);
      const pct = parseFloat(rule.value as any);
      return baseSellingPrice + baseSellingPrice * (pct / 100);
    }

    const tier = priceTiers.find((t) => t.id === selectedTierId);
    if (tier && tier.default_percentage) {
      const pct = parseFloat(tier.default_percentage as any);
      return baseSellingPrice + baseSellingPrice * (pct / 100);
    }

    return baseSellingPrice;
  };

  // ─── Tier recalc when tier changes ───────────────────────────────────────

  useEffect(() => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.cart.items.length === 0) return s;
        return {
          ...s,
          cart: {
            ...s.cart,
            items: s.cart.items.map((item) => {
              const base = item.original_selling_price;
              let newSell = base;

              if (selectedTierId) {
                const rule = productRules.find(
                  (r) => r.product === item.product_id && r.tier === selectedTierId,
                );
                if (rule) {
                  newSell =
                    rule.type === 'fixed'
                      ? parseFloat(rule.value as any)
                      : base + base * (parseFloat(rule.value as any) / 100);
                } else {
                  const tier = priceTiers.find((t) => t.id === selectedTierId);
                  if (tier && tier.default_percentage) {
                    newSell = base + base * (parseFloat(tier.default_percentage as any) / 100);
                  }
                }
              }

              let newUnit = newSell;
              if (item.tax_included) {
                const gstRate = item.gst_rate || 0;
                if (gstRate > 0 && gstRate < 100) newUnit = newSell / (1 + gstRate / 100);
              }
              if (isNaN(newUnit) || !isFinite(newUnit)) newUnit = base;

              return { ...item, selling_price: newSell, unit_price: newUnit };
            }),
          },
        };
      }),
    );
  }, [selectedTierId, productRules, priceTiers]);

  // ─── Add to cart ──────────────────────────────────────────────────────────

  const handleAddToCart = (product: any) => {
    if (!product.stock_quantity || product.stock_quantity <= 0) {
      dispatch(addNotification({ message: 'Product is out of stock', type: 'error' }));
      return;
    }

    const effectivePrice = calculateEffectivePrice(product);
    const existingItem = cart.items.find((item) => item.product_id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        dispatch(
          addNotification({ message: `Only ${product.stock_quantity} available`, type: 'error' }),
        );
        return;
      }
      updateActiveSession((s) => ({
        ...s,
        cart: {
          ...s.cart,
          items: s.cart.items.map((item) =>
            item.product_id === product.id
              ? { ...item, quantity: item.quantity + 1, selling_price: effectivePrice }
              : item,
          ),
        },
      }));
    } else {
      let basePrice = effectivePrice;
      if (product.tax_included) {
        const gstRate = parseFloat(product.gst_rate) || 0;
        if (gstRate > 0 && gstRate < 100) basePrice = effectivePrice / (1 + gstRate / 100);
      }

      if (isNaN(basePrice) || !isFinite(basePrice) || basePrice < 0) {
        dispatch(
          addNotification({ message: `Invalid price for ${product.name}`, type: 'error' }),
        );
        return;
      }

      const newItem: CartItem = {
        id: Date.now(),
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        unit_price: parseFloat(basePrice.toFixed(2)),
        selling_price: parseFloat(effectivePrice.toFixed(2)),
        quantity: 1,
        gst_rate: parseFloat(product.gst_rate),
        hsn_code: product.hsn_code,
        tax_included: product.tax_included,
        stock_quantity: product.stock_quantity,
        original_selling_price: parseFloat(product.selling_price),
      };
      updateActiveSession((s) => ({
        ...s,
        cart: { ...s.cart, items: [...s.cart.items, newItem] },
      }));
    }

    // Cart badge pop animation
    setBadgePop(true);
    setTimeout(() => setBadgePop(false), 400);
  };

  const updateQuantity = (id: number, delta: number) => {
    updateActiveSession((s) => ({
      ...s,
      cart: {
        ...s.cart,
        items: s.cart.items.map((item) => {
          if (item.id !== id) return item;
          const newQty = item.quantity + delta;
          if (newQty < 1) return item;
          if (item.stock_quantity && newQty > item.stock_quantity) {
            dispatch(
              addNotification({ message: `Only ${item.stock_quantity} available`, type: 'error' }),
            );
            return item;
          }
          return { ...item, quantity: newQty };
        }),
      },
    }));
  };

  const removeItem = (id: number) => {
    updateActiveSession((s) => ({
      ...s,
      cart: { ...s.cart, items: s.cart.items.filter((i) => i.id !== id) },
    }));
  };

  // ─── Totals ───────────────────────────────────────────────────────────────

  const calculateTotals = () => {
    let subtotal = 0;
    const taxBreakdown: Record<
      number,
      { taxableAmount: number; cgst: number; sgst: number; taxAmount: number }
    > = {};
    let totalGst = 0;
    let exemptedAmount = 0;

    cart.items.forEach((item) => {
      const q = item.quantity;
      const gstRate = item.gst_rate;
      const rateConfig = gstRate / 100;
      let itemBaseTotal = 0;
      let itemGstAmount = 0;

      if (item.tax_included) {
        const totalWithTax = item.selling_price * q;
        itemBaseTotal = totalWithTax / (1 + rateConfig);
        itemGstAmount = totalWithTax - itemBaseTotal;
      } else {
        itemBaseTotal = item.unit_price * q;
        itemGstAmount = itemBaseTotal * rateConfig;
      }

      subtotal += itemBaseTotal;

      if (gstRate === 0) {
        exemptedAmount += itemBaseTotal;
      } else {
        if (!taxBreakdown[gstRate]) {
          taxBreakdown[gstRate] = { taxableAmount: 0, cgst: 0, sgst: 0, taxAmount: 0 };
        }
        taxBreakdown[gstRate].taxableAmount += itemBaseTotal;
        taxBreakdown[gstRate].taxAmount += itemGstAmount;
        taxBreakdown[gstRate].cgst += itemGstAmount / 2;
        taxBreakdown[gstRate].sgst += itemGstAmount / 2;
        totalGst += itemGstAmount;
      }
    });

    const discount =
      cart.discount_type === 'percentage'
        ? (subtotal * cart.discount_percentage) / 100
        : cart.discount_amount;
    const grossTotal = subtotal + totalGst - discount;
    const grandTotal = Math.round(grossTotal);
    const roundOff = grandTotal - grossTotal;

    return { subtotal, taxBreakdown, totalGst, exemptedAmount, discount, grossTotal, roundOff, grandTotal };
  };

  const totals = calculateTotals();
  const totalItems = cart.items.reduce((acc, i) => acc + i.quantity, 0);

  // ─── Credit / wallet eligibility ─────────────────────────────────────────

  const isEligibleForCredit = currentCustomerObj && !currentCustomerObj.is_guest;
  const creditLimit = currentCustomerObj?.credit_limit
    ? parseFloat(currentCustomerObj.credit_limit)
    : 0;
  const outstandingBalance = currentCustomerObj?.outstanding_balance
    ? parseFloat(currentCustomerObj.outstanding_balance)
    : 0;
  const walletBalance = currentCustomerObj?.wallet_balance
    ? parseFloat(currentCustomerObj.wallet_balance)
    : 0;
  const availableCredit = creditLimit > 0 ? creditLimit - outstandingBalance : Infinity;
  const canAffordCredit = availableCredit >= totals.grandTotal;
  const hasWalletBalance = walletBalance > 0;

  // ─── Scan Enter key ───────────────────────────────────────────────────────

  const handleScanKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || !searchTerm.trim()) return;
    try {
      const response = await productService.getAll({ search: searchTerm });
      const results = response.results || response;
      const valid = results.filter((p: any) => p.stock_quantity > 0);
      setScanProducts(valid);
      const exact = valid.find(
        (p: any) =>
          p.sku.toLowerCase() === searchTerm.toLowerCase() ||
          (p.barcode && p.barcode.toLowerCase() === searchTerm.toLowerCase()),
      );
      if (exact) {
        handleAddToCart(exact);
        setSearchTerm('');
        setScanProducts([]);
        setShowSearchResults(false);
      } else {
        setShowSearchResults(true);
      }
    } catch (err) {
      console.error('Scan error', err);
    }
  };

  // ─── Payment ──────────────────────────────────────────────────────────────

  const processPayment = async (method: string) => {
    if (cart.items.length === 0) return;

    if (guestPhone && guestPhone.length !== 10) {
      dispatch(addNotification({ message: 'Phone number must be exactly 10 digits', type: 'error' }));
      return;
    }

    const sessionId = activeSessionId;
    const snap = sessions.find((s) => s.id === sessionId) ?? activeSession;
    const snapCart = snap.cart;
    const snapGuestPhone = snap.guestPhone;
    const snapGuestName = snap.guestName;
    const snapCustomerObj = snap.currentCustomerObj;

    setIsProcessing(true);

    try {
      let customerId = snapCart.customer_id;

      if (!customerId && (snapGuestName || snapGuestPhone)) {
        if (snapCustomerObj && snapCustomerObj.phone === snapGuestPhone) {
          customerId = snapCustomerObj.id;
        } else {
          const payload: any = { name: snapGuestName || 'Walk-in Customer' };
          if (snapGuestPhone) payload.phone = snapGuestPhone;
          const guest = await customerService.create(payload);
          customerId = guest.id;
          setSessions((prev) =>
            prev.map((s) => (s.id === sessionId ? { ...s, currentCustomerObj: guest } : s)),
          );
        }
      }

      const saleData = {
        order_number: `MP-${Date.now()}`,
        customer: customerId,
        payment_method: method,
        payment_status: 'paid',
        billing_state: snapCart.billing_state,
        place_of_supply: snapCart.billing_state,
        discount_percentage:
          snapCart.discount_type === 'percentage' ? snapCart.discount_percentage : 0,
        discount_amount:
          snapCart.discount_type === 'amount' ? snapCart.discount_amount : 0,
        items: snapCart.items.map((item) => {
          const validUnitPrice = parseFloat(item.unit_price.toFixed(2));
          if (isNaN(validUnitPrice) || validUnitPrice > 9999999999.99) {
            throw new Error(`Invalid price for ${item.name}`);
          }
          return {
            product: item.product_id,
            quantity: item.quantity,
            unit_price: validUnitPrice,
            gst_rate: item.gst_rate,
            hsn_code: item.hsn_code,
          };
        }),
      };

      const sale = await saleService.create(saleData);
      const printCustomer = snapCustomerObj || {
        name: snapGuestName || 'Walk-in Customer',
        phone: snapGuestPhone,
      };
      sale.customer = printCustomer;

      setCompletedSale(sale);
      setIsCartOpen(false);
      setShowInvoice(true);
      dispatch(addNotification({ message: 'Sale completed!', type: 'success' }));
    } catch (err: any) {
      dispatch(
        addNotification({
          message: err?.response?.data?.error || err?.message || 'Payment failed',
          type: 'error',
        }),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setCompletedSale(null);
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== activeSessionId);
      if (remaining.length === 0) {
        const fresh = createEmptySession(1);
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      setActiveSessionId(remaining[remaining.length - 1].id);
      return remaining;
    });
    setSearchTerm('');
    if (mode === 'scan' && searchInputRef.current) searchInputRef.current.focus();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#F2EFE8]"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >

      {/* ══ SESSION HEADER ══════════════════════════════════════════════════ */}
      <div className="shrink-0 bg-[#0F1F18] px-3 py-2 flex items-center gap-2 min-w-0">
        {/* Session tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 flex-1" style={{ scrollbarWidth: 'none' }}>
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`group relative flex items-center gap-1 px-3 py-1.5 rounded-full cursor-pointer
                  text-xs font-semibold whitespace-nowrap select-none shrink-0 transition-all
                  ${isActive
                    ? 'bg-white text-[#0F1F18] shadow-sm'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                  }`}
              >
                {session.cart.items.length > 0 && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-green-500' : 'bg-green-400/60'}`}
                  />
                )}
                <span className="max-w-[64px] truncate">{session.label}</span>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => closeSession(session.id, e)}
                    className={`ml-0.5 rounded-full p-0.5 transition-colors shrink-0
                      ${isActive
                        ? 'hover:bg-black/10 text-gray-500'
                        : 'opacity-0 group-hover:opacity-100 hover:bg-white/20 text-white/50'
                      }`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}
          {sessions.length < MAX_SESSIONS && (
            <button
              onClick={addSession}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full
                bg-white/10 hover:bg-white/20 text-white/60 hover:text-white
                border border-dashed border-white/30 hover:border-white/60 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tier selector + register status */}
        <div className="shrink-0 flex items-center gap-1.5">
          {priceTiers.length > 0 && (
            <div className="flex items-center gap-1 bg-white/10 rounded-full px-2 py-1">
              <Tag className="w-3 h-3 text-white/60 shrink-0" />
              <select
                value={selectedTierId || ''}
                onChange={(e) => setSelectedTierId(e.target.value ? Number(e.target.value) : null)}
                className="bg-transparent border-none text-[11px] focus:ring-0 outline-none text-white/80 cursor-pointer max-w-[64px]"
              >
                <option value="" className="text-gray-800 bg-white">Std</option>
                {priceTiers.map((tier) => (
                  <option key={tier.id} value={tier.id} className="text-gray-800 bg-white">
                    {tier.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentSession ? (
            <div className="flex items-center gap-1 bg-green-500/20 border border-green-500/30 rounded-full px-2 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0" />
              <span className="text-[10px] text-green-300 font-semibold hidden xs:inline">Active</span>
              <button
                onClick={() => setShowCloseModal(true)}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Close Register"
              >
                <Flag className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 rounded-full px-2 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="text-[10px] text-amber-300 font-semibold hidden xs:inline">Closed</span>
            </div>
          )}
        </div>
      </div>

      {/* ══ MODE TOGGLE ═════════════════════════════════════════════════════ */}
      <div className="shrink-0 bg-white border-b border-gray-100 py-2 flex items-center justify-between gap-3 shadow-sm"
        style={{ paddingLeft: 'max(env(safe-area-inset-left), 12px)', paddingRight: 'max(env(safe-area-inset-right), 12px)' }}
      >
        <div className="relative flex bg-gray-100 rounded-full p-1">
          {/* Sliding thumb */}
          <div
            className={`absolute top-1 bottom-1 rounded-full bg-white shadow-sm transition-all duration-200 ease-in-out ${
              mode === 'browse' ? 'left-1 right-[calc(50%+2px)]' : 'left-[calc(50%+2px)] right-1'
            }`}
          />
          <button
            onClick={() => setMode('browse')}
            className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 ${
              mode === 'browse' ? 'text-[#0F1F18]' : 'text-gray-400'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Browse
          </button>
          <button
            onClick={() => setMode('scan')}
            className={`relative z-10 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 ${
              mode === 'scan' ? 'text-[#0F1F18]' : 'text-gray-400'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
        </div>

        {totalItems > 0 && (
          <div className="text-xs text-gray-500 bg-gray-100 rounded-full px-3 py-1 font-medium shrink-0">
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* ══ MAIN CONTENT ════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto min-h-0 relative">

        {/* Register closed overlay */}
        {needsSessionSetup ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#F2EFE8] p-6">
            <Lock className="w-14 h-14 text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 mb-1">Register Closed</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Open a register session to start making sales.
            </p>
            <div className="w-full max-w-sm">
              <OpeningBalanceModal />
            </div>
          </div>
        ) : mode === 'browse' ? (

          /* ── BROWSE MODE ─────────────────────────────────────────────── */
          <div className="pt-3 pb-2" style={{ paddingLeft: 'max(env(safe-area-inset-left), 12px)', paddingRight: 'max(env(safe-area-inset-right), 12px)' }}>
            {/* Category chips */}
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-3" style={{ scrollbarWidth: 'none', marginLeft: 'calc(-1 * max(env(safe-area-inset-left), 12px))', marginRight: 'calc(-1 * max(env(safe-area-inset-right), 12px))', paddingLeft: 'max(env(safe-area-inset-left), 12px)', paddingRight: 'max(env(safe-area-inset-right), 12px)' }}>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-all ${
                    !selectedCategory
                      ? 'bg-[#0d9158] text-white border-[#0d9158] shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#0d9158] hover:text-[#0d9158]'
                  }`}
                >
                  All
                </button>
                {categories.slice(0, 20).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() =>
                      setSelectedCategory(selectedCategory?.id === cat.id ? null : cat)
                    }
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium border transition-all whitespace-nowrap ${
                      selectedCategory?.id === cat.id
                        ? 'bg-[#0d9158] text-white border-[#0d9158] shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#0d9158] hover:text-[#0d9158]'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Product filter search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Filter products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white outline-none focus:border-[#0d9158] focus:ring-2 focus:ring-[#0d9158]/10 transition-all"
              />
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-2 gap-3">
              {browseProducts.map((product: any) => {
                const effectivePrice = calculateEffectivePrice(product);
                const isDiscounted = effectivePrice < parseFloat(product.selling_price);
                const isPremium = effectivePrice > parseFloat(product.selling_price);
                const priceColor = isDiscounted
                  ? 'text-green-600'
                  : isPremium
                  ? 'text-amber-600'
                  : 'text-blue-600';

                return (
                  <button
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 text-left active:scale-[0.96] transition-all duration-100 overflow-hidden group relative"
                  >
                    {/* Tap overlay */}
                    <div className="absolute inset-0 bg-[#0d9158]/10 opacity-0 group-active:opacity-100 flex items-center justify-center z-10 pointer-events-none transition-opacity">
                      <div className="bg-[#0d9158] text-white rounded-full p-2 shadow-lg">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Image area */}
                    <div className="h-[88px] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Package className="w-8 h-8 text-gray-300" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-2.5">
                      <div className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 mb-2 min-h-[2rem]">
                        {product.name}
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          {effectivePrice !== parseFloat(product.selling_price) && (
                            <div className="text-[9px] text-gray-400 line-through leading-none">
                              ₹{parseFloat(product.selling_price).toFixed(2)}
                            </div>
                          )}
                          <span className={`text-sm font-bold leading-none ${priceColor}`}>
                            ₹{effectivePrice.toFixed(2)}
                          </span>
                        </div>
                        <span className="text-[9px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100">
                          {product.stock_quantity}
                        </span>
                      </div>
                      {product.gst_rate > 0 && (
                        <div className="text-[9px] text-gray-400 mt-1">GST {product.gst_rate}%</div>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="col-span-2 h-10 flex items-center justify-center">
                {posLoading && (
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-[#0d9158] rounded-full animate-spin" />
                    Loading...
                  </div>
                )}
                {!hasMore && browseProducts.length > 0 && (
                  <span className="text-xs text-gray-300">All products loaded</span>
                )}
              </div>
            </div>

            {browseProducts.length === 0 && !posLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Package className="w-12 h-12 mb-3 text-gray-300" />
                <p className="text-sm font-medium">No products found</p>
              </div>
            )}
          </div>

        ) : (

          /* ── SCAN MODE ───────────────────────────────────────────────── */
          <div className="pt-3 relative" style={{ paddingLeft: 'max(env(safe-area-inset-left), 12px)', paddingRight: 'max(env(safe-area-inset-right), 12px)' }}>
            <div className="relative z-20">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Scan barcode or type product name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSearchResults(true);
                  }}
                  onFocus={() => {
                    if (searchTerm || scanProducts.length > 0) setShowSearchResults(true);
                  }}
                  onKeyDown={handleScanKeyDown}
                  className="w-full pl-12 pr-10 py-3.5 text-base border-2 border-gray-200 rounded-2xl bg-white outline-none focus:border-[#0d9158] focus:ring-4 focus:ring-[#0d9158]/10 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setScanProducts([]);
                      setShowSearchResults(false);
                    }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Floating results dropdown */}
              {showSearchResults && (searchTerm || scanProducts.length > 0) && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 max-h-[55vh] overflow-y-auto z-50"
                >
                  {isSearchLoading ? (
                    <div className="p-8 flex flex-col items-center gap-2 text-gray-400">
                      <div className="w-5 h-5 border-2 border-gray-200 border-t-[#0d9158] rounded-full animate-spin" />
                      <span className="text-sm">Searching...</span>
                    </div>
                  ) : scanProducts.length > 0 ? (
                    <div className="p-2">
                      {scanProducts.map((product) => {
                        const effectivePrice = calculateEffectivePrice(product);
                        const isDiscounted = effectivePrice < parseFloat(product.selling_price);
                        const isPremium = effectivePrice > parseFloat(product.selling_price);
                        return (
                          <button
                            key={product.id}
                            onClick={() => {
                              handleAddToCart(product);
                              setSearchTerm('');
                              setScanProducts([]);
                              setShowSearchResults(false);
                              if (searchInputRef.current) searchInputRef.current.focus();
                            }}
                            className="w-full flex items-center justify-between p-3 hover:bg-green-50 active:bg-green-100 rounded-xl transition-colors text-left"
                          >
                            <div className="flex-1 min-w-0 pr-3">
                              <div className="font-semibold text-gray-800 text-sm truncate">
                                {product.name}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md border border-gray-200">
                                  {product.sku}
                                </span>
                                {product.barcode && (
                                  <span className="text-[10px] text-gray-400">{product.barcode}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div
                                className={`font-bold text-base leading-none ${
                                  isDiscounted
                                    ? 'text-green-600'
                                    : isPremium
                                    ? 'text-amber-600'
                                    : 'text-blue-600'
                                }`}
                              >
                                ₹{effectivePrice.toFixed(2)}
                              </div>
                              <div className="text-[10px] text-green-600 font-medium mt-1 bg-green-50 inline-block px-1.5 py-0.5 rounded-full border border-green-100">
                                {product.stock_quantity} in stock
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : searchTerm && !isSearchLoading ? (
                    <div className="p-10 text-center">
                      <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No products found for "{searchTerm}"</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {!searchTerm && (
              <div className="flex flex-col items-center justify-center pt-16 pb-4">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">Scan a barcode or type to search</p>
                <p className="text-xs text-gray-400 mt-1">Press Enter to scan barcodes instantly</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ CUSTOMER WIDGET ═════════════════════════════════════════════════ */}
      <div className="shrink-0 bg-white border-t border-gray-100 px-3 py-2.5"
        style={{ paddingLeft: 'max(env(safe-area-inset-left), 12px)', paddingRight: 'max(env(safe-area-inset-right), 12px)' }}
      >
        {cart.customer_id ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0d9158] flex items-center justify-center shrink-0">
              {currentCustomerObj?.name ? (
                <span className="text-white text-sm font-bold">
                  {currentCustomerObj.name.charAt(0).toUpperCase()}
                </span>
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-gray-800 truncate">
                {currentCustomerObj?.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] text-gray-400">{currentCustomerObj?.phone}</span>
                {outstandingBalance > 0 && (
                  <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-100">
                    Bal: ₹{outstandingBalance.toFixed(0)}
                  </span>
                )}
                {walletBalance > 0 && (
                  <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-100 flex items-center gap-0.5">
                    <Wallet className="w-2.5 h-2.5" />₹{walletBalance.toFixed(0)}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() =>
                updateActiveSession((s) => ({
                  ...s,
                  cart: { ...s.cart, customer_id: null },
                  currentCustomerObj: null,
                }))
              }
              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative w-[48%]">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Phone No."
                value={guestPhone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                  updateActiveSession((s) => ({ ...s, guestPhone: val }));
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#0d9158] focus:ring-2 focus:ring-[#0d9158]/10 transition-all bg-gray-50"
              />
              {isLoading && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 border border-gray-300 border-t-[#0d9158] rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input
              type="text"
              placeholder="Name (opt)"
              value={guestName}
              onChange={(e) => updateActiveSession((s) => ({ ...s, guestName: e.target.value }))}
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-200 rounded-xl outline-none focus:border-[#0d9158] focus:ring-2 focus:ring-[#0d9158]/10 transition-all bg-gray-50"
            />
          </div>
        )}
      </div>

      {/* ══ CART FLOATING BAR ═══════════════════════════════════════════════ */}
      <div
        onClick={() => totalItems > 0 && setIsCartOpen(true)}
        className={`shrink-0 bg-white rounded-t-2xl shadow-2xl border-t border-gray-100 transition-all ${
          totalItems > 0 ? 'cursor-pointer active:bg-gray-50/80' : 'opacity-50 cursor-not-allowed'
        }`}
        style={{
          paddingTop: '12px',
          paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
          paddingLeft: 'max(env(safe-area-inset-left), 16px)',
          paddingRight: 'max(env(safe-area-inset-right), 16px)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Cart icon with badge */}
          <div className="relative shrink-0">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm ${
                totalItems > 0 ? 'bg-[#0d9158]' : 'bg-gray-200'
              }`}
            >
              <ShoppingCart
                className={`w-5 h-5 ${totalItems > 0 ? 'text-white' : 'text-gray-400'}`}
              />
            </div>
            {totalItems > 0 && (
              <span
                className={`absolute -top-2 -right-2 min-w-[22px] h-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 shadow-md ${
                  badgePop ? 'scale-125' : 'scale-100'
                } transition-transform duration-200`}
              >
                {totalItems}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {totalItems > 0 ? (
              <>
                <div className="text-xs text-gray-400 font-medium">
                  {cart.items.length} product{cart.items.length !== 1 ? 's' : ''} in cart
                </div>
                <div className="text-xl font-extrabold text-gray-800 leading-tight">
                  ₹{totals.grandTotal.toFixed(2)}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-400 font-medium">Cart is empty</div>
            )}
          </div>

          {totalItems > 0 && (
            <div className="flex items-center gap-1.5 bg-[#0d9158] text-white rounded-full px-4 py-2 font-semibold text-sm shadow-sm shrink-0">
              <span>View Cart</span>
              <ChevronUp className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {/* ══ CART BOTTOM SHEET ═══════════════════════════════════════════════ */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col animate-slideUp" style={{ maxHeight: 'calc(var(--viewport-height, 100vh) * 0.95)' }}>
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <h2 className="font-bold text-gray-800 text-base flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#0d9158]" />
                Your Cart
                {cart.items.length > 0 && (
                  <span className="text-xs font-semibold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                    {totalItems} item{totalItems !== 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto min-h-[200px]">
              {cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                  <ShoppingCart className="w-12 h-12 mb-3 text-gray-200" />
                  <p className="text-sm font-medium">Cart is empty</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {cart.items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-5 py-3.5 bg-white hover:bg-gray-50/50 transition-colors group"
                    >
                      <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center">
                        {index + 1}
                      </span>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-800 leading-tight break-words">{item.name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          ₹{item.unit_price.toFixed(2)} / unit
                          {item.gst_rate > 0 && (
                            <span className="ml-1.5 text-orange-500">GST {item.gst_rate}%</span>
                          )}
                        </div>
                      </div>

                      {/* Qty stepper */}
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0 shadow-sm">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-8 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 text-gray-500 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-sm font-bold text-gray-800 border-x border-gray-200">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-8 flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 text-gray-500 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="shrink-0 text-right w-16">
                        <div className="text-sm font-bold text-gray-800">
                          ₹{(item.selling_price * item.quantity).toFixed(2)}
                        </div>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="shrink-0 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary + Payments */}
            {cart.items.length > 0 && (
              <div className="shrink-0 border-t border-gray-100">
                {/* Full GST breakdown */}
                <div className="px-4 pt-3 pb-2 space-y-2">

                  {/* Subtotal row */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold text-gray-700">₹{totals.subtotal.toFixed(2)}</span>
                  </div>

                  {/* Discount row */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 shrink-0">Discount</span>
                    <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200 ml-auto">
                      <button
                        onClick={() =>
                          updateActiveSession((s) => ({
                            ...s,
                            cart: { ...s.cart, discount_type: 'percentage' },
                          }))
                        }
                        className={`px-2 py-0.5 text-[11px] font-bold rounded transition-all ${
                          cart.discount_type === 'percentage'
                            ? 'bg-white shadow-sm text-blue-700'
                            : 'text-gray-400'
                        }`}
                      >
                        %
                      </button>
                      <button
                        onClick={() =>
                          updateActiveSession((s) => ({
                            ...s,
                            cart: { ...s.cart, discount_type: 'amount' },
                          }))
                        }
                        className={`px-2 py-0.5 text-[11px] font-bold rounded transition-all ${
                          cart.discount_type === 'amount'
                            ? 'bg-white shadow-sm text-blue-700'
                            : 'text-gray-400'
                        }`}
                      >
                        ₹
                      </button>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={
                        cart.discount_type === 'percentage'
                          ? cart.discount_percentage || ''
                          : cart.discount_amount || ''
                      }
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (cart.discount_type === 'percentage') {
                          updateActiveSession((s) => ({
                            ...s,
                            cart: { ...s.cart, discount_percentage: val > 100 ? 100 : val },
                          }));
                        } else {
                          updateActiveSession((s) => ({
                            ...s,
                            cart: { ...s.cart, discount_amount: val },
                          }));
                        }
                      }}
                      className="w-20 text-right px-2 py-1 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#0d9158] focus:ring-1 focus:ring-[#0d9158]/20 font-medium text-gray-700 bg-white"
                      placeholder="0"
                    />
                    {totals.discount > 0 && (
                      <span className="text-sm font-semibold text-green-600 shrink-0">
                        -₹{totals.discount.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* GST breakdown card */}
                  {(totals.totalGst > 0 || totals.exemptedAmount > 0) && (
                    <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5 space-y-1.5">
                      <div className="text-[11px] font-bold text-orange-700 uppercase tracking-wide mb-1">
                        GST Breakdown
                      </div>
                      {Object.entries(totals.taxBreakdown).map(([rate, data]) => (
                        <div key={rate} className="space-y-0.5">
                          <div className="flex justify-between text-[11px] text-orange-600 font-semibold">
                            <span>GST {rate}%</span>
                            <span>Taxable: ₹{data.taxableAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-orange-500 pl-2">
                            <span>CGST {(parseFloat(rate) / 2).toFixed(1)}%</span>
                            <span>₹{data.cgst.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-orange-500 pl-2">
                            <span>SGST {(parseFloat(rate) / 2).toFixed(1)}%</span>
                            <span>₹{data.sgst.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                      {totals.exemptedAmount > 0 && (
                        <div className="flex justify-between text-[11px] text-gray-500 border-t border-orange-100 pt-1">
                          <span>Exempted (0%)</span>
                          <span>₹{totals.exemptedAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-bold text-orange-700 border-t border-orange-200 pt-1.5 mt-1">
                        <span>Total GST</span>
                        <span>₹{totals.totalGst.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Round-off */}
                  {totals.roundOff !== 0 && (
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>Round Off</span>
                      <span>{totals.roundOff > 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Grand total */}
                <div className="mx-4 my-2.5 flex justify-between items-center bg-blue-600 text-white rounded-xl px-4 py-2.5 shadow-sm">
                  <div>
                    <div className="font-bold text-sm leading-none">Grand Total</div>
                    {totals.roundOff !== 0 && (
                      <div className="text-[10px] text-blue-200 mt-0.5">
                        Round off {totals.roundOff > 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <span className="text-2xl font-extrabold tracking-tight">
                    ₹{totals.grandTotal.toFixed(2)}
                  </span>
                </div>

                {/* Payment — compact horizontal scrollable strip */}
                <div className="px-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    <button
                      disabled={isProcessing}
                      onClick={() => processPayment('cash')}
                      className="shrink-0 flex flex-col items-center gap-1 px-5 py-2 bg-white border-2 border-green-500 hover:bg-green-50 active:bg-green-100 text-green-700 rounded-xl shadow-sm transition-all active:scale-[0.95] disabled:opacity-40 disabled:border-gray-200 disabled:text-gray-400"
                    >
                      <Banknote className="w-4 h-4" />
                      <span className="font-bold text-[10px] tracking-wide">CASH</span>
                    </button>

                    <button
                      disabled={isProcessing}
                      onClick={() => processPayment('upi')}
                      className="shrink-0 flex flex-col items-center gap-1 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl shadow-md transition-all active:scale-[0.95] disabled:opacity-40"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span className="font-bold text-[10px] tracking-wide">UPI</span>
                    </button>

                    <button
                      disabled={isProcessing}
                      onClick={() => processPayment('card')}
                      className="shrink-0 flex flex-col items-center gap-1 px-5 py-2 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white rounded-xl shadow-md transition-all active:scale-[0.95] disabled:opacity-40"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span className="font-bold text-[10px] tracking-wide">CARD</span>
                    </button>

                    <button
                      disabled={isProcessing || !isEligibleForCredit || !canAffordCredit}
                      onClick={() => processPayment('credit')}
                      title={
                        !isEligibleForCredit
                          ? 'Only for registered customers'
                          : !canAffordCredit
                          ? 'Credit limit exceeded'
                          : 'Pay via Credit'
                      }
                      className="shrink-0 flex flex-col items-center gap-1 px-5 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white rounded-xl shadow-md transition-all active:scale-[0.95] disabled:opacity-40"
                    >
                      <BookOpenCheck className="w-4 h-4" />
                      <span className="font-bold text-[10px] tracking-wide">CREDIT</span>
                    </button>

                    <button
                      disabled={isProcessing || !isEligibleForCredit || !hasWalletBalance}
                      onClick={() => processPayment('wallet')}
                      title={
                        !isEligibleForCredit
                          ? 'Only for registered customers'
                          : !hasWalletBalance
                          ? 'No wallet balance'
                          : `Pay from wallet`
                      }
                      className="shrink-0 flex flex-col items-center gap-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl shadow-md transition-all active:scale-[0.95] disabled:opacity-40"
                    >
                      <Wallet className="w-4 h-4" />
                      <span className="font-bold text-[10px] tracking-wide whitespace-nowrap">
                        {hasWalletBalance && isEligibleForCredit
                          ? `₹${walletBalance.toFixed(0)}`
                          : 'WALLET'}
                      </span>
                    </button>

                    <button
                      disabled={isProcessing}
                      onClick={() => processPayment('net_banking')}
                      className="shrink-0 flex flex-col items-center gap-1 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-600 rounded-xl shadow-sm transition-all active:scale-[0.95] disabled:opacity-40"
                    >
                      <Building2 className="w-4 h-4" />
                      <span className="font-bold text-[10px] tracking-wide whitespace-nowrap">NET</span>
                    </button>
                  </div>

                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2 text-gray-500 mt-2">
                      <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-[#0d9158] rounded-full animate-spin" />
                      <span className="text-xs font-medium">Processing payment...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}
      {showInvoice && completedSale && (
        <InvoicePreview
          sale={completedSale}
          onClose={handleCloseInvoice}
          onGenerateInvoice={() => setShowGenerateInvoiceModal(true)}
        />
      )}

      {showGenerateInvoiceModal && completedSale && (
        <GenerateInvoiceModal
          initialSale={completedSale}
          onClose={() => setShowGenerateInvoiceModal(false)}
          onSuccess={handleCloseInvoice}
        />
      )}

      {confirmClose && (
        <Modal
          show={true}
          onHide={() => setConfirmClose(null)}
          title="Close Session"
          size="sm"
          footer={
            <>
              <button
                onClick={() => setConfirmClose(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Keep Session
              </button>
              <button
                onClick={() => doCloseSession(confirmClose.sessionId)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Discard & Close
              </button>
            </>
          }
        >
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-gray-800 font-semibold">"{confirmClose.label}"</p>
              <p className="text-gray-500 text-sm mt-1">
                This session has {confirmClose.itemCount} item
                {confirmClose.itemCount !== 1 ? 's' : ''} in the cart. Closing it will discard all
                items.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {showCloseModal && <CloseRegisterModal onClose={() => setShowCloseModal(false)} />}
    </div>
  );
};

export default MobilePOS;
