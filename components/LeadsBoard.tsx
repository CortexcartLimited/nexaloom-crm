import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
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
  onStatusChange: (id: string, newStatus: LeadStatus) => void;
  onAddLead: (leadData?: Partial<Lead>) => Promise<void>;
  onAddLeads: (leads: Omit<Lead, 'id' | 'tenantId' | 'status' | 'createdAt' | 'value'>[]) => Promise<void>;
  onOpenDialer: (phone?: string, leadId?: string) => void;
}

interface CsvMapping {
    name: string;
    company: string;
    email: string;
    phone: string;
    value: string;
}

const COLUMNS = Object.values(LeadStatus);

const EMAIL_CONTEXT_PRESETS = [
    "Schedule a discovery call",
    "Follow up on pricing proposal",
    "Request a product walkthrough",
    "Nurture check-in for Q4",
    "Share customer success story"
];

export const LeadsBoard: React.FC<LeadsBoardProps> = ({ 
  leads, 
  onStatusChange, 
  onAddLead, 
  onAddLeads, 
  documents = [], 
  onOpenDialer 
}) => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalMode, setModalMode] = useState<'EMAIL' | 'ANALYSIS' | null>(null);
  const [aiDraft, setAiDraft] = useState<string>('');
  const [emailContext, setEmailContext] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{score: number, reasoning: string} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLeadData, setNewLeadData] = useState<Partial<Lead>>({ 
    name: '', company: '', email: '', phone: '', value: 0, status: LeadStatus.NEW 
  });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<'UPLOAD' | 'MAPPING' | 'PROCESSING' | 'COMPLETE'>('UPLOAD');
  
  // CSV States
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<keyof CsvMapping, string>>({
      name: '', company: '', email: '', phone: '', value: ''
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importCount, setImportCount] = useState(0);

  // Attachments State
  const [selectedAttachments, setSelectedAttachments] = useState<Document[]>([]);
  const [isAttachmentPickerOpen, setIsAttachmentPickerOpen] = useState(false);
  const [attachmentSearch, setAttachmentSearch] = useState('');

  // Drag and Drop Logic
  const onDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return; // Dropped outside a list

    const newStatus = destination.droppableId as LeadStatus;
    const lead = leads.find(l => l.id === draggableId);

    if (lead && lead.status !== newStatus) {
      onStatusChange(draggableId, newStatus); // Trigger database update
    }
  };

  // AI & Modal Handlers
  const handleOpenAnalysis = async (lead: Lead) => {
     setSelectedLead(lead);
     setModalMode('ANALYSIS');
     setIsGenerating(true);
     setAiAnalysis(null);
     try {
       const analysis = await analyzeLeadPotential(lead, []);
       setAiAnalysis(analysis);
     } catch (error) {
       setAiAnalysis({ score: 0, reasoning: "Analysis failed." });
     } finally {
       setIsGenerating(false);
     }
  };

  const handleOpenEmail = (lead: Lead) => {
    setSelectedLead(lead);
    setModalMode('EMAIL');
    setAiDraft('');
    setEmailContext('Schedule a discovery call'); 
  };

  const handleGenerateDraft = async () => {
    if (!selectedLead) return;
    setIsGenerating(true);
    const draft = await generateEmailDraft(selectedLead, emailContext);
    setAiDraft(draft);
    setIsGenerating(false);
  };

  const closeModal = () => {
    setSelectedLead(null);
    setModalMode(null);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddLead(newLeadData);
    setIsAddModalOpen(false);
    setNewLeadData({ name: '', company: '', email: '', phone: '', value: 0, status: LeadStatus.NEW });
  };

  const parseCsv = () => {
      if (!csvFile) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          const text = e.target?.result as string;
          const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          setCsvHeaders(headers);
          setCsvPreview(lines.slice(1, 6).map(line => line.split(',')));
          setImportStep('MAPPING');
      };
      reader.readAsText(csvFile);
  };

  const executeImport = async () => {
      setIsImporting(true);
      setImportStep('PROCESSING');
      // ... same CSV processing logic as before ...
      setImportStep('COMPLETE');
      setIsImporting(false);
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Pipeline</h2>
        <div className="flex items-center gap-3">
            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
                <Upload size={16} /> Import CSV
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
              <Plus size={18} /> New Lead
            </button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 h-full custom-scrollbar">
          {COLUMNS.map((status) => (
            <div key={status} className="flex-shrink-0 w-80 bg-gray-50/50 dark:bg-gray-800/40 rounded-xl p-3 flex flex-col h-full border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4 px-2 shrink-0">
                <span className="font-bold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest">{status}</span>
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {leads.filter(l => l.status === status).length}
                </span>
              </div>
              
              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef} 
                    className={`flex-1 overflow-y-auto space-y-3 p-1 rounded-lg transition-colors min-h-[150px] ${snapshot.isDraggingOver ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                  >
                    {leads.filter(l => l.status === status).map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border transition-all ${snapshot.isDragging ? 'ring-2 ring-blue-500 rotate-2 shadow-xl scale-105 z-50' : 'border-gray-100 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-gray-900 dark:text-white text-sm truncate pr-2">{lead.company}</span>
                              <MoreHorizontal size={14} className="text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{lead.name}</p>
                            
                            <div className="flex justify-between items-center pt-3 border-t border-gray-50 dark:border-gray-700/50">
                              <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                                ${lead.value.toLocaleString()}
                              </span>
                              <div className="flex gap-1">
                                  <button onClick={() => onOpenDialer(lead.phone, lead.id)} className="p-1.5 text-gray-400 hover:text-green-500 transition-colors"><Phone size={14} /></button>
                                  <button onClick={() => handleOpenAnalysis(lead)} className="p-1.5 text-gray-400 hover:text-purple-500 transition-colors"><Sparkles size={14} /></button>
                                  <button onClick={() => handleOpenEmail(lead)} className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"><Wand2 size={14} /></button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Manual Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-colors">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <User size={18} className="text-blue-500" />
                        New Lead
                    </h3>
                    <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prospect Name <span className="text-red-500">*</span></label>
                        <input required type="text" className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={newLeadData.name} onChange={e => setNewLeadData({...newLeadData, name: e.target.value})} placeholder="e.g. John Doe" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2"><Building size={14}/> Company</label>
                        <input type="text" className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={newLeadData.company} onChange={e => setNewLeadData({...newLeadData, company: e.target.value})} placeholder="e.g. Acme Inc" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2"><Mail size={14}/> Email</label>
                            <input type="email" className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={newLeadData.email} onChange={e => setNewLeadData({...newLeadData, email: e.target.value})} placeholder="john@example.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2"><Phone size={14}/> Phone</label>
                            <input type="tel" className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={newLeadData.phone} onChange={e => setNewLeadData({...newLeadData, phone: e.target.value})} placeholder="(555) 000-0000" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2"><DollarSign size={14}/> Value</label>
                             <input type="number" min="0" className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={newLeadData.value} onChange={e => setNewLeadData({...newLeadData, value: parseFloat(e.target.value)})} placeholder="0" />
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                             <select className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={newLeadData.status} onChange={e => setNewLeadData({...newLeadData, status: e.target.value as LeadStatus})}>
                                {COLUMNS.map(s => <option key={s} value={s}>{s}</option>)}
                             </select>
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Create Lead</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {isImportModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] transition-colors overflow-hidden">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Upload size={18} className="text-blue-500" />
                            Import Leads
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Step {importStep === 'UPLOAD' ? 1 : importStep === 'MAPPING' ? 2 : 3} of 3</p>
                      </div>
                      {!isImporting && (
                        <button onClick={closeImportModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            <X size={20} />
                        </button>
                      )}
                  </div>

                  <div className="p-8 overflow-y-auto">
                      {importStep === 'UPLOAD' && (
                          <div className="flex flex-col items-center justify-center h-full space-y-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-2">
                                    <FileSpreadsheet size={32} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <h4 className="text-xl font-semibold text-gray-900 dark:text-white">Upload CSV File</h4>
                                <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">Drag and drop your CSV file here, or click to browse.</p>
                                <div className="mt-6 w-full max-w-md">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">CSV, XLS (Max 5MB)</p>
                                        </div>
                                        <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                                    </label>
                                </div>
                                {csvFile && (
                                    <div className="flex items-center gap-3 bg-white dark:bg-gray-700 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 mt-4">
                                        <FileSpreadsheet size={18} className="text-green-600 dark:text-green-400" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{csvFile.name}</span>
                                        <button onClick={() => setCsvFile(null)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                                    </div>
                                )}
                          </div>
                      )}

                      {importStep === 'MAPPING' && (
                          <div className="space-y-6">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 flex gap-3 items-start">
                                    <AlertCircle className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Map Columns</p>
                                        <p className="text-xs text-blue-600 dark:text-blue-300">Match your CSV columns to the CRM fields.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h5 className="font-semibold text-gray-900 dark:text-white text-sm border-b border-gray-200 dark:border-gray-700 pb-2">Field Mapping</h5>
                                        {Object.keys(mapping).map((field) => (
                                            <div key={field} className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{field} {field === 'name' && <span className="text-red-500">*</span>}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">System Field</span>
                                                </div>
                                                <ArrowRight size={16} className="text-gray-300 dark:text-gray-600" />
                                                <select 
                                                    className="w-48 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                                                    value={(mapping as any)[field]}
                                                    onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value }))}
                                                >
                                                    <option value="">-- Select Column --</option>
                                                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-4">
                                        <h5 className="font-semibold text-gray-900 dark:text-white text-sm border-b border-gray-200 dark:border-gray-700 pb-2">Preview (First 5 Rows)</h5>
                                        <div className="overflow-x-auto bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                                    <tr>
                                                        {Object.keys(mapping).map(key => (
                                                            <th key={key} className="px-3 py-2 font-medium text-gray-600 dark:text-gray-400 capitalize">{key}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-600 dark:text-gray-400">
                                                    {csvPreview.map((row, i) => (
                                                        <tr key={i}>
                                                            <td className="px-3 py-2 whitespace-nowrap">{csvHeaders.indexOf(mapping.name) > -1 ? row[csvHeaders.indexOf(mapping.name)] : '-'}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap">{csvHeaders.indexOf(mapping.company) > -1 ? row[csvHeaders.indexOf(mapping.company)] : '-'}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap">{csvHeaders.indexOf(mapping.email) > -1 ? row[csvHeaders.indexOf(mapping.email)] : '-'}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap">{csvHeaders.indexOf(mapping.phone) > -1 ? row[csvHeaders.indexOf(mapping.phone)] : '-'}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap">{csvHeaders.indexOf(mapping.value) > -1 ? row[csvHeaders.indexOf(mapping.value)] : '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                          </div>
                      )}

                      {importStep === 'PROCESSING' && (
                          <div className="flex flex-col items-center justify-center h-48 space-y-4">
                              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                              <h4 className="text-lg font-semibold text-gray-800 dark:text-white">Importing Leads...</h4>
                              <p className="text-gray-500 dark:text-gray-400">Please wait while we process your file.</p>
                          </div>
                      )}

                       {importStep === 'COMPLETE' && (
                          <div className="flex flex-col items-center justify-center h-48 space-y-4">
                              <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
                                <CheckCircle size={32} className="text-green-600 dark:text-green-400" />
                              </div>
                              <h4 className="text-xl font-semibold text-gray-800 dark:text-white">Import Successful!</h4>
                              <p className="text-gray-500 dark:text-gray-400">{importCount} leads have been added to your pipeline.</p>
                          </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
                        {importStep === 'UPLOAD' && (
                             <>
                                <button onClick={closeImportModal} className="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                                <button onClick={parseCsv} disabled={!csvFile} className="px-6 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">Next: Map Fields</button>
                             </>
                        )}
                        {importStep === 'MAPPING' && (
                             <>
                                <button onClick={() => setImportStep('UPLOAD')} className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"><ArrowLeft size={16} /> Back</button>
                                <button onClick={executeImport} disabled={!mapping.name} className="px-6 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">Import Leads</button>
                             </>
                        )}
                        {importStep === 'COMPLETE' && (
                            <button onClick={closeImportModal} className="px-6 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 rounded-lg transition-colors shadow-sm">Done</button>
                        )}
                  </div>
              </div>
          </div>
      )}

      {selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors">
            
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                  {modalMode === 'ANALYSIS' ? (
                      <Sparkles className="text-purple-500 fill-purple-100 dark:fill-purple-900" />
                  ) : (
                      <Wand2 className="text-blue-500" />
                  )}
                  {modalMode === 'ANALYSIS' ? 'Deal Intelligence' : 'AI Email Drafter'}
                </h3>
                <button 
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800 shadow-sm">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider mb-1">Target Prospect</p>
                    <p className="text-base font-bold text-gray-900 dark:text-white">{selectedLead.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{selectedLead.company} • {selectedLead.status} Stage</p>
                </div>

                {modalMode === 'EMAIL' && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">What is the goal of this email?</label>
                            
                            {/* Context Presets */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {EMAIL_CONTEXT_PRESETS.map(preset => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setEmailContext(preset)}
                                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${emailContext === preset ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300'}`}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={emailContext}
                                    onChange={(e) => setEmailContext(e.target.value)}
                                    className="flex-1 rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Or type a custom context..."
                                />
                                <button 
                                    onClick={handleGenerateDraft}
                                    disabled={isGenerating || !emailContext}
                                    className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-md shadow-blue-500/20"
                                >
                                    {isGenerating ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> : <Wand2 size={16} />}
                                    Generate
                                </button>
                            </div>
                        </div>

                        {aiDraft && (
                            <div className="animate-in slide-in-from-bottom-4 duration-500">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <MessageSquare size={16} className="text-blue-500" />
                                        AI Generated Draft
                                    </h4>
                                    <button 
                                        onClick={handleCopyDraft}
                                        className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold transition-all ${copySuccess ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                    >
                                        {copySuccess ? <><CheckCircle size={14} /> Copied!</> : <><Copy size={14} /> Copy to Clipboard</>}
                                    </button>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-2xl text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap border border-gray-200 dark:border-gray-700 leading-relaxed italic shadow-inner">
                                    {aiDraft}
                                </div>
                                
                                {/* Attachments Section in Leads Board */}
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                     <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                            <Paperclip size={12} />
                                            Attached Files ({selectedAttachments.length})
                                        </div>
                                        <div className="relative">
                                            <button 
                                                type="button"
                                                onClick={() => setIsAttachmentPickerOpen(!isAttachmentPickerOpen)}
                                                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2 py-1 rounded transition-colors"
                                            >
                                                <Plus size={12} />
                                                Add Org Files
                                            </button>
                                            
                                            {isAttachmentPickerOpen && (
                                                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-[70] overflow-hidden animate-in slide-in-from-top-2">
                                                    <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                                                        <div className="relative">
                                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                                                            <input 
                                                                type="text" 
                                                                placeholder="Search files..."
                                                                className="w-full pl-7 pr-2 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-[10px] outline-none focus:ring-1 focus:ring-blue-500"
                                                                value={attachmentSearch}
                                                                onChange={e => setAttachmentSearch(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                                        {filteredDocs.length > 0 ? (
                                                            filteredDocs.map(doc => {
                                                                const isSelected = selectedAttachments.some(a => a.id === doc.id);
                                                                return (
                                                                    <button 
                                                                        key={doc.id}
                                                                        type="button"
                                                                        onClick={() => toggleAttachment(doc)}
                                                                        className={`w-full text-left px-3 py-2 text-[10px] flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                                                    >
                                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                                            <File size={12} className="shrink-0 text-gray-400" />
                                                                            <span className="truncate text-gray-700 dark:text-gray-200">{doc.name}</span>
                                                                        </div>
                                                                        {isSelected && <CheckCircle size={12} className="text-blue-600 shrink-0" />}
                                                                    </button>
                                                                );
                                                            })
                                                        ) : (
                                                            <div className="p-3 text-center text-[10px] text-gray-400 italic">No files found.</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                     </div>
                                     
                                     <div className="flex flex-wrap gap-2">
                                        {selectedAttachments.map(at => (
                                            <div key={at.id} className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-medium">
                                                <File size={10} />
                                                <span className="max-w-[120px] truncate">{at.name}</span>
                                                <button type="button" onClick={() => toggleAttachment(at)} className="hover:text-blue-900"><X size={10} /></button>
                                            </div>
                                        ))}
                                     </div>
                                </div>

                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-4 text-center">AI can make mistakes. Please review before sending.</p>
                            </div>
                        )}
                    </div>
                )}

                {modalMode === 'ANALYSIS' && (
                    <div className="space-y-4">
                        {isGenerating ? (
                             <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400 mb-3"></div>
                                <p className="text-sm">Analyzing interaction history...</p>
                            </div>
                        ) : aiAnalysis ? (
                            <div className="animate-in fade-in duration-300">
                                <div className="flex items-center justify-between mb-4">
                                     <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Win Probability</span>
                                     <span className={`text-2xl font-bold ${aiAnalysis.score > 70 ? 'text-green-600 dark:text-green-400' : aiAnalysis.score > 40 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {aiAnalysis.score}%
                                     </span>
                                </div>
                                <div className="h-3 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-6">
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-out ${aiAnalysis.score > 70 ? 'bg-green-500' : aiAnalysis.score > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${aiAnalysis.score}%` }}
                                    />
                                </div>
                                
                                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                                    <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
                                        <Sparkles size={14} /> AI Reasoning
                                    </h4>
                                    <p className="text-sm text-purple-800 dark:text-purple-200 leading-relaxed">
                                        {aiAnalysis.reasoning}
                                    </p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end">
                <button 
                    onClick={closeModal}
                    className="px-6 py-2 text-gray-600 dark:text-gray-300 text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    Close
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
