import React, { useState, useEffect } from 'react';
import { DemoAccount, Lead, User, Interaction } from '../types';
import { Rocket, ExternalLink, Shield, Trash2, Clock, CheckCircle, User as UserIcon, X, Wand2, Monitor, AlertTriangle, Calendar, RefreshCw, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

interface DemoAccountsViewProps {
    demoAccounts: DemoAccount[];
    leads: Lead[];
    user: User;
    onAddDemo: (demo: Omit<DemoAccount, 'id' | 'tenantId' | 'createdAt' | 'status'>) => Promise<void>;
    onDeleteDemo: (id: string) => Promise<void>;
    onAddInteraction: (interaction: Interaction) => Promise<void>;
}

// Interface for the data coming from the agent
interface AgentDemo {
    project_name: string;
    port: number;
    status?: string;
}

export const DemoAccountsView: React.FC<DemoAccountsViewProps> = ({ demoAccounts, leads, user, onAddDemo, onDeleteDemo, onAddInteraction }) => {
    const [liveDemos, setLiveDemos] = useState<AgentDemo[]>([]);
    const [isLoadingDemos, setIsLoadingDemos] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
    const [provisioning, setProvisioning] = useState(false);

    // Termination State
    const [isTerminateModalOpen, setIsTerminateModalOpen] = useState(false);
    const [demoToTerminate, setDemoToTerminate] = useState<AgentDemo | null>(null);

    // Provision Form State
    const [selectedLeadId, setSelectedLeadId] = useState('');
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 7);
    const [expiryDate, setExpiryDate] = useState(defaultExpiry.toISOString().split('T')[0]);

    // FETCH DATA FROM AGENT
    useEffect(() => {
        const fetchDemos = async () => {
            setIsLoadingDemos(true);
            try {
                // Fetch directly from the agent
                // Note: Direct browser-to-VM request. 
                // Ensure CORS is allowed on the agent or this might need a proxy.
                // Assuming internal network or appropriate CORS headers on the agent.
                const response = await fetch('http://35.208.82.250:5001/list-demos');
                if (!response.ok) throw new Error('Failed to fetch demos from agent');

                const data = await response.json();
                // Adjusting based on common patterns, assuming array or { demos: [] }
                const list = Array.isArray(data) ? data : (data.demos || []);
                setLiveDemos(list);
            } catch (error) {
                console.error("Agent Fetch Error:", error);
                // Fallback to empty or show error state if needed
                // For now, keeping liveDemos empty implies "No Active Demos" or error
            } finally {
                setIsLoadingDemos(false);
            }
        };

        fetchDemos();
    }, [refreshTrigger]);

    const handleProvision = async (e: React.FormEvent) => {
        e.preventDefault();
        const lead = leads.find(l => l.id === selectedLeadId);
        if (!lead) return;

        setProvisioning(true);
        try {
            const result = await api.provisionDemo(lead.id);
            // After successful provision, refresh the list
            setTimeout(() => setRefreshTrigger(prev => prev + 1), 2000); // Give it a moment to appear

            setProvisioning(false);
            setIsProvisionModalOpen(false);
            setSelectedLeadId('');
        } catch (err: any) {
            alert(err.message || 'Failed to provision demo');
            setProvisioning(false);
        }
    };

    const confirmDecommission = (demo: AgentDemo) => {
        setDemoToTerminate(demo);
        setIsTerminateModalOpen(true);
    };

    const processDecommission = async () => {
        if (!demoToTerminate) return;

        // Optimistic UI updates
        setIsTerminateModalOpen(false);

        // Toast notification (Custom simplified implementation)
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-[200] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2';
        toast.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> <div><p class="font-bold text-sm">Termination Started</p><p class="text-xs text-gray-400">We will notify you when resources are cleared.</p></div>`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);

        try {
            // Send DELETE request to agent
            const response = await fetch('http://35.208.82.250:5001/deploy', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port: demoToTerminate.port })
            });

            if (response.ok) {
                // Success
                alert(`Success: Demo ${demoToTerminate.project_name} has been fully terminated.`);
                setRefreshTrigger(prev => prev + 1); // Refresh list
            } else {
                const errText = await response.text();
                throw new Error(errText || 'Agent responded with error');
            }
        } catch (error) {
            console.error("Termination Failed:", error);
            // In case of error, we might want to alert the user
            alert(`Termination Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    return (
        <div className="p-8 h-full flex flex-col bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Active Deployments</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage live demo instances running on the GCP Agent.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setRefreshTrigger(prev => prev + 1)}
                        className="p-2 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="Refresh List"
                    >
                        <RefreshCw size={20} className={isLoadingDemos ? "animate-spin" : ""} />
                    </button>
                    <button
                        onClick={() => setIsProvisionModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-105 active:scale-95 font-bold"
                    >
                        <Rocket size={18} />
                        Launch New Demo
                    </button>
                </div>
            </div>

            {isLoadingDemos ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 animate-pulse">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full mb-4"></div>
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
                    <div className="h-3 w-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
                </div>
            ) : liveDemos.length === 0 ? (
                /* Empty State */
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800/50">
                    <div className="w-24 h-24 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
                        <Monitor size={48} className="text-gray-300 dark:text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Active Demos</h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-8">
                        There are no demo instances currently running on the server. You can provision a new one or check back later.
                    </p>
                    <button
                        onClick={() => setIsProvisionModalOpen(true)}
                        className="text-indigo-600 font-bold hover:underline flex items-center gap-2"
                    >
                        Launch your first demo <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center"><ArrowRight size={14} /></div>
                    </button>
                </div>
            ) : (
                /* Cards Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto pb-20 custom-scrollbar">
                    {liveDemos.map((demo, idx) => (
                        <div key={`${demo.project_name}-${idx}`} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col">

                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center shrink-0">
                                        <Monitor size={24} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate" title={demo.project_name}>
                                            {demo.project_name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] font-bold uppercase tracking-wide border border-green-200 dark:border-green-800">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                                Running
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-mono">ID: {idx + 1}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 mb-6 flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-gray-700 group-hover:border-indigo-200 dark:group-hover:border-indigo-900/50 transition-colors">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Running on Port</span>
                                <span className="text-5xl font-black text-gray-900 dark:text-white font-mono tracking-tighter">
                                    {demo.port}
                                </span>
                            </div>

                            <div className="space-y-3 mt-auto">
                                <button
                                    onClick={() => window.open(`http://35.208.82.250:${demo.port}`, '_blank')}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                                >
                                    Enter Demo Environment <ExternalLink size={16} />
                                </button>
                                <button
                                    onClick={() => confirmDecommission(demo)}
                                    className="w-full py-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors opacity-80 hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                    Decommission Demo
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Termination Confirmation Modal */}
            {isTerminateModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 border-2 border-red-100 dark:border-red-900/30">
                        <div className="w-14 h-14 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle size={28} />
                        </div>
                        <h3 className="text-xl font-black text-center text-gray-900 dark:text-white mb-2">Decommission Demo?</h3>
                        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-8">
                            This will <strong className="text-red-500">permanently delete</strong> the demo instance for <strong>{demoToTerminate?.project_name}</strong> and all associated data. This action cannot be undone.
                        </p>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setIsTerminateModalOpen(false)}
                                className="py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={processDecommission}
                                className="py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-200 dark:shadow-none transition-transform active:scale-95"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Provision Modal (kept similar for creating new ones) */}
            {isProvisionModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-colors">
                        {/* Title Bar */}
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
                                    Nexaloom will automatically spin up a sandboxed environment of the <strong>CortexCart Dashboard</strong>.
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
