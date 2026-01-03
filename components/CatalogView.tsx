
import React, { useState, useMemo } from 'react';
import { Product, Discount, DiscountType, User, UserRole, Lead, Interaction } from '../types';
import { Plus, Tag, ShoppingBag, Percent, Clock, X, Check, ShoppingCart, Trash2, Minus, Receipt, FileText, Shield, Edit, AlertCircle, ShieldCheck, Calendar, Send, Zap, User as UserIcon, Mic } from 'lucide-react';

interface CatalogViewProps {
  products: Product[];
  discounts: Discount[];
  leads: Lead[];
  onAddProduct: (product: Omit<Product, 'id' | 'tenantId'>) => Promise<void>;
  onAddDiscount: (discount: Omit<Discount, 'id' | 'tenantId'>) => Promise<void>;
  onEditDiscount: (id: string, discount: Partial<Discount>) => Promise<void>;
  onDeleteDiscount: (id: string) => Promise<void>;
  onAddInteraction: (interaction: Interaction) => Promise<void>;
  user: User;
}

interface CartItem extends Product {
  quantity: number;
  appliedDiscountId?: string;
  contractTerm: 'NONE' | '6_MONTHS' | '12_MONTHS';
  customDiscountValue?: number; // For manager custom discount (flat amount)
}

