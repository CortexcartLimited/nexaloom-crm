import React from 'react';
import { Proposal, ProposalStatus } from './types';
import { formatCurrency } from './utils/formatCurrency';
import { ScrollText, User as UserIcon, Calendar, Eye, Send, Trash2, Plus } from 'lucide-react';

interface ProposalListProps {
    proposals: Proposal[];
    onView: (id: string) => void;
    onDelete: (id: string) => void;
    onSend: (id: string) => void;
    onCreate: () => void;
}

export const ProposalList: React.FC<ProposalListProps> = ({
    proposals, onView, onDelete, onSend, onCreate
}) => {

    const getStatusColor = (status: ProposalStatus) => {
        switch (status) {
            case ProposalStatus.DRAFT: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
            case ProposalStatus.SENT: return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
            case ProposalStatus.VIEWED: return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
            case ProposalStatus.ACCEPTED: return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
            case ProposalStatus.DECLINED: return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Proposals & Quotes</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and send official quotes to your leads.</p>
                </div>
                <button
                    onClick={onCreate}
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
                                {/* DYNAMIC CURRENCY DISPLAY */}
                                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(prop.totalValue || 0, prop.currency)}
                                </span>
                                <span className="text-xs text-gray-400">Total Value</span>
                            </div>

                            <div className="flex items-center gap-2 border-l border-gray-100 dark:border-gray-700 pl-6">
                                <button
                                    onClick={() => onView(prop.id)}
                                    className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    title="View & Edit"
                                >
                                    <Eye size={18} />
                                </button>
                                {prop.status === ProposalStatus.DRAFT && (
                                    <button
                                        onClick={() => onSend(prop.id)}
                                        className="p-2 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        title="Send to Client"
                                    >
                                        <Send size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={() => onDelete(prop.id)}
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
        </div>
    );
};
