
import React, { useState } from 'react';
import { Ticket, TicketStatus, TaskPriority, Lead, KnowledgeBaseArticle, User, Interaction } from '../types';
import { Plus, Search, Filter, MoreHorizontal, MessageSquare, Clock, User as UserIcon, Building, Trash2, Edit, X, ArrowRight, LifeBuoy, AlertCircle, CheckCircle, BookOpen, Send, Save } from 'lucide-react';

interface TicketsViewProps {
  tickets: Ticket[];
  leads: Lead[];
  articles: KnowledgeBaseArticle[];
  user: User;
  onAddTicket: (ticket: Omit<Ticket, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;
  onDeleteTicket: (id: string) => Promise<void>;
  onAddInteraction: (interaction: Interaction) => Promise<void>;
}

export const TicketsView: React.FC<TicketsViewProps> = ({ tickets, leads, articles, user, onAddTicket, onUpdateTicket, onDeleteTicket, onAddInteraction }) => {
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'RESOLVED'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Detail View State
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isKbSearchOpen, setIsKbSearchOpen] = useState(false);
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  
  const [newTicket, setNewTicket] = useState({
      subject: '',
      description: '',
      priority: TaskPriority.MEDIUM,
      status: TicketStatus.OPEN,
      leadId: ''
  });

  const filteredTickets = tickets.filter(ticket => {
      const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
      const isActive = ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED;
      const matchesTab = activeTab === 'ACTIVE' ? isActive : !isActive;
      return matchesSearch && matchesTab;
  });

  const filteredKbArticles = articles.filter(a => a.title.toLowerCase().includes(kbSearchQuery.toLowerCase()));

  const handleCreateTicket = async (e: React.FormEvent) => {
      e.preventDefault();
      await onAddTicket(newTicket);
      setIsAddModalOpen(false);
      setNewTicket({ subject: '', description: '', priority: TaskPriority.MEDIUM, status: TicketStatus.OPEN, leadId: '' });
  };

  const handleTicketClick = (ticket: Ticket) => {
      setSelectedTicket(ticket);
      setReplyText('');
      setIsKbSearchOpen(false);
  };

  const handleInsertKbArticle = (article: KnowledgeBaseArticle) => {
      setReplyText(prev => {
          const prefix = prev.trim() ? '\n\n' : '';
          const insertText = `Here is a guide that might help:\nShared Article: [${article.title}] (ID: ${article.id})`;
          return prev + prefix + insertText;
      });
      setIsKbSearchOpen(false);
      setKbSearchQuery('');
  };

