import React, { useState, useMemo, useEffect } from 'react';
import { Lead, Interaction, Document, KnowledgeBaseArticle, User } from '../types';
import { generateEmailDraft } from '../services/geminiService';
import { Phone, Mail, Building, Calendar, User as UserIcon, X, MessageSquare, Clock, MapPin, Upload, FileSpreadsheet, ArrowRight, CheckCircle, AlertCircle, ArrowLeft, Plus, Inbox, LayoutGrid, List, MoreHorizontal, Send, Wand2, Paperclip, File, Search, ClipboardList, Save, History, BookOpen, Edit, Coins, Sparkles, Terminal, ExternalLink, Monitor, Loader2 } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency';
import { api } from '../services/api';

interface ContactsViewProps {
  contacts: Lead[];
  interactions: Interaction[];
  documents?: Document[];
  articles?: KnowledgeBaseArticle[];
  onAddLeads?: (leads: Omit<Lead, 'id' | 'tenantId' | 'status' | 'createdAt' | 'value'>[]) => Promise<void>;
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<void>;
  onAddInteraction: (interaction: Interaction) => Promise<void>;
  onOpenDialer: (phone?: string) => void;
  user: User; // Provided by App.tsx
}

const COUNTRIES = [
  'United Kingdom',
  'United States',
  'India',
  'Australia',
  'Canada',
  'Germany',
  'France',
  'Other'
];

