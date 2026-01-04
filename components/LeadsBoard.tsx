import React, { useState } from 'react';
import { Lead, LeadStatus, Document } from '../types';
import { 
  MoreHorizontal, Plus, Sparkles, MessageSquare, X, Wand2, Upload, 
  FileSpreadsheet, AlertCircle, ArrowRight, CheckCircle, ArrowLeft, 
  User, DollarSign, Building, Mail, Phone, Copy, Paperclip, File, Search 
} from 'lucide-react';
import { generateEmailDraft, analyzeLeadPotential } from '../services/geminiService';

interface LeadsBoardProps {
  leads: Lead[];
  documents?: Document[];
  products: any[];
  onStatusChange: (id: string, newStatus: LeadStatus) => void;
  onAddLead: (leadData?: Partial<Lead>) => Promise<void>;
  onAddLeads: (leads: Omit<Lead, 'id' | 'tenantId' | 'status' | 'createdAt' | 'value'>[]) => Promise<void>;
  onOpenDialer: (phone?: string, leadId?: string) => void;
}

const COLUMNS = Object.values(LeadStatus);

// Price Logic Configuration
const PRODUCT_PRICES: Record<string, number> = {
  'Basic': 1000,
  'Premium': 5000,
  'Enterprise': 15000
};

export const LeadsBoard: React.FC<LeadsBoardProps> = ({ 
  leads, onStatusChange, onAddLead, onAddLeads, documents = [], onOpenDialer 
}) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalMode, setModalMode] = useState<'EMAIL' | 'ANALYSIS' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const [emailContext, setEmailContext] = useState('Schedule a discovery call');
  const [aiAnalysis, setAiAnalysis] = useState<{score: number, reasoning: string} | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Added productId and discount to state
  const [newLeadData, setNewLeadData] = useState<Partial<Lead & { productId: string, discount: number }>>({ 
    name: '', company: '', email: '', phone: '', value: 0, status: LeadStatus.NEW, productId: 'Basic', discount: 0
  });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('leadId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('leadId') || draggedId;
    if (id) onStatusChange(id, status);
    setDraggedId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleOpenEmail = (lead: Lead) => {
    setSelectedLead(lead);
    setModalMode('EMAIL');
    setAiDraft('');
  };

  const handleGenerateDraft = async () => {
    if (!selectedLead) return;
    setIsGenerating(true);
    const draft = await generateEmailDraft(selectedLead, emailContext);
    setAiDraft(draft);
    setIsGenerating(false);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate final value based on selection
    const basePrice = PRODUCT_PRICES[newLeadData.productId || 'Basic'] || 0;
    const discountAmount = newLeadData.discount || 0;
    const calculatedValue = Math.max(0, basePrice - discountAmount);

    await onAddLead({
      ...newLeadData,
      value: calculatedValue
    });

    setIsAddModalOpen(false);
    setNewLeadData({ name: '', company: '', email: '', phone: '', value: 0, status: LeadStatus.NEW, productId: 'Basic', discount: 0 });
  };

  const handleOpenAnalysis = async (lead: Lead) => {
    setSelectedLead(lead);
    setModalMode('ANALYSIS');
    setIsGenerating(true);
    setAiAnalysis(null);
    try {
      const analysis = await analyzeLeadPotential(lead, []); 
      setAiAnalysis(analysis);
    } catch (error) {
      setAiAnalysis({ score: 0, reasoning: "Analysis unavailable." });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Pipeline</h2>
        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Plus size={18} /> New Lead
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 h-full custom-scrollbar">
        {COLUMNS.map((status) => {
          // IMPORTANT: Calculation must happen INSIDE the map for each column
          const columnLeads = leads.filter(l => l.status === status);
          const totalValue = columnLeads.reduce((sum, lead) => sum + (Number(lead.value) || 0), 0);

          return (
            <div 
              key={status} 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
              className="flex-shrink-0 w-80 bg-gray-50/50 dark:bg-gray-800/40 rounded-xl p-3 flex flex-col h-full border border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-center mb-1 px-2 shrink-0">
                <span className="font-bold text-gray-500 dark:text-gray-400 text-[10px] uppercase tracking-widest">{status}</span>
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {columnLeads.length}
                </span>
              </div>
              <div className="px-2 mb-4">
                <span className="text-lg font-black text-gray-900 dark:text-white">
                  ${totalValue.toLocaleString()}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 p-1 rounded-lg min-h-[150px]">
                {columnLeads.map((lead) => (
                  <div 
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:border-blue-300 dark:hover:border-blue-700 transition-all group ${draggedId === lead.id ? 'opacity-40' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-gray-900 dark:text-white text-sm truncate pr-2">{lead.company}</span>
                      <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal size={14} /></button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{lead.name}</p>
                    <div className="flex justify-between items-center pt-3 border-t border-gray-50 dark:border-gray-700/50">
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                        ${(Number(lead.value) || 0).toLocaleString()}
                      </span>
                      <div className="flex gap-1">
                          <button onClick={() => onOpenDialer(lead.phone, lead.id)} className="p-1.5 text-gray-400 hover:text-green-500"><Phone size={14} /></button>
                          <button onClick={() => handleOpenAnalysis(lead)} className="p-1.5 text-gray-400 hover:text-purple-500"><Sparkles size={14} /></button>
                          <button onClick={() => handleOpenEmail(lead)} className="p-1.5 text-gray-400 hover:text-blue-500"><Wand2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2"><User size={18} className="text-blue-500" /> New Lead</h3>
                    <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <select 
    className="..."
    value={newLeadData.productId}
    onChange={e => {
        const selectedProd = products.find(p => p.id === e.target.value);
        setNewLeadData({
            ...newLeadData, 
            productId: e.target.value,
            // Automatically set the value if product is found
            value: selectedProd ? selectedProd.price : 0 
        });
    }}
>
    <option value="">-- Select from Catalog --</option>
    {products.map(prod => (
        <option key={prod.id} value={prod.id}>
            {prod.name} (${prod.price})
        </option>
    ))}
</select>
                <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
                    <div className="space-y-3">
                        <input required type="text" className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" value={newLeadData.name} onChange={e => setNewLeadData({...newLeadData, name: e.target.value})} placeholder="Prospect Name" />
                        <input type="text" className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" value={newLeadData.company} onChange={e => setNewLeadData({...newLeadData, company: e.target.value})} placeholder="Company Name" />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="email" className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" value={newLeadData.email} onChange={e => setNewLeadData({...newLeadData, email: e.target.value})} placeholder="Email" />
                            <input type="tel" className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" value={newLeadData.phone} onChange={e => setNewLeadData({...newLeadData, phone: e.target.value})} placeholder="Phone" />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Product & Pricing</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Select Product</label>
                                <select 
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-2 py-2 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                    value={newLeadData.productId}
                                    onChange={e => setNewLeadData({...newLeadData, productId: e.target.value})}
                                >
                                    {Object.keys(PRODUCT_PRICES).map(name => (
                                        <option key={name} value={name}>{name} (${PRODUCT_PRICES[name]})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] text-gray-500 mb-1">Discount ($)</label>
                                <input 
                                    type="number" 
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-2 py-2 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                                    value={newLeadData.discount}
                                    onChange={e => setNewLeadData({...newLeadData, discount: parseFloat(e.target.value) || 0})}
                                    placeholder="0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 text-sm font-medium">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all">Create Lead</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Analysis Modal */}
      {selectedLead && modalMode === 'ANALYSIS' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col transition-colors">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-purple-50/30 dark:bg-purple-900/10">
                <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                  <Sparkles className="text-purple-500" /> Deal Intelligence
                </h3>
                <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-8">
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4"></div>
                  <p className="text-sm text-gray-500 animate-pulse">Consulting Gemini AI...</p>
                </div>
              ) : aiAnalysis && (
                <div className="animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Win Probability</span>
                    <span className={`text-3xl font-black ${aiAnalysis.score > 70 ? 'text-green-500' : aiAnalysis.score > 40 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {aiAnalysis.score}%
                    </span>
                  </div>
                  <div className="h-4 w-full bg-gray-100 dark:bg-gray-700 rounded-full mb-8 overflow-hidden border border-gray-200 dark:border-gray-600">
                    <div className={`h-full transition-all duration-1000 ease-out ${aiAnalysis.score > 70 ? 'bg-green-500' : aiAnalysis.score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${aiAnalysis.score}%` }} />
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-5 rounded-xl border border-purple-100 dark:border-purple-800">
                    <h4 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase mb-3 flex items-center gap-2"><ArrowRight size={14} /> AI Insight</h4>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed italic">"{aiAnalysis.reasoning}"</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
              <button onClick={() => setSelectedLead(null)} className="px-6 py-2 text-gray-500 text-sm font-bold hover:text-gray-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* AI Email Modal */}
      {selectedLead && modalMode === 'EMAIL' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-blue-50/30 dark:bg-blue-900/10">
                <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white"><Wand2 className="text-blue-500" /> AI Email Drafter</h3>
                <button onClick={() => setSelectedLead(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider mb-1">Target</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{selectedLead.name} ({selectedLead.company})</p>
                </div>
                <div className="flex gap-2">
                    <input type="text" value={emailContext} onChange={(e) => setEmailContext(e.target.value)} className="flex-1 rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="What is the goal of this email?" />
                    <button onClick={handleGenerateDraft} disabled={isGenerating} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20">
                        {isGenerating ? 'Drafting...' : 'Generate'}
                    </button>
                </div>
                {aiDraft && (
                    <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-2xl text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap border italic leading-relaxed shadow-inner">
                        {aiDraft}
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                <button onClick={() => setSelectedLead(null)} className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};