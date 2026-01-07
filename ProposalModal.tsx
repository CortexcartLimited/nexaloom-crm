import React, { useState, useEffect, useMemo } from 'react';
import { Proposal, ProposalItem, ProposalStatus, Lead, Product, User } from './types'; // Assuming types are in sibling types.ts
import { formatCurrency } from './utils/formatCurrency';
import { taxRules } from './utils/taxRates';
import { Plus, Trash2, X, CheckCircle, FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // Assuming uuid is available or I can use Date.now() fallback

interface ProposalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (proposal: Proposal) => Promise<void>;
    leads: Lead[];
    products: Product[];
    user: User;
    initialProposal?: Partial<Proposal> | null;
}

export const ProposalModal: React.FC<ProposalModalProps> = ({
    isOpen, onClose, onSave, leads, products, user, initialProposal
}) => {
    const [selectedLeadId, setSelectedLeadId] = useState('');
    const [currency, setCurrency] = useState('GBP');
    const [items, setItems] = useState<ProposalItem[]>([]);
    const [name, setName] = useState('New Proposal');
    const [validUntil, setValidUntil] = useState(new Date(Date.now() + 1209600000).toISOString().split('T')[0]);
    const [terms, setTerms] = useState('Payment due within 14 days of invoice. All services are subject to standard SLA.');
    const [status, setStatus] = useState<ProposalStatus>(ProposalStatus.DRAFT);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Tax State
    const [isTaxEnabled, setIsTaxEnabled] = useState(false);
    const [taxRate, setTaxRate] = useState(0);
    const [taxLabel, setTaxLabel] = useState('Tax');

    // Initialize state when modal opens or initialProposal changes
    useEffect(() => {
        if (isOpen) {
            if (initialProposal) {
                // Editing existing proposal
                setName(initialProposal.name || 'Untitled Proposal');
                setItems(initialProposal.items || []);
                setSelectedLeadId(initialProposal.leadId || '');
                setValidUntil(initialProposal.validUntil ?
                    (typeof initialProposal.validUntil === 'string' ? initialProposal.validUntil.split('T')[0] : '')
                    : new Date(Date.now() + 1209600000).toISOString().split('T')[0]
                );
                setTerms(initialProposal.terms || '');
                setStatus(initialProposal.status || ProposalStatus.DRAFT);
                setCurrency(initialProposal.currency || 'GBP');
                setTaxRate(initialProposal.taxRate || 0);
                setIsTaxEnabled(!!initialProposal.isTaxEnabled);

                // Try to recover label from lead if possible, otherwise default
                if (initialProposal.leadId) {
                    const lead = leads.find(l => l.id === initialProposal.leadId);
                    if (lead && lead.country && taxRules[lead.country]) {
                        setTaxLabel(taxRules[lead.country].label);
                    } else {
                        setTaxLabel('Tax');
                    }
                }
            } else {
                // Creating new proposal
                resetForm();
            }
        }
    }, [isOpen, initialProposal]);

    // DYNAMIC CURRENCY LOGIC
    // Watch for changes in the selected lead
    useEffect(() => {
        if (selectedLeadId) {
            const lead = leads.find(l => l.id === selectedLeadId);
            if (lead) {
                // If we are creating a NEW proposal (no initialProposal), OR if we want to enforce lead currency always
                // The prompt says: "When a lead is selected... Update the local currency state"
                // It's safer to only override if it's not an explicit edit of an existing proposal with a fixed currency,
                // BUT usually changing the lead acts as a "reset" or specific selection action.
                // If editing, usually lead is locked or pre-set. If user changes lead, we SHOULD update currency.
                setCurrency(lead.currency || 'GBP');

                // Auto-Set Tax based on Country
                // Auto-Set Tax based on Country & Tax ID (Reverse Charge Logic)
                const isInternationalB2B = lead.taxId && lead.country !== 'United Kingdom'; // Assuming UK tenant base

                if (isInternationalB2B) {
                    // Reverse Charge: Tax Enabled = OFF
                    // We still set the rate/label so if they toggle it ON manually, it's correct
                    if (lead.country && taxRules[lead.country]) {
                        setTaxRate(taxRules[lead.country].rate);
                        setTaxLabel(taxRules[lead.country].label);
                    }
                    setIsTaxEnabled(false);
                } else if (lead.country && taxRules[lead.country]) {
                    // Standard Domestic or Consumer Logic
                    const rule = taxRules[lead.country];
                    setTaxRate(rule.rate);
                    setTaxLabel(rule.label);
                    setIsTaxEnabled(rule.rate > 0);
                } else {
                    // Default fallback
                    setTaxRate(0);
                    setTaxLabel('Tax');
                    setIsTaxEnabled(false);
                }
            }
        }
    }, [selectedLeadId, leads]);

    const resetForm = () => {
        setName('New Proposal');
        setItems([]);
        setSelectedLeadId('');
        setCurrency('GBP');
        setStatus(ProposalStatus.DRAFT);
        setTerms('Payment due within 14 days of invoice. All services are subject to standard SLA.');
        setValidUntil(new Date(Date.now() + 1209600000).toISOString().split('T')[0]);
        setTaxRate(0);
        setTaxLabel('Tax');
        setIsTaxEnabled(false);
    };

    const calculateTotals = (currentItems: ProposalItem[]) => {
        const subTotal = currentItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const taxAmount = isTaxEnabled ? subTotal * (taxRate / 100) : 0;
        const total = subTotal + taxAmount;
        return { subTotal, taxAmount, total };
    };

    const handleAddItem = () => {
        if (!selectedProductId) return;
        const product = products.find(p => p.id === selectedProductId);
        if (!product) return;

        const newItem: ProposalItem = {
            id: `item-${Date.now()}`,
            productId: product.id,
            name: product.name,
            quantity: 1,
            price: product.price,
            description: product.description
        };

        setItems([...items, newItem]);
        setSelectedProductId('');
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleSave = async () => {
        if (!selectedLeadId) {
            alert("Please select a lead.");
            return;
        }
        const lead = leads.find(l => l.id === selectedLeadId);
        if (!lead) return;

        setIsSaving(true);
        try {
            const { total } = calculateTotals(items);
            const { taxAmount } = calculateTotals(items); // Recalculate based on current state

            const proposalPayload: Proposal = {
                id: initialProposal?.id || `prop-${Date.now()}`,
                tenantId: user.tenantId,
                name,
                leadId: lead.id,
                leadName: lead.name,
                leadCompany: lead.company,
                items,
                totalValue: total,
                taxRate: isTaxEnabled ? taxRate : 0,
                taxAmount: isTaxEnabled ? taxAmount : 0,
                isTaxEnabled,
                status,
                validUntil,
                terms,
                currency,
                createdAt: initialProposal?.createdAt || new Date().toISOString(),
                createdBy: user.name,
                files: initialProposal?.files
            };

            await onSave(proposalPayload);
            onClose();
        } catch (error) {
            console.error("Failed to save proposal", error);
            alert("Failed to save proposal.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const { subTotal, taxAmount, total } = calculateTotals(items);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {initialProposal ? 'Edit Proposal' : 'Create Proposal'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* Header Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Proposal Name</label>
                            <input
                                type="text"
                                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Website Redesign"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer</label>
                            <select
                                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={selectedLeadId}
                                onChange={(e) => setSelectedLeadId(e.target.value)}
                            >
                                <option value="">-- Select Customer --</option>
                                {leads.map(l => (
                                    <option key={l.id} value={l.id}>{l.name} - {l.company}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Valid Until</label>
                            <input
                                type="date"
                                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={validUntil}
                                onChange={(e) => setValidUntil(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                            <select
                                className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as ProposalStatus)}
                            >
                                {Object.values(ProposalStatus).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Currency</label>
                            <div className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed">
                                {currency} (Auto-set from Lead)
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100 dark:border-gray-700" />

                    {/* Line Items */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Line Items</h3>
                        </div>

                        <div className="flex gap-2 mb-4">
                            <select
                                className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                            >
                                <option value="">-- Add Product --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({formatCurrency(p.price, currency)}) {/* Dynamic Price Display */}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddItem}
                                disabled={!selectedProductId}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        <div className="space-y-2 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 min-h-[100px]">
                            {items.length === 0 ? (
                                <p className="text-gray-400 text-center italic text-sm py-2">No items added.</p>
                            ) : (
                                items.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                        <div>
                                            <p className="font-medium text-sm text-gray-900 dark:text-white">{item.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatCurrency(item.price, currency)} x {item.quantity}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(item.price * item.quantity, currency)}
                                            </span>
                                            <button onClick={() => handleRemoveItem(item.id)} className="text-gray-400 hover:text-red-500 p-1 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex justify-end mt-4">
                            <div className="w-1/2 md:w-1/3 text-right space-y-2">
                                <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(subTotal, currency)}</span>
                                </div>

                                <div className="flex items-center justify-end gap-2 my-2">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            className={`${isTaxEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'} relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                                            role="switch"
                                            aria-checked={isTaxEnabled}
                                            onClick={() => setIsTaxEnabled(!isTaxEnabled)}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`${isTaxEnabled ? 'translate-x-4' : 'translate-x-0'} pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                            />
                                        </button>
                                        <label className="text-xs text-gray-500 dark:text-gray-400 select-none cursor-pointer" onClick={() => setIsTaxEnabled(!isTaxEnabled)}>
                                            Apply {taxLabel}
                                        </label>
                                    </div>

                                    {isTaxEnabled && (
                                        <div className="flex items-center gap-1 ml-4">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={taxRate}
                                                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                                className="w-16 p-1 text-right text-xs border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                                            />
                                            <span className="text-xs text-gray-500">%</span>
                                        </div>
                                    )}
                                </div>

                                {isTaxEnabled && (
                                    <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                                        <span>{taxLabel} ({taxRate}%):</span>
                                        <span>{formatCurrency(taxAmount, currency)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center text-xl font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <span>Total:</span>
                                    <span>{formatCurrency(total, currency)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-gray-100 dark:border-gray-700" />

                    {/* Terms */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Terms & Conditions</label>
                        <textarea
                            className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm h-24 resize-none"
                            value={terms}
                            onChange={(e) => setTerms(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Saving...' : (
                            <>
                                <CheckCircle size={18} />
                                Save Proposal
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};