export const ContactsView: React.FC<ContactsViewProps> = ({
  contacts,
  interactions,
  onAddLeads,
  onUpdateLead,
  onAddInteraction,
  onOpenDialer,
  user,
  documents = [],
  articles = []
}) => {
  console.log("Contacts received by component:", contacts);

  // --- ADD THIS BLOCK START ---
  if (!user) {
    return <div className="p-10 text-center">User not loaded...</div>;
  }

  if (!contacts || contacts.length === 0) {
    return (
      <div className="p-10 text-center flex flex-col items-center justify-center h-full">
        <div className="bg-gray-50 p-6 rounded-full mb-4">
          <UserIcon size={48} className="text-gray-300" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No contacts found</h3>
        <p className="text-gray-500">Try importing leads or adding a new contact manually.</p>
        <button onClick={() => setIsAddModalOpen(true)} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg">
          + Add First Contact
        </button>
      </div>
    );
  }
  // --- ADD THIS BLOCK END ---

  // --- 2. STATE DECLARATIONS ---
  const [selectedContact, setSelectedContact] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Lead>>({});
  const [isNotesSidebarOpen, setIsNotesSidebarOpen] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [interactionType, setInteractionType] = useState<'NOTE' | 'MEETING' | 'CALL' | 'EMAIL'>('NOTE');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isKbSearchOpen, setIsKbSearchOpen] = useState(false);
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newContactData, setNewContactData] = useState({ name: '', company: '', email: '', phone: '', currency: 'GBP' });
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isTerminating, setIsTerminating] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [selectedAttachments, setSelectedAttachments] = useState<Document[]>([]);
  const [commHistory, setCommHistory] = useState<any[]>([]);



  // --- 3. MEMOIZED DATA ---

  // New Timeline Interface
  interface TimelineItem {
    id: string;
    type: string;
    date: string;
    notes: string;
    status: string;
    source: 'interaction' | 'history' | 'email';
  }

  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);

  useEffect(() => {
    if (selectedContact) {
      const token = localStorage.getItem('nexaloom_token');

      // 1. Fetch Email History (Legacy Support - keeping for now if used elsewhere)
      fetch(`/crm/nexaloom-crm/api/leads/${selectedContact.id}/email-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setCommHistory(Array.isArray(data) ? data : []))
        .catch(err => console.error("Failed to fetch history:", err));

      // 2. Fetch Unified Timeline
      const tenantId = localStorage.getItem('nexaloom_tenant_id') || user.tenantId;
      console.log("Fetching timeline for tenant:", tenantId);

      api.getTimeline(selectedContact.id, tenantId)
        .then(data => {
          if (Array.isArray(data)) {
            setTimelineItems(data);
          }
        })
        .catch(err => console.error("Failed to fetch timeline:", err));

    } else {
      setCommHistory([]);
      setTimelineItems([]);
    }
  }, [selectedContact, user.tenantId]);

  const contactInteractions = useMemo(() => {
    if (!selectedContact || !interactions) return [];
    return interactions
      .filter(i => i.leadId === selectedContact.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [interactions, selectedContact]);

  const emailHistory = useMemo(() => {
    return contactInteractions.filter(i => i.type === 'EMAIL');
  }, [contactInteractions]);

  // --- 4. HANDLERS ---

  const handleEditClick = () => {
    if (!selectedContact) return;
    setEditFormData({
      name: selectedContact.name,
      company: selectedContact.company,
      email: selectedContact.email,
      phone: selectedContact.phone,
      currency: selectedContact.currency || 'GBP',
      country: selectedContact.country || 'United Kingdom'
    });
    setIsEditing(true);
  };

  const handleSaveContactUpdates = async () => {
    if (!selectedContact) return;
    await onUpdateLead(selectedContact.id, editFormData);
    setSelectedContact({ ...selectedContact, ...editFormData } as Lead);
    setIsEditing(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact || !newNoteText.trim()) return;
    setIsSavingNote(true);
    try {
      const interaction: Interaction = {
        id: `int-note-${Date.now()}`,
        tenantId: user.tenantId,
        leadId: selectedContact.id,
        userId: user.id, // Ensure this is passed
        type: interactionType,
        notes: newNoteText,
        date: new Date().toISOString()
        // productId: someValue // You can add this if the note is about a specific product
      };
      await onAddInteraction(interaction);
      setNewNoteText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    alert('Contact View Button Triggered');

    if (!selectedContact) {
      console.error('No selected contact!');
      return;
    }

    const targetUrl = `/crm/nexaloom-crm/api/proposals/outreach/${selectedContact.id}`;
    console.log('Target URL:', targetUrl);
    console.log('Payload Body:', { subject: emailSubject, body: emailBody });

    setIsSending(true);
    try {
      const token = localStorage.getItem('nexaloom_token');
      // MATCHING WORKING CODE FROM api.ts (API_BASE = '/crm/nexaloom-crm/api')
      const response = await fetch(`/crm/nexaloom-crm/api/proposals/outreach/${selectedContact.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subject: emailSubject, body: emailBody })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      // The backend logs the interaction automatically now.
      // We can assume the list will refresh or we might need to manually trigger a refresh if the user wants.

      setEmailSuccess('Email sent successfully!');
      setTimeout(() => {
        setIsEmailModalOpen(false);
        setEmailSuccess('');
      }, 1500);
    } catch (error) {
      console.error('Email Send Error:', error);
      alert(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onAddLeads) {
      await onAddLeads([newContactData]);
      setIsAddModalOpen(false);
      setNewContactData({ name: '', company: '', email: '', phone: '', currency: 'GBP' });
    }
  };

  const handleOpenEmail = () => {
    setEmailSubject('');
    setEmailBody(`Hi ${selectedContact?.name.split(' ')[0]},\n\n\n\nBest regards,\n${user.name}`);
    setIsEmailModalOpen(true);
    setEmailSuccess('');
  };

  const handleInsertKbArticle = (article: KnowledgeBaseArticle) => {
    setNewNoteText(prev => prev + `\n\nArticle Reference: ${article.title}`);
    setIsKbSearchOpen(false);
  };

  const filteredKbArticles = (articles || []).filter(a => a.title.toLowerCase().includes(kbSearchQuery.toLowerCase()));

  // --- 5. RENDER UI ---
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Contact Directory</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your relationships and interaction history</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 flex shadow-sm mr-2">
            <button onClick={() => setViewMode('GRID')} className={`p-1.5 rounded-md transition-all ${viewMode === 'GRID' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title="Grid View"><LayoutGrid size={18} /></button>
            <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`} title="List View"><List size={18} /></button>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"><Plus size={16} /> New Contact</button>
        </div>
      </div>

      {/* Contact Grid */}
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto pb-20 pr-2 custom-scrollbar">
        {viewMode === 'GRID' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {contacts.map(contact => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border transition-all cursor-pointer group relative overflow-hidden ${selectedContact?.id === contact.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100 dark:border-gray-700 hover:shadow-md'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500">
                      <UserIcon size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{contact.name}</h3>
                      <p className="text-sm text-gray-500 truncate">{contact.company}</p>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mt-4 font-medium flex items-center gap-1">
                  View Profile <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {contacts.map(contact => (
                  <tr
                    key={contact.id}
                    onClick={() => setSelectedContact(contact)}
                    className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                          {contact.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{contact.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{contact.company}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{contact.email || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{contact.phone || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Profile Details Sidebar */}
      {selectedContact && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-end z-50 animate-in fade-in duration-200" onClick={() => { setSelectedContact(null); setIsEditing(false); }}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-100 dark:border-gray-700" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-start shrink-0">
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">{selectedContact.name.charAt(0)}</div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedContact.name}</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1 mt-1"><Building size={14} />{selectedContact.company}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {isEditing ? (
                      <button onClick={handleSaveContactUpdates} className="text-xs bg-green-600 text-white px-3 py-1 rounded-md font-medium flex items-center gap-1"><Save size={12} /> Save</button>
                    ) : (
                      <button onClick={handleEditClick} className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-1 rounded-md font-medium">Edit Profile</button>
                    )}
                    <button onClick={handleOpenEmail} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-md font-medium flex items-center gap-1"><Send size={12} /> Email</button>
                    <button onClick={() => setIsNotesSidebarOpen(true)} className="text-xs bg-white dark:bg-gray-700 border border-gray-200 px-2 py-1 rounded-md" title="Notes & Logs"><ClipboardList size={14} /></button>

                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedContact(null)} className="text-gray-400 p-2 rounded-full hover:bg-gray-200 transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Details</h3>
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <Mail size={16} className="text-gray-400" />
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-500 uppercase">Email</p>
                      {isEditing ? (
                        <input className="w-full bg-white text-sm border rounded px-1 text-black" value={editFormData.email || ''} onChange={e => setEditFormData({ ...editFormData, email: e.target.value })} />
                      ) : (
                        <p className="text-sm font-medium">{selectedContact.email || 'None'}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <Phone size={16} className="text-gray-400" />
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-500 uppercase">Phone</p>
                      {isEditing ? (
                        <input className="w-full bg-white text-sm border rounded px-1 text-black" value={editFormData.phone || ''} onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })} />
                      ) : (
                        <p className="text-sm font-medium">{selectedContact.phone || 'None'}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <Coins size={16} className="text-gray-400" />
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-500 uppercase">Location & Currency</p>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <select
                            className="w-1/2 bg-white text-sm border rounded px-1 text-black py-1"
                            value={editFormData.country || 'United Kingdom'}
                            onChange={e => setEditFormData({ ...editFormData, country: e.target.value })}
                          >
                            <option value="" disabled>Country</option>
                            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <select
                            className="w-1/2 bg-white text-sm border rounded px-1 text-black py-1"
                            value={editFormData.currency || 'GBP'}
                            onChange={e => setEditFormData({ ...editFormData, currency: e.target.value })}
                          >
                            <option value="GBP">GBP (£)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="INR">INR (₹)</option>
                            <option value="AUD">AUD (A$)</option>
                            <option value="CAD">CAD (C$)</option>
                          </select>
                        </div>
                      ) : (
                        <p className="text-sm font-medium">
                          {selectedContact.country || 'Unknown'} ({formatCurrency(0, selectedContact.currency || 'GBP').replace(/\d|\s|\./g, '')})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Demo Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Products Demo</h3>
                  {selectedContact.demo_status === 'ACTIVE' && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-800">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
                      ACTIVE
                    </span>
                  )}
                </div>

                {selectedContact.demo_status === 'PROVISIONING' ? (
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6 border border-indigo-100 dark:border-indigo-900 ring-1 ring-indigo-50 dark:ring-indigo-900/20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 flex items-center justify-center">
                          <Monitor size={24} />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5">
                          <Loader2 size={14} className="text-indigo-600 animate-spin" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Provisioning Environment...</h4>
                        <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto">Please wait while we spin up your dedicated demo instance.</p>
                      </div>
                      <div className="w-full max-w-[160px] bg-gray-200 rounded-full h-1 mt-2 dark:bg-gray-600 overflow-hidden">
                        <div className="bg-indigo-600 h-1 rounded-full animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                  </div>
                ) : selectedContact.demo_status === 'ACTIVE' ? (
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 mr-4 overflow-hidden">
                          <p className="text-[10px] text-gray-500 uppercase mb-1">Live Demo URL</p>
                          <a
                            href={`http://demo.cortexcart.com:${selectedContact.demo_port}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-mono font-bold text-purple-600 hover:text-purple-700 hover:underline truncate block"
                            title={`http://demo.cortexcart.com:${selectedContact.demo_port}`}
                          >
                            https://demo.cortexcart.com:{selectedContact.demo_port}
                          </a>
                        </div>
                        <button
                          onClick={() => window.open(`http://demo.cortexcart.com:${selectedContact.demo_port}`, '_blank')}
                          className="p-2 bg-white dark:bg-gray-600 text-purple-600 rounded-lg shadow-sm border border-purple-100 dark:border-purple-800 hover:bg-purple-50 transition-colors shrink-0"
                        >
                          <ExternalLink size={18} />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-gray-200 dark:border-gray-600 flex gap-2">
                        <button
                          onClick={async () => {
                            if (!window.confirm('Are you sure you want to terminate this demo? Any unsaved work in the demo environment will be lost.')) return;
                            setIsTerminating(true);
                            try {
                              await api.terminateDemo(selectedContact.id);
                              await onUpdateLead(selectedContact.id, { demo_status: 'INACTIVE', demo_port: undefined });
                              // Local update to reflect in sidebar immediately
                              setSelectedContact({ ...selectedContact, demo_status: 'INACTIVE', demo_port: undefined });
                            } catch (err) {
                              alert(err instanceof Error ? err.message : 'Failed to terminate demo');
                            } finally {
                              setIsTerminating(false);
                            }
                          }}
                          disabled={isTerminating}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-bold border border-red-100 dark:border-red-800 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {isTerminating ? <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" /> : <Terminal size={14} />}
                          Terminate Now
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                    <div className="text-center py-2 space-y-3">
                      <div className="flex flex-col items-center gap-1">
                        <Sparkles size={24} className="text-gray-300" />
                        <p className="text-sm text-gray-500 font-medium">No Active Demo</p>
                      </div>

                      {user.role === 'ADMIN' && (
                        <button
                          onClick={async () => {
                            setIsProvisioning(true);
                            try {
                              const result = await api.provisionDemo(selectedContact.id);

                              // 1. Immediate UI update: PROVISIONING
                              await onUpdateLead(selectedContact.id, { demo_status: 'PROVISIONING', demo_port: 0 });
                              setSelectedContact({ ...selectedContact, demo_status: 'PROVISIONING', demo_port: 0 });

                              // 2. Wait 60 seconds (Frontend Timer)
                              setTimeout(async () => {
                                // 3. Assume active after timeout
                                // Extract port from initial result or default (since initial result usually has it)
                                const port = parseInt(result.demoUrl.split(':').pop() || '0');

                                // Update Backend to ACTIVE
                                await api.updateLeadStatus(selectedContact.id, 'ACTIVE');
                                // Note: We might need a specific endpoint to set port if updateLeadStatus doesn't
                                // But usually provision sets port in DB immediately. 
                                // If provision set it to PROVISIONING, we just need to flip status.

                                // Update UI to ACTIVE
                                await onUpdateLead(selectedContact.id, { demo_status: 'ACTIVE', demo_port: port });
                                setSelectedContact(prev => prev ? { ...prev, demo_status: 'ACTIVE', demo_port: port } : null);

                                setIsProvisioning(false);
                                alert("Demo is ready! Click the link to view.");
                              }, 60000); // 60 seconds

                            } catch (err) {
                              alert(err instanceof Error ? err.message : 'Failed to provision demo');
                              setIsProvisioning(false);
                            }
                          }}
                          disabled={isProvisioning}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-purple-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-purple-200 dark:shadow-none hover:bg-purple-700 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        >
                          {isProvisioning ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Sparkles size={16} />
                          )}
                          Launch New Demo
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Communication History Section */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><Mail size={14} /> Communication History</h3>
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                  {commHistory.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {commHistory.map((email: any) => (
                        <div key={email.id} className="p-3 hover:bg-white dark:hover:bg-gray-700/50 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${email.type === 'Proposal' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                              {email.type}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(email.sentAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{email.subject}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-xs text-gray-400 py-4 italic">No communication history found.</p>
                  )}
                </div>
              </div>

              {/* Timeline Section */}
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><Clock size={14} /> Activity Timeline</h3>
                  <button onClick={() => setIsNotesSidebarOpen(true)} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">+ New Note</button>
                </div>
                {timelineItems.length > 0 ? (
                  <div className="space-y-4">
                    {timelineItems.map((item) => {
                      const isOutreach = item.notes?.startsWith('OUTREACH SENT:');
                      const displayNotes = isOutreach ? item.notes.replace('OUTREACH SENT:', '').trim() : item.notes;

                      return (
                        <div key={item.id} className="relative pl-6">
                          <div className={`absolute left-0 top-1 w-2 h-2 rounded-full ${item.source === 'history' ? 'bg-gray-300' : 'bg-blue-500'}`} />
                          <div className={`bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-sm shadow-sm ${isOutreach ? 'border-l-4 border-purple-500' : ''}`}>
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className={`font-bold uppercase ${item.source === 'history' ? 'text-gray-500' : 'text-blue-600'}`}>
                                {isOutreach ? 'OUTREACH' : item.type}
                              </span>
                              <span className="text-gray-400">
                                {(() => {
                                  try {
                                    const d = new Date(item.date);
                                    return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                  } catch (e) { return 'Invalid Date'; }
                                })()}
                              </span>
                            </div>
                            <p className="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{displayNotes}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center text-xs text-gray-400 py-4 italic">No activity yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Note Logging Sidebar */}
      {isNotesSidebarOpen && selectedContact && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex justify-end z-[70] animate-in fade-in" onClick={() => setIsNotesSidebarOpen(false)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center bg-amber-50/50">
              <div className="flex items-center gap-3">
                <ClipboardList className="text-amber-600" />
                <h2 className="text-lg font-bold">Log Activity: {selectedContact.name}</h2>
              </div>
              <button onClick={() => setIsNotesSidebarOpen(false)}><X /></button>
            </div>
            <div className="p-6 flex flex-col h-full">
              <form onSubmit={handleAddNote} className="flex flex-col flex-1">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Type:</label>
                    <select
                      className="text-xs font-bold text-gray-700 dark:text-gray-300 bg-transparent border border-gray-200 dark:border-gray-600 rounded px-1 py-0.5 outline-none uppercase cursor-pointer"
                      value={interactionType}
                      onChange={(e) => setInteractionType(e.target.value as any)}
                    >
                      <option value="NOTE">Note</option>
                      <option value="MEETING">Meeting</option>
                      <option value="CALL">Call</option>
                      <option value="EMAIL">Email</option>
                    </select>
                  </div>
                  <button type="button" onClick={() => setIsKbSearchOpen(!isKbSearchOpen)} className="text-xs text-blue-600 flex items-center gap-1 hover:underline"><BookOpen size={12} /> Reference KB</button>
                </div>

                {isKbSearchOpen && (
                  <div className="mb-4 p-2 bg-gray-50 border rounded-lg">
                    <input className="w-full p-2 text-xs border rounded mb-2" placeholder="Search KB Articles..." value={kbSearchQuery} onChange={e => setKbSearchQuery(e.target.value)} />
                    <div className="max-h-32 overflow-y-auto">
                      {filteredKbArticles.map(art => (
                        <button key={art.id} onClick={() => handleInsertKbArticle(art)} className="w-full text-left p-1 text-xs hover:bg-blue-50">{art.title}</button>
                      ))}
                    </div>
                  </div>
                )}

                <textarea
                  autoFocus
                  className="w-full flex-1 p-4 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm text-black"
                  placeholder="What happened? Log a call, meeting, or important detail..."
                  value={newNoteText}
                  onChange={e => setNewNoteText(e.target.value)}
                />
                <button type="submit" disabled={isSavingNote || !newNoteText.trim()} className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-bold shadow-lg disabled:opacity-50">
                  {isSavingNote ? 'Saving...' : 'Save to Timeline'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">New Contact</h3>
              <button onClick={() => setIsAddModalOpen(false)}><X /></button>
            </div>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <input required className="w-full border rounded-lg p-2 text-black" placeholder="Full Name" value={newContactData.name} onChange={e => setNewContactData({ ...newContactData, name: e.target.value })} />
              <input className="w-full border rounded-lg p-2 text-black" placeholder="Company" value={newContactData.company} onChange={e => setNewContactData({ ...newContactData, company: e.target.value })} />
              <input type="email" className="w-full border rounded-lg p-2 text-black" placeholder="Email" value={newContactData.email} onChange={e => setNewContactData({ ...newContactData, email: e.target.value })} />

              <input className="w-full border rounded-lg p-2 text-black" placeholder="Phone" value={newContactData.phone} onChange={e => setNewContactData({ ...newContactData, phone: e.target.value })} />
              <select
                className="w-full border rounded-lg p-2 text-black bg-white"
                value={newContactData.currency}
                onChange={e => setNewContactData({ ...newContactData, currency: e.target.value })}
              >
                <option value="GBP">GBP (£)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="INR">INR (₹)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="CAD">CAD (C$)</option>
              </select>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold">Create Contact</button>
            </form>
          </div>
        </div>
      )}

      {/* Email Composition Modal */}
      {isEmailModalOpen && selectedContact && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl flex flex-col p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">Log Sent Email</h3>
              <button onClick={() => setIsEmailModalOpen(false)}><X /></button>
            </div>
            <form onSubmit={handleSendEmail} className="space-y-4">
              <input required className="w-full border rounded-lg p-2 text-black" placeholder="Subject" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
              <textarea required className="w-full h-64 border rounded-lg p-2 text-black" placeholder="Email content..." value={emailBody} onChange={e => setEmailBody(e.target.value)} />
              <div className="flex justify-between items-center">
                <span className="text-green-600 text-sm font-bold">{emailSuccess}</span>
                <button type="submit" disabled={isSending} className="bg-blue-600 text-white px-8 py-2 rounded-lg font-bold">
                  {isSending ? 'Logging...' : 'Log Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};