export const CatalogView: React.FC<CatalogViewProps> = ({ products, discounts, leads, onAddProduct, onAddDiscount, onEditDiscount, onDeleteDiscount, onAddInteraction, user }) => {
  const [activeTab, setActiveTab] = useState<'PRODUCTS' | 'DISCOUNTS'>('PRODUCTS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoError, setPromoError] = useState('');
  
  // Checkout Modal State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [legalAgreements, setLegalAgreements] = useState({
      isBusiness: false,
      autoRenew: false,
      terms: false
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Form States
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    description: '', 
    price: '', 
    billingCycle: 'MONTHLY',
    stripeProductId: '',
    stripePriceId: ''
  });
  
  const [discountForm, setDiscountForm] = useState<{
    name: string;
    code: string;
    type: DiscountType;
    value: string;
    applicableProductIds: string[];
    contractTerm?: 6 | 12;
    expiresAt: string;
  }>({ name: '', code: '', type: DiscountType.PERCENTAGE, value: '', applicableProductIds: [] as string[], expiresAt: '' });

  // --- Calculations Helper ---

  const calculateItemPrice = (item: CartItem, discount?: Discount) => {
    const itemTotal = item.price * item.quantity;
    
    // 1. Manager Custom Discount (Top Priority)
    if (item.customDiscountValue !== undefined && item.customDiscountValue >= 0) {
        return Math.max(0, itemTotal - item.customDiscountValue);
    }

    // 2. No Discount
    if (!discount) return itemTotal;

    // 3. Percentage Discount
    if (discount.type === DiscountType.PERCENTAGE) {
        return itemTotal * (1 - discount.value / 100);
    }
    
    // 4. Contract Discount
    if (discount.type === DiscountType.CONTRACT) {
        // "Months Free" Convention: if name contains "Free", value is treated as number of months
        if (discount.name.toLowerCase().includes('free')) {
             const monthlyPrice = item.billingCycle === 'YEARLY' ? item.price / 12 : item.price;
             // Ensure we don't give more free months than the contract term
             const termMonths = discount.contractTerm || (item.contractTerm === '6_MONTHS' ? 6 : 12);
             const freeMonths = Math.min(discount.value, termMonths);
             
             const discountAmount = monthlyPrice * freeMonths * item.quantity;
             return Math.max(0, itemTotal - discountAmount);
        } else {
             // Standard Percentage for Contract (e.g., 50% off for 6 months commitment)
             return itemTotal * (1 - discount.value / 100);
        }
    }
    
    // 5. Default fallback
    return itemTotal;
  };

  // --- Cart Logic ---

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1, appliedDiscountId: undefined, contractTerm: 'NONE' }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updateItemDiscount = (productId: string, discountId: string) => {
    setCart(prev => prev.map(item => 
      item.id === productId ? { ...item, appliedDiscountId: discountId === 'none' ? undefined : discountId, customDiscountValue: undefined } : item
    ));
  };

  const updateContractTerm = (productId: string, term: 'NONE' | '6_MONTHS' | '12_MONTHS') => {
    setCart(prev => prev.map(item => {
      if (item.id !== productId) return item;
      
      let bestContractDiscountId = undefined;
      
      if (term !== 'NONE') {
        const termMonths = term === '6_MONTHS' ? 6 : 12;
        
        // Find all candidates that match the term AND the product
        const candidates = discounts.filter(d => 
            d.type === DiscountType.CONTRACT && 
            d.contractTerm === termMonths &&
            ((d.applicableProductIds || []).includes('ALL') || (d.applicableProductIds || []).includes(item.id))

        candidates.sort((a, b) => {
            const aSpecific = a.applicableProductIds.includes(item.id);
            const bSpecific = b.applicableProductIds.includes(item.id);
            if (aSpecific && !bSpecific) return -1;
            if (!aSpecific && bSpecific) return 1;
            return b.value - a.value;
        });

        if (candidates.length > 0) {
            bestContractDiscountId = candidates[0].id;
        }
      }

      return { 
          ...item, 
          contractTerm: term,
          appliedDiscountId: bestContractDiscountId || (term === 'NONE' ? item.appliedDiscountId : undefined) 
      };
    }));
  };

  const applyCustomDiscount = (productId: string, value: number) => {
    setCart(prev => prev.map(item => 
      item.id === productId ? { ...item, customDiscountValue: value, appliedDiscountId: undefined } : item
    ));
  };

  const applyGlobalCode = () => {
    setPromoError('');
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;

    const discount = discounts.find(d => d.code === code);
    if (!discount) {
        setPromoError('Invalid promo code');
        return;
    }

    if (discount.type === DiscountType.CONTRACT) {
        setPromoError('Contract discounts must be selected via the term selector.');
        return;
    }

    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
        setPromoError('This promo code has expired.');
        return;
    }

    let appliedCount = 0;
    setCart(prev => prev.map(item => {
        if (item.contractTerm !== 'NONE') return item;
        if (discount.applicableProductIds.includes('ALL') || discount.applicableProductIds.includes(item.id)) {
            appliedCount++;
            return { ...item, appliedDiscountId: discount.id, customDiscountValue: undefined };
        }
        return item;
    }));

    if (appliedCount > 0) {
        setPromoCodeInput('');
        setPromoError('');
    } else {
        setPromoError('Code valid, but not applicable to eligible items in cart');
    }
  };

  // --- Memoized Totals ---

  const getApplicableDiscounts = (productId: string) => {
    return discounts.filter(d => 
        (d.type !== DiscountType.CONTRACT) &&
        (d.applicableProductIds || []).includes('ALL') || d.applicableProductIds.includes(productId)) &&
        (!d.expiresAt || new Date(d.expiresAt) >= new Date())
    );
  };

  const { subtotal, totalDiscount, finalTotal } = useMemo(() => {
    let sub = 0;
    let final = 0;

    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      sub += itemTotal;
      const discount = item.appliedDiscountId ? discounts.find(d => d.id === item.appliedDiscountId) : undefined;
      const discountedPrice = calculateItemPrice(item, discount);
      final += discountedPrice;
    });

    return {
      subtotal: sub,
      totalDiscount: Math.max(0, sub - final),
      finalTotal: final
    };
  }, [cart, discounts]);

  const complianceScript = useMemo(() => {
    const leadName = selectedLeadId ? leads.find(l => l.id === selectedLeadId)?.company : '[Customer Company]';
    let script = `READ VERBATIM:\n\n"I am confirming your order for ${leadName}. You are purchasing:\n`;
    
    cart.forEach(item => {
        const discount = item.appliedDiscountId ? discounts.find(d => d.id === item.appliedDiscountId) : undefined;
        const price = calculateItemPrice(item, discount);
        const itemTotal = price.toFixed(2);
        
        script += `• ${item.quantity}x ${item.name} at $${itemTotal}/${item.billingCycle === 'MONTHLY' ? 'mo' : item.billingCycle === 'YEARLY' ? 'yr' : 'one-time'}`;
        
        if (item.contractTerm !== 'NONE') {
            const term = item.contractTerm === '6_MONTHS' ? '6 months' : '12 months';
            script += ` with a ${term} commitment`;
        }
        
        if (item.customDiscountValue) {
             script += ` (includes manual discount of $${item.customDiscountValue})`;
        } else if (discount) {
             script += ` (includes ${discount.name})`;
        }
        script += ".\n";
    });

    script += `\nThe total amount due today is $${finalTotal.toFixed(2)}. `;
    if (legalAgreements.autoRenew) {
        script += "This subscription will automatically renew at the standard rate at the end of the term. ";
    }
    
    script += `\n\nDo you acknowledge these terms, the pricing, and agree to our data processing as outlined in the GDPR privacy notice sent to your email?"`;
    
    return script;
  }, [cart, discounts, selectedLeadId, leads, finalTotal, legalAgreements.autoRenew]);

  // --- Checkout Logic ---

  const handleOpenCheckout = () => {
      setLegalAgreements({
          isBusiness: false,
          autoRenew: false,
          terms: false
      });
      setSelectedLeadId('');
      setIsCheckoutModalOpen(true);
  };

  const handleConfirmCheckout = async () => {
      if (!selectedLeadId) {
          alert("Please assign this order to an account first.");
          return;
      }
      
      setIsProcessing(true);
      await new Promise(resolve => setTimeout(resolve, 2000)); 

      // Build Purchase Summary Note
      const now = new Date();
      const timestamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      let summary = `PURCHASE COMPLETED: ${user.name} - ${timestamp}\n`;
      summary += `Action: Account Upgrade / Product Purchase\n`;
      summary += `------------------------------------------------\n`;
      
      cart.forEach((item, idx) => {
          const discount = item.appliedDiscountId ? discounts.find(d => d.id === item.appliedDiscountId) : undefined;
          const price = calculateItemPrice(item, discount);
          summary += `${idx + 1}. ${item.name} x${item.quantity}\n`;
          summary += `   Term: ${item.contractTerm !== 'NONE' ? item.contractTerm : 'No Commitment'}\n`;
          if (discount) {
              summary += `   Applied Offer: ${discount.name} (${discount.code})\n`;
          }
          if (item.customDiscountValue) {
              summary += `   Manager Override: -$${item.customDiscountValue.toFixed(2)}\n`;
          }
          summary += `   Price: $${price.toFixed(2)}\n`;
      });
      
      summary += `------------------------------------------------\n`;
      summary += `ORDER TOTAL: $${finalTotal.toFixed(2)}\n`;
      summary += `Billing status: SUCCESSFUL`;

      // Log to Lead Interaction
      const interaction: Interaction = {
          id: `int-sale-${Date.now()}`,
          tenantId: user.tenantId,
          leadId: selectedLeadId,
          type: 'NOTE',
          notes: summary,
          date: now.toISOString()
      };

      await onAddInteraction(interaction);

      setIsProcessing(false);
      setIsCheckoutModalOpen(false);
      setIsCartOpen(false);
      setCart([]);
      alert("Order Processed & Logged Successfully!");
  };

  const handleSendContract = async () => {
      const email = prompt("Enter Lead/Contact Email to send this contract to:");
      if (email) {
          setIsProcessing(true);
          await new Promise(resolve => setTimeout(resolve, 1500));
          setIsProcessing(false);
          alert(`Contract details sent to ${email} successfully!`);
      }
  };

  // --- Form Handlers ---

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddProduct({
      name: newProduct.name,
      description: newProduct.description,
      price: parseFloat(newProduct.price),
      billingCycle: newProduct.billingCycle as any,
      stripeProductId: newProduct.stripeProductId,
      stripePriceId: newProduct.stripePriceId
    });
    setIsModalOpen(false);
    setNewProduct({ name: '', description: '', price: '', billingCycle: 'MONTHLY', stripeProductId: '', stripePriceId: '' });
  };

  const handleDiscountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: discountForm.name,
      code: discountForm.code,
      type: discountForm.type,
      value: parseFloat(discountForm.value),
      contractTerm: discountForm.type === DiscountType.CONTRACT ? discountForm.contractTerm : undefined,
      isManagerOnly: discountForm.type === DiscountType.CUSTOM,
      applicableProductIds: discountForm.applicableProductIds.length === 0 ? ['ALL'] : discountForm.applicableProductIds,
      expiresAt: discountForm.expiresAt ? new Date(discountForm.expiresAt).toISOString() : undefined
    };

    if (editingDiscountId) {
        await onEditDiscount(editingDiscountId, payload);
    } else {
        await onAddDiscount(payload);
    }
    
    setIsModalOpen(false);
  };

  const toggleProductSelection = (prodId: string) => {
    setDiscountForm(prev => {
      const exists = prev.applicableProductIds.includes(prodId);
      if (exists) {
        return { ...prev, applicableProductIds: prev.applicableProductIds.filter(id => id !== id) };
      } else {
        return { ...prev, applicableProductIds: [...prev.applicableProductIds, prodId] };
      }
    });
  };

  const handleContractOptionChange = (option: string) => {
     if (option === '6MO_50') {
         setDiscountForm(prev => ({ ...prev, type: DiscountType.CONTRACT, contractTerm: 6, value: '50', name: '6 Months - 50% Off' }));
     } else if (option === '12MO_25') {
         setDiscountForm(prev => ({ ...prev, type: DiscountType.CONTRACT, contractTerm: 12, value: '25', name: '12 Months - 25% Off' }));
     } else if (option === '12MO_3FREE') {
         setDiscountForm(prev => ({ ...prev, type: DiscountType.CONTRACT, contractTerm: 12, value: '3', name: '12 Months - 3 Months Free' }));
     }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this discount?')) {
          await onDeleteDiscount(id);
      }
  };

  const openAddDiscountModal = () => {
    setEditingDiscountId(null);
    setDiscountForm({ name: '', code: '', type: DiscountType.PERCENTAGE, value: '', applicableProductIds: [], expiresAt: '' });
    setActiveTab('DISCOUNTS'); 
    setIsModalOpen(true);
  };

  const openEditDiscountModal = (discount: Discount) => {
    setEditingDiscountId(discount.id);
    setDiscountForm({
        name: discount.name,
        code: discount.code,
        type: discount.type,
        value: discount.value.toString(),
        applicableProductIds: discount.applicableProductIds,
        contractTerm: discount.contractTerm,
        expiresAt: discount.expiresAt ? new Date(discount.expiresAt).toISOString().split('T')[0] : ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 h-full flex flex-col relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Product & Offer Catalog</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your services, pricing, and promotional offers.</p>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 flex shadow-sm transition-colors">
                <button 
                    onClick={() => setActiveTab('PRODUCTS')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'PRODUCTS' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                    Products
                </button>
                <button 
                    onClick={() => setActiveTab('DISCOUNTS')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'DISCOUNTS' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                >
                    Discounts
                </button>
            </div>
            
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors shadow-sm"
            >
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-gray-800">
                  {cart.reduce((acc, item) => acc + item.quantity, 0)}
                </span>
              )}
            </button>

            <button 
              onClick={() => activeTab === 'PRODUCTS' ? setIsModalOpen(true) : openAddDiscountModal()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
            >
              <Plus size={16} />
              {activeTab === 'PRODUCTS' ? 'Add Product' : 'Add Discount'}
            </button>
        </div>
      </div>

      {activeTab === 'PRODUCTS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-20 custom-scrollbar">
          {products.map(product => (
            <div key={product.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all group flex flex-col">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                    <ShoppingBag size={20} />
                  </div>
                  <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full uppercase tracking-wide">
                    {product.billingCycle === 'EVERY_28_DAYS' ? '28 Days' : product.billingCycle}
                  </span>
               </div>
               <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{product.name}</h3>
               <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 h-10 line-clamp-2">{product.description}</p>
               
               {(product.stripeProductId || product.stripePriceId) && (
                 <div className="mb-4 flex flex-wrap gap-1.5">
                    {product.stripeProductId && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 font-mono">
                        <Zap size={10} /> {product.stripeProductId}
                      </span>
                    )}
                    {product.stripePriceId && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 font-mono">
                        <Receipt size={10} /> {product.stripePriceId}
                      </span>
                    )}
                 </div>
               )}

               <div className="mt-auto pt-4 border-t border-gray-50 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">${product.price}</span>
                    <span className="text-sm text-gray-400 dark:text-gray-500 mb-1">/ {product.billingCycle === 'MONTHLY' ? 'mo' : product.billingCycle === 'YEARLY' ? 'yr' : product.billingCycle === 'EVERY_28_DAYS' ? '28d' : 'once'}</span>
                  </div>
                  <button 
                    onClick={() => addToCart(product)}
                    className="p-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-colors"
                    title="Add to Cart"
                  >
                    <Plus size={18} />
                  </button>
               </div>
            </div>
          ))}
          {products.length === 0 && (
             <div className="col-span-full py-12 text-center text-gray-400 dark:text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                 No products added yet.
             </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-20 custom-scrollbar">
           {discounts.map(discount => {
             const isExpired = discount.expiresAt ? new Date(discount.expiresAt) < new Date() : false;
             return (
             <div key={discount.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden group transition-colors relative">
                {user.role === UserRole.ADMIN && (
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button 
                            onClick={() => openEditDiscountModal(discount)}
                            className="p-1.5 bg-white dark:bg-gray-700 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-md shadow-sm border border-gray-200 dark:border-gray-600"
                        >
                            <Edit size={14} />
                        </button>
                        <button 
                            onClick={(e) => handleDelete(e, discount.id)}
                            className="p-1.5 bg-white dark:bg-gray-700 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-md shadow-sm border border-gray-200 dark:border-gray-600"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
                
                <div className={`h-2 w-full ${isExpired ? 'bg-gray-300 dark:bg-gray-600' : discount.type === DiscountType.PERCENTAGE ? 'bg-emerald-500' : discount.type === DiscountType.CONTRACT ? 'bg-blue-600' : discount.type === DiscountType.CUSTOM ? 'bg-gray-800 dark:bg-gray-500' : 'bg-purple-500'}`} />
                <div className={`p-6 ${isExpired ? 'opacity-75 grayscale' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            {discount.type === DiscountType.PERCENTAGE ? (
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full">
                                    <Percent size={18} />
                                </div>
                            ) : discount.type === DiscountType.CONTRACT ? (
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                                    <FileText size={18} />
                                </div>
                            ) : discount.type === DiscountType.CUSTOM ? (
                                <div className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                                    <Shield size={18} />
                                </div>
                            ) : (
                                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
                                    <Clock size={18} />
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {discount.name}
                                    {isExpired && <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded font-bold uppercase">Expired</span>}
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono tracking-wider">{discount.code}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mb-4">
                        <span className={`text-2xl font-bold ${discount.type === DiscountType.PERCENTAGE ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}>
                            {discount.type === DiscountType.PERCENTAGE ? `${discount.value}% OFF` : 
                             discount.type === DiscountType.CONTRACT ? (discount.name.toLowerCase().includes('free') ? `${discount.value} MO FREE` : `${discount.value}% OFF`) :
                             discount.type === DiscountType.CUSTOM ? 'MANUAL' : `+${discount.value} Days`}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {discount.type === DiscountType.CONTRACT ? `${discount.contractTerm} Month Commitment` : 
                             discount.type === DiscountType.CUSTOM ? 'Applied by Manager' :
                             'Discount applied'}
                        </p>
                        {discount.expiresAt && (
                            <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 mt-2 font-medium">
                                <Clock size={12} />
                                <span>Expires: {new Date(discount.expiresAt).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-gray-50 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Applicable Products</p>
                        <div className="flex flex-wrap gap-2">
                            {discount.applicableProductIds.includes('ALL') ? (
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">All Products</span>
                            ) : (
                                discount.applicableProductIds.map(id => {
                                    const prod = products.find(p => p.id === id);
                                    return prod ? (
                                        <span key={id} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">{prod.name}</span>
                                    ) : null;
                                })
                            )}
                        </div>
                    </div>
                </div>
             </div>
           );
           })}
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-end z-50 animate-in fade-in duration-200" onClick={() => setIsCartOpen(false)}>
           <div 
             className="w-full max-w-md bg-white dark:bg-gray-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-100 dark:border-gray-700 transition-colors"
             onClick={e => e.stopPropagation()}
           >
             <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="text-blue-600 dark:text-blue-400" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Cart</h2>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 space-y-4">
                    <ShoppingBag size={48} className="opacity-20" />
                    <p>Your cart is empty.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map(item => {
                        const itemTotal = item.price * item.quantity;
                        const applicableDiscounts = getApplicableDiscounts(item.id);
                        const appliedDiscount = discounts.find(d => d.id === item.appliedDiscountId);
                        const displayPrice = calculateItemPrice(item, appliedDiscount);

                        return (
                          <div key={item.id} className="flex flex-col gap-3 p-4 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl shadow-sm">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-600 rounded-lg flex items-center justify-center shrink-0">
                                <ShoppingBag size={24} className="text-gray-300 dark:text-gray-400" />
                                </div>
                                <div className="flex-1">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{item.name}</h4>
                                    <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                  {item.billingCycle === 'EVERY_28_DAYS' ? '28 Days' : item.billingCycle}
                                </p>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-600 rounded-lg p-1">
                                        <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:bg-white dark:hover:bg-gray-500 rounded-md shadow-sm transition-all text-gray-600 dark:text-gray-300">
                                        <Minus size={14} />
                                        </button>
                                        <span className="text-sm font-medium w-4 text-center text-gray-900 dark:text-gray-100">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:bg-white dark:hover:bg-gray-500 rounded-md shadow-sm transition-all text-gray-600 dark:text-gray-300">
                                        <Plus size={14} />
                                        </button>
                                    </div>
                                    <div className="text-right">
                                        {(appliedDiscount || item.customDiscountValue !== undefined) && (
                                            <span className="block text-xs text-gray-400 dark:text-gray-500 line-through">${itemTotal.toFixed(2)}</span>
                                        )}
                                        <span className="font-bold text-gray-900 dark:text-white">${displayPrice.toFixed(2)}</span>
                                    </div>
                                </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2 pt-3 border-t border-gray-50 dark:border-gray-600">
                                <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-blue-500 dark:text-blue-400" />
                                    <select 
                                        className="flex-1 text-xs bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded px-2 py-1.5 outline-none focus:border-blue-500 text-blue-900 dark:text-blue-100 font-medium"
                                        value={item.contractTerm}
                                        onChange={(e) => updateContractTerm(item.id, e.target.value as any)}
                                    >
                                        <option value="NONE" className="text-gray-900 bg-white">No Commitment (Standard)</option>
                                        <option value="6_MONTHS" className="text-gray-900 bg-white">6 Month Contract</option>
                                        <option value="12_MONTHS" className="text-gray-900 bg-white">12 Month Contract</option>
                                    </select>
                                </div>

                                <div className={`${item.contractTerm !== 'NONE' || item.customDiscountValue !== undefined ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <Tag size={14} className="text-gray-400" />
                                        <select 
                                            className="flex-1 text-xs bg-gray-50 dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded px-2 py-1.5 outline-none focus:border-blue-500 text-gray-700 dark:text-gray-200"
                                            value={item.appliedDiscountId || 'none'}
                                            onChange={(e) => updateItemDiscount(item.id, e.target.value)}
                                            disabled={item.contractTerm !== 'NONE' || !!item.customDiscountValue}
                                        >
                                            <option value="none">
                                                {item.contractTerm !== 'NONE' ? 'Included in Contract' : 'No Promo Code'}
                                            </option>
                                            {applicableDiscounts.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.code} - {d.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                
                                {user.role === UserRole.ADMIN && (
                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-dashed border-gray-200 dark:border-gray-600">
                                        <Shield size={14} className="text-gray-800 dark:text-gray-300" />
                                        <div className="flex items-center gap-2 flex-1">
                                            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Manager Override</span>
                                            {item.customDiscountValue !== undefined ? (
                                                <div className="flex items-center gap-2 ml-auto">
                                                    <span className="text-xs font-bold text-red-600 dark:text-red-400">-${item.customDiscountValue}</span>
                                                    <button onClick={() => applyCustomDiscount(item.id, 0)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"><X size={12}/></button>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={() => {
                                                        const val = prompt('Enter manual discount amount ($):');
                                                        if (val && !isNaN(parseFloat(val))) applyCustomDiscount(item.id, parseFloat(val));
                                                    }}
                                                    className="ml-auto text-[10px] bg-gray-800 dark:bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 dark:hover:bg-gray-500"
                                                >
                                                    Apply Custom
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                          </div>
                        );
                    })}
                  </div>
                )}
             </div>

             {cart.length > 0 && (
               <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <div className="mb-6">
                     <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 block">Promo Code</label>
                     <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="CODE"
                            value={promoCodeInput}
                            onChange={(e) => setPromoCodeInput(e.target.value)}
                        />
                        <button 
                            onClick={applyGlobalCode}
                            className="bg-gray-800 dark:bg-gray-700 text-white px-4 rounded-lg text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                        >
                            Apply
                        </button>
                     </div>
                     {promoError && <p className="text-xs text-red-500 mt-1">{promoError}</p>}
                  </div>

                  <div className="space-y-2 mb-6 text-sm">
                    <div className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {totalDiscount > 0 && (
                         <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
                            <span>Discounts</span>
                            <span>-${totalDiscount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700 text-lg font-bold text-gray-900 dark:text-white">
                        <span>Total</span>
                        <span>${finalTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleOpenCheckout}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <Receipt size={18} />
                    Complete Offer
                  </button>
               </div>
             )}
           </div>
        </div>
      )}

      {/* Checkout & Legal Modal */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] transition-colors">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 rounded-t-2xl">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="text-green-600 dark:text-green-400" />
                        Finalize & Assign Order
                    </h3>
                    <button onClick={() => setIsCheckoutModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Lead Assignment */}
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <label className="block text-sm font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center gap-2">
                            <UserIcon size={16} /> Assign to Customer Account <span className="text-red-500">*</span>
                        </label>
                        <select 
                            required
                            className="w-full rounded-lg border-indigo-200 dark:border-indigo-800 border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            value={selectedLeadId}
                            onChange={(e) => setSelectedLeadId(e.target.value)}
                        >
                            <option value="">-- Choose an Account --</option>
                            {leads.map(lead => (
                                <option key={lead.id} value={lead.id}>{lead.name} ({lead.company})</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-2 italic">A detailed note will be automatically added to this account's history upon completion.</p>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Order Summary</h4>
                        {cart.map((item, idx) => {
                            const discount = item.appliedDiscountId ? discounts.find(d => d.id === item.appliedDiscountId) : undefined;
                            const finalPrice = calculateItemPrice(item, discount);
                            const fullPrice = item.price * item.quantity;
                            return (
                                <div key={`${item.id}-${idx}`} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h5 className="font-bold text-gray-900 dark:text-white text-lg">{item.name} x{item.quantity}</h5>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded uppercase tracking-wide">
                                                    {item.billingCycle}
                                                </span>
                                                {item.contractTerm !== 'NONE' && (
                                                    <span className="text-xs font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded uppercase tracking-wide flex items-center gap-1">
                                                        <FileText size={12} /> {item.contractTerm}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-bold text-gray-900 dark:text-white">${finalPrice.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    {discount && (
                                        <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-lg flex items-start gap-2">
                                            <Tag size={14} className="text-green-600 dark:text-green-400 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold text-green-700 dark:text-green-400">{discount.name} ({discount.code})</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-xl">
                        <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <Mic size={16} /> Verbal Compliance Script (EU/UK GDPR)
                        </h4>
                        <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 text-sm font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed select-text">
                            {complianceScript}
                        </div>
                        <p className="text-[10px] text-amber-700 dark:text-amber-500 mt-2 italic">
                            * Read this verbatim to the customer before proceeding.
                        </p>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Legal Confirmation</h4>
                            <button 
                                onClick={handleSendContract}
                                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                            >
                                <FileText size={14} /> 
                                Send Contract PDF
                            </button>
                        </div>
                        <div className="space-y-4">
                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox" 
                                        className="peer sr-only"
                                        checked={legalAgreements.isBusiness}
                                        onChange={e => setLegalAgreements(prev => ({...prev, isBusiness: e.target.checked}))}
                                    />
                                    <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors"></div>
                                    <Check size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 left-0.5 top-0.5" />
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    <span className="font-semibold text-gray-900 dark:text-white">Purchase for business purposes.</span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox" 
                                        className="peer sr-only"
                                        checked={legalAgreements.autoRenew}
                                        onChange={e => setLegalAgreements(prev => ({...prev, autoRenew: e.target.checked}))}
                                    />
                                    <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors"></div>
                                    <Check size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 left-0.5 top-0.5" />
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    <span className="font-semibold text-gray-900 dark:text-white">Agree to auto-renewal terms.</span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox" 
                                        className="peer sr-only"
                                        checked={legalAgreements.terms}
                                        onChange={e => setLegalAgreements(prev => ({...prev, terms: e.target.checked}))}
                                    />
                                    <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-colors"></div>
                                    <Check size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 left-0.5 top-0.5" />
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                    I agree to the <a href="#" className="text-blue-600 hover:underline">Terms</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-2xl flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-left w-full md:w-auto">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Due Today</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">${finalTotal.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button 
                            onClick={() => setIsCheckoutModalOpen(false)}
                            className="px-6 py-3 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors w-full md:w-auto"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirmCheckout}
                            disabled={!legalAgreements.isBusiness || !legalAgreements.autoRenew || !legalAgreements.terms || isProcessing || !selectedLeadId}
                            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none w-full md:w-auto flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                "Complete Purchase"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Add Product/Discount Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] transition-colors">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 rounded-t-2xl">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    {activeTab === 'PRODUCTS' ? 'Create New Product' : (editingDiscountId ? 'Edit Discount' : 'Create New Discount')}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                  <X size={20} />
                </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
                {activeTab === 'PRODUCTS' ? (
                    <form id="productForm" onSubmit={handleProductSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
                            <input required type="text" className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="e.g. Pro Plan" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea required className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" rows={3} value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} placeholder="Describe features..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">$</span>
                                    <input required type="number" min="0" step="0.01" className="w-full rounded-lg border-gray-300 dark:border-gray-600 border pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Billing Cycle</label>
                                <select className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={newProduct.billingCycle} onChange={e => setNewProduct({...newProduct, billingCycle: e.target.value})}>
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="YEARLY">Yearly</option>
                                    <option value="EVERY_28_DAYS">Every 28 Days</option>
                                    <option value="ONE_TIME">One Time</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 rounded-xl space-y-3">
                           <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
                              <Zap size={14} /> Stripe Integration (Optional)
                           </div>
                           <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Stripe Product ID</label>
                                <input 
                                  type="text" 
                                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-1.5 text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                                  value={newProduct.stripeProductId} 
                                  onChange={e => setNewProduct({...newProduct, stripeProductId: e.target.value})} 
                                  placeholder="prod_..."
                                />
                              </div>
                           </div>
                        </div>
                    </form>
                ) : (
                    <form id="discountForm" onSubmit={handleDiscountSubmit} className="space-y-4">
                         <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount Type</label>
                             <div className="grid grid-cols-2 gap-2 mb-4">
                                {[
                                    { id: DiscountType.PERCENTAGE, label: 'Promo Code' },
                                    { id: DiscountType.TRIAL_EXTENSION, label: 'Trial Extension' },
                                    { id: DiscountType.CONTRACT, label: 'Contract Deal' },
                                    { id: DiscountType.CUSTOM, label: 'Manager Custom' }
                                ].map(t => (
                                    <button 
                                        key={t.id}
                                        type="button"
                                        onClick={() => setDiscountForm({...discountForm, type: t.id})}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${discountForm.type === t.id ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                             </div>
                         </div>

                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Offer Name</label>
                            <input required type="text" className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={discountForm.name} onChange={e => setDiscountForm({...discountForm, name: e.target.value})} placeholder="e.g. Black Friday Deal" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount Code</label>
                            <input required type="text" className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono uppercase bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={discountForm.code} onChange={e => setDiscountForm({...discountForm, code: e.target.value.toUpperCase()})} placeholder="e.g. SAVE20" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value</label>
                                <input required type="number" min="1" className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={discountForm.value} onChange={e => setDiscountForm({...discountForm, value: e.target.value})} />
                            </div>
                        </div>
                    </form>
                )}
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3 rounded-b-2xl">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    Cancel
                </button>
                <button type="submit" form={activeTab === 'PRODUCTS' ? 'productForm' : 'discountForm'} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 rounded-lg transition-colors shadow-sm">
                    {activeTab === 'PRODUCTS' ? 'Save Product' : 'Save Offer'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
