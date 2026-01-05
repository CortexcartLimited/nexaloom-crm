
import React, { useState } from 'react';
import { Proposal, ProposalItem, ProposalStatus, Lead, Product, User, Interaction } from '../types';
import { api } from '../services/api';
import { ScrollText, Plus, User as UserIcon, Calendar, CheckCircle, FileText, Download, Send, Eye, X, Edit, Trash2, ArrowRight } from 'lucide-react';

interface ProposalsViewProps {
    proposals: Proposal[];
    leads: Lead[];
    products: Product[];
    user: User;
    onAddProposal: (proposal: Proposal) => Promise<Proposal>;
    onUpdateProposal: (id: string, updates: Partial<Proposal>) => Promise<void>;
    onDeleteProposal: (id: string) => Promise<void>;
    onAddInteraction: (interaction: Interaction) => Promise<void>;
}

export const ProposalsView: React.FC<ProposalsViewProps> = ({ proposals, leads, products, user, onAddProposal, onUpdateProposal, onDeleteProposal, onAddInteraction }) => {
    const [view, setView] = useState<'LIST' | 'BUILDER'>('LIST');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingProposal, setEditingProposal] = useState<Partial<Proposal> | null>(null);
    // New state for file attachments
    const [availableDocuments, setAvailableDocuments] = useState<{ id: string, name: string }[]>([]);
    const [attachedDocIds, setAttachedDocIds] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [builderStep, setBuilderStep] = useState(1);
    const [activeProposal, setActiveProposal] = useState<Partial<Proposal>>({
        items: [],
        name: 'New Proposal',
        totalValue: 0,
        status: ProposalStatus.DRAFT,
        validUntil: new Date(Date.now() + 1209600000).toISOString().split('T')[0], // 14 days
        terms: 'Payment due within 14 days of invoice. All services are subject to standard SLA.'
    });

    const [selectedLeadId, setSelectedLeadId] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');

    const calculateTotal = (items: ProposalItem[]) => {
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const handleStartBuilder = () => {
        setActiveProposal({
            items: [],
            name: 'New Proposal',
            totalValue: 0,
            status: ProposalStatus.DRAFT,
            validUntil: new Date(Date.now() + 1209600000).toISOString().split('T')[0],
            terms: 'Payment due within 14 days of invoice. All services are subject to standard SLA.'
        });
        setSelectedLeadId('');
        setBuilderStep(1);
        setView('BUILDER');
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

        const updatedItems = [...(activeProposal.items || []), newItem];
        setActiveProposal({
            ...activeProposal,
            items: updatedItems,
            totalValue: calculateTotal(updatedItems)
        });
        setSelectedProductId('');
    };

    const handleRemoveItem = (itemId: string) => {
        const updatedItems = (activeProposal.items || []).filter(i => i.id !== itemId);
        setActiveProposal({
            ...activeProposal,
            items: updatedItems,
            totalValue: calculateTotal(updatedItems)
        });
    };

    const handleViewProposal = async (id: string) => {
        try {
            // Fetch proposal details and available documents
            const [proposal, docs] = await Promise.all([
                api.getProposal(id),
                api.getDocuments(user.tenantId)
            ]);

            setEditingProposal(proposal);
            setAvailableDocuments(docs as any[]); // Type cast if needed depending on return type
            setAttachedDocIds(proposal.files ? proposal.files.map((f: any) => f.id) : []);
            setIsDrawerOpen(true);
        } catch (error) {
            console.error("Failed to fetch data", error);
            // Fallback
            const found = proposals.find(p => p.id === id);
            if (found) {
                setEditingProposal({ ...found });
                setAttachedDocIds([]);
                setIsDrawerOpen(true);
            }
        }
    };

    const handleSaveProposal = async () => {
        if (!selectedLeadId) {
            alert('Please select a lead first.');
            return;
        }
        const lead = leads.find(l => l.id === selectedLeadId);
        if (!lead) return;

        const proposal: Proposal = {
            id: `prop-${Date.now()}`,
            tenantId: user.tenantId,
            name: activeProposal.name || 'Untitled Proposal',
            leadId: lead.id,
            leadName: lead.name,
            leadCompany: lead.company,
            items: activeProposal.items || [],
            totalValue: activeProposal.totalValue || 0,
            status: ProposalStatus.DRAFT,
            validUntil: activeProposal.validUntil || '',
            terms: activeProposal.terms,
            createdAt: new Date().toISOString(),
            createdBy: user.name
        };

        console.log('Saving Proposal:', proposal);

        // Capture the server-returned proposal (with real integer ID)
        const savedProposal = await onAddProposal(proposal);

        // Switch to List view, but then open the Drawer for the new proposal
        setView('LIST');

        // Immediately view the new proposal so user can attach files/send email
        if (savedProposal && savedProposal.id) {
            await handleViewProposal(savedProposal.id.toString());
        }
    };

    const handleUpdateActiveProposal = async () => {
        if (!editingProposal || !editingProposal.id) return;

        await onUpdateProposal(editingProposal.id, editingProposal);

        // Save file attachments
        if (attachedDocIds) {
            try {
                await api.updateProposalFiles(editingProposal.id, attachedDocIds);
            } catch (e) {
                console.error("Failed to save attachments", e);
            }
        }

        setIsDrawerOpen(false);
        setEditingProposal(null);
    };

    const handleSendProposal = async (proposalId: string) => {
        setIsSending(true);
        try {
            await api.sendProposal(proposalId);
            await onUpdateProposal(proposalId, { status: ProposalStatus.SENT });

            // Update local state if editing
            if (editingProposal && editingProposal.id === proposalId) {
                setEditingProposal({ ...editingProposal, status: ProposalStatus.SENT });
            }

            const proposal = proposals.find(p => p.id === proposalId);
            if (proposal) {
                // Log interaction handled by backend now, but we can do UI alert
                alert('Proposal sent successfully!');
            }
        } catch (error) {
            console.error("Failed to send proposal", error);
            alert("Failed to send proposal. Please check server logs.");
        } finally {
            setIsSending(false);
        }
    };

    const getStatusColor = (status: ProposalStatus) => {
        switch (status) {
            case ProposalStatus.DRAFT: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
            case ProposalStatus.SENT: return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
            case ProposalStatus.VIEWED: return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
            case ProposalStatus.ACCEPTED: return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
            case ProposalStatus.DECLINED: return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
        }
    };

    if (view === 'BUILDER') {
        const selectedLead = leads.find(l => l.id === selectedLeadId);

        return (
            <div className="h-full flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900">
                {/* Editor Pane */}
                <div className="w-full md:w-1/2 lg:w-5/12 p-6 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full bg-white dark:bg-gray-800 overflow-y-auto">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Proposal Builder</h2>
                        <button onClick={() => setView('LIST')} className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            Cancel
                        </button>
                    </div>

                    <div className="space-y-6 flex-1">
                        {/* Section 1: Lead Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">1. Recipient Details</h3>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Proposal Name</label>
                                <input
                                    type="text"
                                    className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={activeProposal.name || ''}
                                    onChange={(e) => setActiveProposal({ ...activeProposal, name: e.target.value })}
                                    placeholder="e.g. Q3 Marketing Services"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Lead</label>
                                <select
                                    className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={selectedLeadId}
                                    onChange={(e) => setSelectedLeadId(e.target.value)}
                                >
                                    <option value="">-- Choose Customer --</option>
                                    {leads.map(l => (
                                        <option key={l.id} value={l.id}>{l.name} - {l.company}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Valid Until</label>
                                <input
                                    type="date"
                                    className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={activeProposal.validUntil}
                                    onChange={(e) => setActiveProposal({ ...activeProposal, validUntil: e.target.value })}
                                />
                            </div>
                        </div>

                        <hr className="border-gray-100 dark:border-gray-700" />

                        {/* Section 2: Items */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">2. Line Items</h3>
                            <div className="flex gap-2">
                                <select
                                    className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                >
                                    <option value="">-- Add Product --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                                    ))}
                                </select>
                                <button
                                    onClick={handleAddItem}
                                    disabled={!selectedProductId}
                                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            <div className="space-y-2">
                                {activeProposal.items?.map((item, idx) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div>
                                            <p className="font-medium text-sm text-gray-900 dark:text-white">{item.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">${Number(item.price || 0).toFixed(2)} x {item.quantity}</p>
                                        </div>
                                        <button onClick={() => handleRemoveItem(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {(!activeProposal.items || activeProposal.items.length === 0) && (
                                    <p className="text-sm text-gray-400 italic text-center py-4">No items added yet.</p>
                                )}
                            </div>
                        </div>

                        <hr className="border-gray-100 dark:border-gray-700" />

                        {/* Section 3: Terms */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">3. Terms & Conditions</h3>
                            <textarea
                                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm h-24 resize-none"
                                value={activeProposal.terms}
                                onChange={(e) => setActiveProposal({ ...activeProposal, terms: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700 mt-4 flex justify-end gap-3">
                        <button
                            onClick={handleSaveProposal}
                            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md transition-colors"
                        >
                            <CheckCircle size={18} />
                            Save Proposal
                        </button>
                    </div>
                </div>

                {/* Preview Pane */}
                <div className="w-full md:w-1/2 lg:w-7/12 bg-gray-100 dark:bg-gray-950 p-8 flex items-center justify-center overflow-auto">
                    <div className="bg-white text-gray-900 w-full max-w-[210mm] min-h-[297mm] shadow-2xl p-12 flex flex-col relative text-[12px] md:text-[14px]">
                        {/* Document Header */}
                        <div className="flex justify-between items-start mb-12 border-b border-gray-200 pb-8">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">PROPOSAL</h1>
                                <p className="text-xl font-medium text-gray-600 mt-2">{activeProposal.name}</p>
                                <p className="text-gray-500 mt-1">#{Date.now().toString().slice(-6)}</p>
                            </div>
                            <div className="text-right">
                                <h3 className="font-bold text-lg">Nexaloom Inc.</h3>
                                <p className="text-gray-500">123 Tech Boulevard</p>
                                <p className="text-gray-500">San Francisco, CA 94105</p>
                                <p className="text-blue-600 mt-1">billing@nexaloom.com</p>
                            </div>
                        </div>

                        {/* Recipient */}
                        <div className="flex justify-between mb-12">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Prepared For</p>
                                {selectedLead ? (
                                    <>
                                        <p className="font-bold text-lg">{selectedLead.name}</p>
                                        <p className="text-gray-600">{selectedLead.company}</p>
                                        <p className="text-gray-500">{selectedLead.email}</p>
                                    </>
                                ) : (
                                    <p className="text-gray-300 italic">[Select a Lead]</p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Details</p>
                                <p><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date().toLocaleDateString()}</span></p>
                                <p><span className="text-gray-500">Valid Until:</span> <span className="font-medium">{new Date(activeProposal.validUntil || '').toLocaleDateString()}</span></p>
                                <p><span className="text-gray-500">Prepared By:</span> <span className="font-medium">{user.name}</span></p>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="mb-8">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b-2 border-gray-800">
                                        <th className="py-3 font-bold uppercase text-xs tracking-wider">Description</th>
                                        <th className="py-3 font-bold uppercase text-xs tracking-wider text-center w-24">Qty</th>
                                        <th className="py-3 font-bold uppercase text-xs tracking-wider text-right w-32">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeProposal.items?.map(item => (
                                        <tr key={item.id} className="border-b border-gray-100">
                                            <td className="py-4">
                                                <p className="font-bold">{item.name}</p>
                                                <p className="text-gray-500 text-xs mt-1">{item.description}</p>
                                            </td>
                                            <td className="py-4 text-center">{item.quantity}</td>
                                            <td className="py-4 text-right">${(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {(!activeProposal.items || activeProposal.items.length === 0) && (
                                        <tr>
                                            <td colSpan={3} className="py-8 text-center text-gray-300 italic">No items included yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex justify-end mb-12">
                            <div className="w-64 space-y-2">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>${Number(activeProposal.totalValue || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Tax (0%)</span>
                                    <span>$0.00</span>
                                </div>
                                <div className="flex justify-between font-bold text-xl pt-4 border-t border-gray-200">
                                    <span>Total</span>
                                    <span>${Number(activeProposal.totalValue || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Terms */}
                        <div className="mb-12">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Terms & Conditions</p>
                            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{activeProposal.terms}</p>
                        </div>

                        {/* Footer */}
                        <div className="mt-auto border-t border-gray-200 pt-8 flex justify-between items-end">
                            <div className="text-center">
                                <div className="w-48 border-b border-gray-300 mb-2"></div>
                                <p className="text-xs text-gray-400 uppercase">Authorized Signature</p>
                            </div>
                            <p className="text-gray-400 text-xs italic">Generated by Nexaloom CPQ</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // LIST VIEW
    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Proposals & Quotes</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and send official quotes to your leads.</p>
                </div>
                <button
                    onClick={handleStartBuilder}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-bold"
                >
                    <Plus size={18} />
                    Create Proposal
                </button>
            </div>

            {proposals.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 overflow-y-auto custom-scrollbar">
                    {proposals.map(prop => (
                        <div key={prop.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center shrink-0">
                                    <ScrollText size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                        {prop.name}
                                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-bold ${getStatusColor(prop.status)}`}>
                                            {prop.status}
                                        </span>
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{prop.leadCompany}</p>
                                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        <span className="flex items-center gap-1"><UserIcon size={12} /> {prop.leadName}</span>
                                        <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(prop.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">${Number(prop.totalValue || 0).toFixed(2)}</span>
                                <span className="text-xs text-gray-400">Total Value</span>
                            </div>

                            <div className="flex items-center gap-2 border-l border-gray-100 dark:border-gray-700 pl-6">
                                <button
                                    onClick={() => handleViewProposal(prop.id)}
                                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title="View & Edit"
                                >
                                    <Eye size={18} />
                                </button>
                                {prop.status === ProposalStatus.DRAFT && (
                                    <button
                                        onClick={() => handleSendProposal(prop.id)}
                                        className="p-2 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        title="Send to Client"
                                    >
                                        <Send size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={() => onDeleteProposal(prop.id)}
                                    className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <ScrollText size={48} className="opacity-20 mb-4" />
                    <p className="font-medium">No proposals generated yet.</p>
                    <p className="text-sm">Click 'Create Proposal' to start your first quote.</p>
                </div>
            )}
            {/* Slide-out Drawer */}
            {isDrawerOpen && editingProposal && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>

                    {/* Drawer */}
                    <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 sticky top-0 z-10 backdrop-blur">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Proposal</h2>
                                <p className="text-sm text-gray-500">#{editingProposal.id?.substring(0, 8)}</p>
                            </div>
                            <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-8 flex-1">
                            {/* Drawer Content - Reusing Builder Inputs */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Details</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Proposal Name</label>
                                    <input
                                        type="text"
                                        className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={editingProposal.name || ''}
                                        onChange={(e) => setEditingProposal({ ...editingProposal, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Valid Until</label>
                                        <input
                                            type="date"
                                            className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={typeof editingProposal.validUntil === 'string' ? editingProposal.validUntil.split('T')[0] : ''}
                                            onChange={(e) => setEditingProposal({ ...editingProposal, validUntil: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                                        <select
                                            className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={editingProposal.status}
                                            onChange={(e) => setEditingProposal({ ...editingProposal, status: e.target.value as ProposalStatus })}
                                        >
                                            {Object.values(ProposalStatus).map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Line Items</h3>
                                {/* Add Item Logic for Drawer */}
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        value={selectedProductId}
                                        onChange={(e) => setSelectedProductId(e.target.value)}
                                    >
                                        <option value="">-- Add Product --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => {
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
                                            const updatedItems = [...(editingProposal.items || []), newItem];
                                            setEditingProposal({ ...editingProposal, items: updatedItems, totalValue: calculateTotal(updatedItems) });
                                            setSelectedProductId('');
                                        }}
                                        disabled={!selectedProductId}
                                        className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        <Plus size={20} />
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {editingProposal.items?.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <div>
                                                <p className="font-medium text-sm text-gray-900 dark:text-white">{item.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">${Number(item.price || 0).toFixed(2)} x {item.quantity}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const updatedItems = (editingProposal.items || []).filter(i => i.id !== item.id);
                                                    setEditingProposal({ ...editingProposal, items: updatedItems, totalValue: calculateTotal(updatedItems) });
                                                }}
                                                className="text-gray-400 hover:text-red-500 p-1"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Terms</h3>
                                <textarea
                                    className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm h-24 resize-none"
                                    value={editingProposal.terms}
                                    onChange={(e) => setEditingProposal({ ...editingProposal, terms: e.target.value })}
                                />
                            </div>

                            {/* File Attachments Section */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold uppercase text-gray-400 dark:text-gray-500 tracking-wider">Attachments</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Documents</label>
                                    <select
                                        className="w-full p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val && !attachedDocIds.includes(val)) {
                                                setAttachedDocIds([...attachedDocIds, val]);
                                            }
                                        }}
                                        value=""
                                    >
                                        <option value="">-- Add Attachment --</option>
                                        {availableDocuments.map(doc => (
                                            <option key={doc.id} value={doc.id} disabled={attachedDocIds.includes(doc.id)}>
                                                {doc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    {attachedDocIds.map(docId => {
                                        const doc = availableDocuments.find(d => d.id === docId) || editingProposal.files?.find(f => f.id === docId);
                                        return (
                                            <div key={docId} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={16} className="text-blue-500" />
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{doc?.name || 'Unknown Document'}</span>
                                                </div>
                                                <button
                                                    onClick={() => setAttachedDocIds(attachedDocIds.filter(id => id !== docId))}
                                                    className="text-gray-400 hover:text-red-500 p-1"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {attachedDocIds.length === 0 && (
                                        <p className="text-sm text-gray-400 italic">No documents attached.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 sticky bottom-0 z-10 backdrop-blur flex justify-between items-center gap-3">
                            <div>
                                {editingProposal.status !== ProposalStatus.SENT && editingProposal.status !== ProposalStatus.ACCEPTED && (
                                    <button
                                        onClick={() => handleSendProposal(editingProposal.id!)}
                                        disabled={isSending}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Send size={16} />
                                        {isSending ? 'Sending...' : 'Send to Client'}
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsDrawerOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium">Cancel</button>
                                <button onClick={handleUpdateActiveProposal} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">Update Proposal</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