  const handleSendReply = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTicket || !replyText.trim()) return;

      setIsSendingReply(true);
      
      // 1. Log the Interaction
      if (selectedTicket.leadId) {
          const interaction: Interaction = {
              id: `int-reply-${Date.now()}`,
              tenantId: user.tenantId,
              leadId: selectedTicket.leadId,
              type: 'EMAIL',
              notes: `RE: Ticket #${selectedTicket.id.substring(0, 6)} - ${selectedTicket.subject}\n\n${replyText}`,
              date: new Date().toISOString()
          };
          await onAddInteraction(interaction);
      }

      // 2. Update Ticket Status if it was Open
      if (selectedTicket.status === TicketStatus.OPEN) {
          await onUpdateTicket(selectedTicket.id, { status: TicketStatus.IN_PROGRESS });
          setSelectedTicket(prev => prev ? { ...prev, status: TicketStatus.IN_PROGRESS } : null);
      } else {
          // Just trigger a refresh of the last updated timestamp
          await onUpdateTicket(selectedTicket.id, {});
      }

      setReplyText('');
      setIsSendingReply(false);
      alert('Reply sent and logged successfully.');
  };

  const getStatusColor = (status: TicketStatus) => {
      switch (status) {
          case TicketStatus.OPEN: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
          case TicketStatus.IN_PROGRESS: return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
          case TicketStatus.RESOLVED: return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
          case TicketStatus.CLOSED: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
      }
  };

  const getPriorityStyles = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
      case TaskPriority.MEDIUM:
        return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
      case TaskPriority.LOW:
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
    }
  };

  const renderLeadInfo = (leadId?: string) => {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return <span className="text-gray-400 italic">Unassigned</span>;
      return (
          <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">{lead.name}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500 dark:text-gray-400">{lead.company}</span>
          </div>
      );
  };

  return (
    <div className="p-6 h-full flex flex-col relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Support Tickets</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and resolve customer support issues.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <Plus size={18} />
          New Ticket
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 flex shadow-sm">
             <button 
                onClick={() => setActiveTab('ACTIVE')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'ACTIVE' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
             >
                 Active Tickets ({tickets.filter(t => t.status !== TicketStatus.RESOLVED && t.status !== TicketStatus.CLOSED).length})
             </button>
             <button 
                onClick={() => setActiveTab('RESOLVED')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'RESOLVED' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
             >
                 Resolved
             </button>
        </div>
        
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
                type="text" 
                placeholder="Search by subject or description..." 
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 dark:text-white transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          {filteredTickets.length > 0 ? filteredTickets.map(ticket => {
              const lead = leads.find(l => l.id === ticket.leadId);
              return (
                  <div key={ticket.id} onClick={() => handleTicketClick(ticket)} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all p-5 group cursor-pointer">
                      <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                              <div className="flex items-center gap-3 mb-1">
                                  <h3 className="font-bold text-gray-900 dark:text-white">{ticket.subject}</h3>
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getStatusColor(ticket.status)}`}>
                                      {ticket.status}
                                  </span>
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-current ${getPriorityStyles(ticket.priority)}`}>
                                      {ticket.priority}
                                  </span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{ticket.description}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); onDeleteTicket(ticket.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                              >
                                  <Trash2 size={18} />
                              </button>
                          </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1.5">
                              <Clock size={14} />
                              Created {new Date(ticket.createdAt).toLocaleDateString()}
                          </div>
                          {lead && (
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                                    <UserIcon size={14} />
                                    {lead.name}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Building size={14} />
                                    {lead.company}
                                </div>
                              </div>
                          )}
                      </div>
                  </div>
              );
          }) : (
              <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400 dark:text-gray-500">
                  <LifeBuoy size={48} className="opacity-20 mb-4" />
                  <p className="font-medium">No {activeTab.toLowerCase()} tickets found.</p>
                  <p className="text-sm">Click "New Ticket" to create a support record.</p>
              </div>
          )}
      </div>

      {/* Ticket Details Panel */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex justify-end z-[70] animate-in fade-in duration-200" onClick={() => setSelectedTicket(null)}>
           <div className="w-full max-w-lg bg-white dark:bg-gray-800 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-100 dark:border-gray-700" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${getStatusColor(selectedTicket.status)}`}>
                            {selectedTicket.status}
                        </span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-current ${getPriorityStyles(selectedTicket.priority)}`}>
                            {selectedTicket.priority}
                        </span>
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">{selectedTicket.subject}</h2>
                 </div>
                 <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
                  {/* Ticket Metadata */}
                  <div className="space-y-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Requester</h4>
                          {renderLeadInfo(selectedTicket.leadId)}
                      </div>
                      
                      <div>
                          <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                              {selectedTicket.description}
                          </p>
                      </div>
                  </div>

                  <hr className="border-gray-100 dark:border-gray-700" />

                  {/* Reply Section */}
                  <div>
                      <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                              <MessageSquare size={16} className="text-blue-500" />
                              Reply to Customer
                          </h4>
                          
                          <div className="relative">
                              <button 
                                type="button" 
                                onClick={() => setIsKbSearchOpen(!isKbSearchOpen)}
                                className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded transition-colors font-medium"
                              >
                                  <BookOpen size={12} /> Insert KB Link
                              </button>
                              
                              {isKbSearchOpen && (
                                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[80] overflow-hidden animate-in fade-in slide-in-from-top-2">
                                      <div className="p-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                          <div className="relative">
                                              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                              <input 
                                                type="text" 
                                                placeholder="Search articles..."
                                                className="w-full pl-6 pr-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white"
                                                value={kbSearchQuery}
                                                onChange={e => setKbSearchQuery(e.target.value)}
                                                autoFocus
                                              />
                                          </div>
                                      </div>
                                      <div className="max-h-40 overflow-y-auto custom-scrollbar">
                                          {filteredKbArticles.length > 0 ? (
                                              filteredKbArticles.map(article => (
                                                  <button 
                                                    key={article.id}
                                                    type="button"
                                                    onClick={() => handleInsertKbArticle(article)}
                                                    className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 truncate block transition-colors"
                                                  >
                                                      {article.title}
                                                  </button>
                                              ))
                                          ) : (
                                              <div className="p-3 text-center text-xs text-gray-400 italic">No articles found.</div>
                                          )}
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                      
                      <form onSubmit={handleSendReply}>
                          <textarea 
                              className="w-full h-32 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-700 dark:text-gray-300 resize-none transition-all placeholder:text-gray-400 mb-3"
                              placeholder="Type your response here..."
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                          />
                          <div className="flex justify-between items-center">
                              {selectedTicket.status !== TicketStatus.RESOLVED && (
                                  <button 
                                    type="button" 
                                    onClick={async () => {
                                        await onUpdateTicket(selectedTicket.id, { status: TicketStatus.RESOLVED });
                                        setSelectedTicket(prev => prev ? { ...prev, status: TicketStatus.RESOLVED } : null);
                                    }}
                                    className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
                                  >
                                      <CheckCircle size={12} /> Mark as Resolved
                                  </button>
                              )}
                              <div className="ml-auto">
                                  <button 
                                    type="submit" 
                                    disabled={isSendingReply || !replyText.trim()} 
                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                                  >
                                    {isSendingReply ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={16} />}
                                    Send Reply
                                  </button>
                              </div>
                          </div>
                      </form>
                  </div>
              </div>
           </div>
        </div>
      )}

      {/* Add Ticket Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-colors">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                          <LifeBuoy size={18} className="text-blue-500" />
                          New Support Ticket
                      </h3>
                      <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject <span className="text-red-500">*</span></label>
                          <input 
                            required 
                            type="text" 
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                            value={newTicket.subject} 
                            onChange={e => setNewTicket({...newTicket, subject: e.target.value})} 
                            placeholder="e.g. Account lockout" 
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="text-red-500">*</span></label>
                          <textarea 
                            required 
                            rows={3}
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none" 
                            value={newTicket.description} 
                            onChange={e => setNewTicket({...newTicket, description: e.target.value})} 
                            placeholder="Provide details about the issue..." 
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                              <select 
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                value={newTicket.priority}
                                onChange={e => setNewTicket({...newTicket, priority: e.target.value as TaskPriority})}
                              >
                                  <option value={TaskPriority.LOW}>Low</option>
                                  <option value={TaskPriority.MEDIUM}>Medium</option>
                                  <option value={TaskPriority.HIGH}>High</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link Lead</label>
                              <select 
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                value={newTicket.leadId}
                                onChange={e => setNewTicket({...newTicket, leadId: e.target.value})}
                              >
                                  <option value="">-- No Link --</option>
                                  {leads.map(lead => (
                                      <option key={lead.id} value={lead.id}>{lead.name} ({lead.company})</option>
                                  ))}
                              </select>
                          </div>
                      </div>
                      <div className="pt-4 flex justify-end gap-3">
                          <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                              Cancel
                          </button>
                          <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md flex items-center gap-2">
                              Create Ticket <ArrowRight size={14} />
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
