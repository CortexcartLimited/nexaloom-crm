
import React, { useState } from 'react';
import { DemoAccount, Lead, User, Interaction } from '../types';
import { Plus, Rocket, ExternalLink, Shield, Mail, Trash2, Clock, CheckCircle, User as UserIcon, X, Wand2, Monitor, ShoppingCart, BarChart3, ChevronRight, Send, ArrowRight, AlertTriangle, Calendar } from 'lucide-react';

interface DemoAccountsViewProps {
  demoAccounts: DemoAccount[];
  leads: Lead[];
  user: User;
  onAddDemo: (demo: Omit<DemoAccount, 'id' | 'tenantId' | 'createdAt' | 'status'>) => Promise<void>;
  onDeleteDemo: (id: string) => Promise<void>;
  onAddInteraction: (interaction: Interaction) => Promise<void>;
}

export const DemoAccountsView: React.FC<DemoAccountsViewProps> = ({ demoAccounts, leads, user, onAddDemo, onDeleteDemo, onAddInteraction }) => {
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  
  // Expiration State - Default to 7 days from now
  const defaultExpiry = new Date();
  defaultExpiry.setDate(defaultExpiry.getDate() + 7);
  const [expiryDate, setExpiryDate] = useState(defaultExpiry.toISOString().split('T')[0]);
  
  const [showSim, setShowSim] = useState(false);
  const [activeSimAccount, setActiveSimAccount] = useState<DemoAccount | null>(null);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    const lead = leads.find(l => l.id === selectedLeadId);
    if (!lead) return;

    setProvisioning(true);
    // Simulate server processing / spinning up a dummy Docker container/env
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Use the specified expiry date or default to 7 days if somehow empty
    const finalExpiry = expiryDate ? new Date(expiryDate).toISOString() : new Date(Date.now() + 86400000 * 7).toISOString();

    const username = `demo_${lead.name.split(' ')[0].toLowerCase()}_${Math.floor(Math.random() * 1000)}`;
    const password = Math.random().toString(36).substring(2, 10);

    await onAddDemo({
        leadId: lead.id,
        leadName: lead.name,
        username: username,
        passwordHash: password,
        expiresAt: finalExpiry
    });

    // Create Audit Log Interaction
    const now = new Date();
    const timestamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const expiryDisplay = new Date(finalExpiry).toLocaleDateString();

    let logNote = `DEMO PROVISIONED: ${user.name} (ID: ${user.id}) - ${timestamp}\n`;
    logNote += `Target Account: ${lead.name} (${lead.company})\n`;
    logNote += `Action: Created sandbox environment for CortexCart Insight Dashboard\n`;
    logNote += `------------------------------------------------\n`;
    logNote += `Environment ID: ${username}\n`;
    logNote += `Temporary Password: ${password}\n`;
    logNote += `Expiry Date: ${expiryDisplay}\n`;
    logNote += `Status: ACTIVE`;

    const interaction: Interaction = {
        id: `int-demo-${Date.now()}`,
        tenantId: user.tenantId,
        leadId: lead.id,
        type: 'NOTE',
        notes: logNote,
        date: now.toISOString()
    };

    await onAddInteraction(interaction);

    setProvisioning(false);
    setIsProvisionModalOpen(false);
    setSelectedLeadId('');
    setExpiryDate(defaultExpiry.toISOString().split('T')[0]);
  };

  const handleOpenSim = (account: DemoAccount) => {
      const isExpired = new Date(account.expiresAt) < new Date();
      if (isExpired) {
          alert("This demo environment has expired. Please provision a new one or renew access.");
          return;
      }
      setActiveSimAccount(account);
      setShowSim(true);
  };

  const handleEmailDetails = (account: DemoAccount) => {
      const lead = leads.find(l => l.id === account.leadId);
      if (!lead) return;
      
      const subject = encodeURIComponent(`Your CortexCart Insight Dashboard Demo Access`);
      const body = encodeURIComponent(`Hi ${lead.name},\n\nYour demo environment for CortexCart Insight Dashboard is ready!\n\nLink: https://demo.cortexcart.io/v1/${account.username}\nUsername: ${account.username}\nPassword: ${account.passwordHash}\n\nThis environment will expire on ${new Date(account.expiresAt).toLocaleDateString()}.\n\nBest regards,\nSales Team`);
      
      window.open(`mailto:${lead.email}?subject=${subject}&body=${body}`);
  };

  if (showSim && activeSimAccount) {
      return <CortexCartSim account={activeSimAccount} onExit={() => setShowSim(false)} />;
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Product Demos</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Provision demo environments for CortexCart Insight Dashboard.</p>
        </div>
        <button 
          onClick={() => setIsProvisionModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-bold"
        >
          <Rocket size={18} />
          Provision New Demo
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex-1 overflow-hidden flex flex-col">
          <div className="overflow-x-auto custom-scrollbar flex-1">
              <table className="w-full text-left">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                      <tr>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client / Lead</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Environment ID</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expiry</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Demo Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {demoAccounts.map(account => {
                          const isExpired = new Date(account.expiresAt) < new Date();
                          return (
                          <tr key={account.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group ${isExpired ? 'opacity-75' : ''}`}>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isExpired ? 'bg-gray-100 dark:bg-gray-700 text-gray-400' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'}`}>
                                          <UserIcon size={16} />
                                      </div>
                                      <div>
                                          <p className={`font-medium text-gray-900 dark:text-white ${isExpired ? 'line-through decoration-gray-400' : ''}`}>{account.leadName}</p>
                                          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase">CortexCart v2.4</p>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                                  {account.username}
                              </td>
                              <td className="px-6 py-4">
                                  {isExpired ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-800">
                                          <AlertTriangle size={10} /> Expired
                                      </span>
                                  ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                                          <CheckCircle size={10} /> Active
                                      </span>
                                  )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                  <div className={`flex items-center gap-1.5 ${isExpired ? 'text-red-500 dark:text-red-400' : ''}`}>
                                      <Clock size={14} />
                                      {new Date(account.expiresAt).toLocaleDateString()}
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                      <button 
                                        onClick={() => handleEmailDetails(account)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
                                        title="Email details to lead"
                                      >
                                          <Send size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleOpenSim(account)}
                                        className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-colors ${isExpired ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'}`}
                                      >
                                          <Monitor size={14} /> {isExpired ? 'Disabled' : 'Launch Demo'}
                                      </button>
                                      <button 
                                        onClick={() => onDeleteDemo(account.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-md transition-colors"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </td>
                          </tr>
                        );
                      })}
                      {demoAccounts.length === 0 && (
                          <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-800/30">
                                  <div className="flex flex-col items-center gap-3">
                                      <Rocket size={40} className="opacity-20" />
                                      <p className="text-sm">No demo accounts provisioned yet.</p>
                                  </div>
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Provision Modal */}
      {isProvisionModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-colors">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/20">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                          <Rocket size={18} className="text-indigo-600" />
                          Provision Demo Account
                      </h3>
                      <button onClick={() => setIsProvisionModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleProvision} className="p-6 space-y-5">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 rounded-xl flex gap-3">
                          <Shield size={20} className="text-blue-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-800 dark:text-blue-300">
                              Nexaloom will automatically spin up a sandboxed environment of the <strong>CortexCart Dashboard</strong> and generate unique credentials for your lead.
                          </p>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Target Lead</label>
                          <select 
                            required 
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={selectedLeadId}
                            onChange={(e) => setSelectedLeadId(e.target.value)}
                          >
                              <option value="">-- Select a Lead --</option>
                              {leads.map(lead => (
                                  <option key={lead.id} value={lead.id}>{lead.name} ({lead.company})</option>
                              ))}
                          </select>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2">
                            <Calendar size={14} /> Expiration Date
                          </label>
                          <input 
                            type="date"
                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                          />
                          <p className="text-[10px] text-gray-500 mt-1 italic">Default is 7 days from today if not specified.</p>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Product Type</label>
                          <div className="p-3 border border-indigo-100 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-lg flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                  <ShoppingCart className="text-indigo-600" size={18} />
                                  <span className="text-sm font-bold text-gray-800 dark:text-white">CortexCart Insight Dashboard</span>
                              </div>
                              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase">Standard</span>
                          </div>
                      </div>

                      <div className="pt-4 flex justify-end gap-3">
                          <button 
                            type="button" 
                            onClick={() => setIsProvisionModalOpen(false)} 
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                              Cancel
                          </button>
                          <button 
                            type="submit" 
                            disabled={provisioning || !selectedLeadId}
                            className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                          >
                              {provisioning ? (
                                  <>
                                    <Wand2 size={16} className="animate-spin" />
                                    Spinning up...
                                  </>
                              ) : (
                                  <>
                                    Provision <ArrowRight size={14} />
                                  </>
                              )}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

interface CortexCartSimProps {
    account: DemoAccount;
    onExit: () => void;
}

const CortexCartSim: React.FC<CortexCartSimProps> = ({ account, onExit }) => {
    const isExpired = new Date(account.expiresAt) < new Date();

    // Fake data for the demo app
    const stats = [
        { label: 'Today Revenue', val: '$12,450.00', trend: '+12%', color: 'text-green-600' },
        { label: 'Pending Shipments', val: '45', trend: '-2', color: 'text-amber-600' },
        { label: 'Cart Abandonment', val: '22.4%', trend: '-5%', color: 'text-green-600' },
        { label: 'Active Sessions', val: '892', trend: '+154', color: 'text-blue-600' },
    ];

    const recentOrders = [
        { id: '#4592', customer: 'Alice Cooper', total: '$89.00', status: 'Shipped' },
        { id: '#4593', customer: 'Bob Marley', total: '$142.50', status: 'Processing' },
        { id: '#4594', customer: 'Charlie Brown', total: '$12.99', status: 'Cancelled' },
        { id: '#4595', customer: 'Diana Ross', total: '$322.00', status: 'Delivered' },
    ];

    if (isExpired) {
        return (
            <div className="fixed inset-0 bg-[#0F111A] z-[200] flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full bg-[#161925] border border-red-500/30 rounded-3xl p-10 animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full mx-auto flex items-center justify-center text-red-500 mb-6">
                        <AlertTriangle size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-4">Demo Expired</h2>
                    <p className="text-gray-400 mb-8">Access to this environment for <span className="text-white font-bold">{account.leadName}</span> ended on {new Date(account.expiresAt).toLocaleDateString()}. Please contact your sales representative for a renewal.</p>
                    <button 
                        onClick={onExit}
                        className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white font-bold rounded-2xl transition-all"
                    >
                        Return to Nexaloom
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-[#0F111A] z-[200] flex flex-col text-white font-sans overflow-hidden animate-in fade-in duration-500">
            {/* Simulation Overlay Banner */}
            <div className="bg-indigo-600 px-4 py-1.5 flex items-center justify-between shadow-lg z-50">
                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Monitor size={14}/> Simulation Mode</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded">Lead: {account.leadName}</span>
                </div>
                <button 
                    onClick={onExit}
                    className="flex items-center gap-2 text-xs font-bold hover:bg-white/10 px-3 py-1 rounded transition-colors"
                >
                    <X size={14} /> Exit Sandbox
                </button>
            </div>

            {/* Simulated App Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 border-r border-gray-800 bg-[#161925] p-6 hidden lg:flex flex-col gap-8">
                    <div className="flex items-center gap-2 text-indigo-400">
                        <ShoppingCart size={24} />
                        <h1 className="text-lg font-black italic tracking-tighter">CORTEXCART</h1>
                    </div>
                    <nav className="space-y-4">
                        <div className="bg-indigo-600/10 text-indigo-400 p-2 rounded-lg flex items-center gap-3 text-sm font-bold border border-indigo-500/30">
                            <BarChart3 size={18} /> Dashboard
                        </div>
                        <div className="text-gray-500 p-2 flex items-center gap-3 text-sm font-medium hover:text-white transition-colors cursor-not-allowed opacity-50">
                            <ShoppingCart size={18} /> Orders
                        </div>
                        <div className="text-gray-500 p-2 flex items-center gap-3 text-sm font-medium hover:text-white transition-colors cursor-not-allowed opacity-50">
                            <UserIcon size={18} /> Customers
                        </div>
                    </nav>
                </div>

                {/* Main */}
                <div className="flex-1 flex flex-col p-8 overflow-y-auto custom-scrollbar bg-[#0F111A]">
                    <div className="flex justify-between items-end mb-8">
                        <div>
                            <h2 className="text-3xl font-black text-white mb-2">Commerce Insights</h2>
                            <p className="text-gray-500 font-medium italic">Real-time data for CortexCart Enterprise Suite</p>
                        </div>
                        <div className="bg-[#1C1F2E] p-2 rounded-xl flex gap-2 border border-gray-800">
                            <span className="bg-[#2A2E3F] px-4 py-1.5 rounded-lg text-xs font-bold text-gray-400">Last 24 Hours</span>
                            <ChevronRight size={18} className="text-gray-600 mt-0.5" />
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                        {stats.map((s, i) => (
                            <div key={i} className="bg-[#161925] p-6 rounded-2xl border border-gray-800 hover:border-indigo-500/50 transition-colors group">
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3 group-hover:text-indigo-400 transition-colors">{s.label}</p>
                                <div className="flex items-end justify-between">
                                    <p className="text-2xl font-black">{s.val}</p>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/5 ${s.color}`}>{s.trend}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="bg-[#161925] rounded-3xl border border-gray-800 overflow-hidden mb-8">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="font-black tracking-wide">Live Transaction Stream</h3>
                            <button className="text-indigo-400 text-xs font-bold uppercase hover:underline">Export Report</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#1C1F2E]/50 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Order ID</th>
                                        <th className="px-6 py-4">Customer</th>
                                        <th className="px-6 py-4">Total</th>
                                        <th className="px-6 py-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50">
                                    {recentOrders.map((o, i) => (
                                        <tr key={i} className="text-sm font-medium hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-indigo-400">{o.id}</td>
                                            <td className="px-6 py-4">{o.customer}</td>
                                            <td className="px-6 py-4 font-black">{o.total}</td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                                                    o.status === 'Shipped' ? 'bg-blue-900/40 text-blue-400' :
                                                    o.status === 'Processing' ? 'bg-amber-900/40 text-amber-400' :
                                                    o.status === 'Cancelled' ? 'bg-red-900/40 text-red-400' :
                                                    'bg-green-900/40 text-green-400'
                                                }`}>
                                                    {o.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Chart Dummy */}
                    <div className="bg-[#161925] rounded-3xl border border-gray-800 p-8 h-80 flex flex-col">
                         <div className="flex justify-between items-start mb-6">
                            <h3 className="font-black tracking-wide">Customer Acquisition Trend</h3>
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-indigo-500" />
                                <div className="w-3 h-3 rounded-full bg-gray-700" />
                            </div>
                         </div>
                         <div className="flex-1 flex items-end gap-2 pb-2">
                            {[40, 70, 45, 90, 65, 80, 55, 75, 95, 60, 85, 100].map((h, i) => (
                                <div key={i} className="flex-1 bg-gradient-to-t from-indigo-900 to-indigo-500 rounded-t-lg transition-all duration-1000 hover:opacity-80 cursor-help" style={{ height: `${h}%` }} title={`Month ${i+1}: ${h*120} signups`}></div>
                            ))}
                         </div>
                         <div className="flex justify-between text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-4">
                            <span>Jan</span>
                            <span>Jun</span>
                            <span>Dec</span>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
