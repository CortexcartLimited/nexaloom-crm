import React, { useState, useEffect } from 'react';
import { DemoAccount, Lead, User, Interaction } from '../types';
import { Monitor, Loader2, ExternalLink, Trash2, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface DemoAccountsViewProps {
    demoAccounts: DemoAccount[];
    leads: Lead[];
    user: User;
    onAddDemo: (demo: Omit<DemoAccount, 'id' | 'tenantId' | 'createdAt' | 'status'>) => Promise<void>;
    onDeleteDemo: (id: string) => Promise<void>;
    onAddInteraction: (interaction: Interaction) => Promise<void>;
}

export const DemoAccountsView: React.FC<DemoAccountsViewProps> = ({
    leads: initialLeads,
    user,
    onDeleteDemo
}) => {
    const [leads, setLeads] = useState<Lead[]>(initialLeads);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [terminatingId, setTerminatingId] = useState<string | null>(null);

    // Sync with props
    useEffect(() => {
        setLeads(initialLeads);
    }, [initialLeads]);

    const refreshLeads = async () => {
        if (!user?.tenantId) return;
        setIsRefreshing(true);
        try {
            const updatedLeads = await api.getLeads(user.tenantId);
            setLeads(updatedLeads);
        } catch (error) {
            console.error("Failed to refresh leads", error);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Auto-Refresh Polling (30s)
    useEffect(() => {
        const interval = setInterval(async () => {
            await refreshLeads();
        }, 30000);
        return () => clearInterval(interval);
    }, [user?.tenantId]);

    // Filter Logic: Active or Provisioning
    const activeDemos = leads.filter(l =>
        (l.demo_status === 'ACTIVE' || l.demo_status === 'PROVISIONING') &&
        // Ensure we have a port OR it's provisioning (and thus waiting for one)
        (l.demo_port || l.demo_status === 'PROVISIONING')
    );

    const handleTerminate = async (lead: Lead) => {
        if (!window.confirm(`Are you sure you want to terminate the demo for ${lead.name}?`)) return;
        setTerminatingId(lead.id);
        try {
            // Call the API to terminate (backend + agent)
            await api.terminateDemo(lead.id);
            // Notify parent if needed (optimistic UI update handled by refresh usually, but let's be safe)
            await onDeleteDemo(lead.id);
            // Trigger immediate refresh
            await refreshLeads();
        } catch (error) {
            alert('Failed to terminate demo: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setTerminatingId(null);
        }
    };

    return (
        <div className="p-8 h-full flex flex-col bg-gray-50/50 dark:bg-gray-900/50">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Active Demo Monitors</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Real-time status of running customer environments.</p>
                </div>
                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Loader2 size={12} className={isRefreshing ? "animate-spin text-blue-500" : "text-gray-300"} />
                        Auto-refresh (30s)
                    </span>
                    <div className="h-4 w-px bg-gray-200 dark:bg-gray-700"></div>
                    <button
                        onClick={refreshLeads}
                        className={`p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                        title="Refresh List"
                    >
                        <RefreshCw size={14} />
                    </button>
                </div>
            </div>

            {/* Monitoring Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Lead Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Port</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {activeDemos.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-300 dark:text-gray-600">
                                                <Monitor size={32} />
                                            </div>
                                            <h3 className="text-gray-900 dark:text-white font-medium">No Active Demos</h3>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">There are no demos currently running or provisioning.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                activeDemos.map(lead => (
                                    <tr key={lead.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-white text-sm">{lead.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{lead.company}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded w-fit">
                                                {lead.demo_port || '...'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.demo_status === 'PROVISIONING' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                                                    <Loader2 size={12} className="animate-spin" />
                                                    PROVISIONING
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-100 dark:border-green-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                    ACTIVE
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-100">
                                                {lead.demo_status === 'ACTIVE' && lead.demo_port && (
                                                    <a
                                                        href={`http://demo.cortexcart.com:${lead.demo_port}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5 shadow-sm"
                                                    >
                                                        <ExternalLink size={14} />
                                                        View
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => handleTerminate(lead)}
                                                    disabled={terminatingId === lead.id}
                                                    className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 border border-red-100 dark:border-red-800/50 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                    {terminatingId === lead.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                    Terminate
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
