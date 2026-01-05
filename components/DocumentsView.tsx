
import React, { useState } from 'react';
import { Document, DocumentVersion, User } from '../types';
import { FileText, FileSpreadsheet, File, FileImage, Lock, Globe, Plus, Trash2, Download, Search, Upload, X, Shield, Edit, Copy, History, RotateCcw } from 'lucide-react';

interface DocumentsViewProps {
    documents: Document[];
    user: User;
    onAddDocument: (doc: Omit<Document, 'id' | 'createdAt' | 'tenantId' | 'uploaderId' | 'uploaderName'>, file: File) => Promise<void>;
    onAddVersion: (docId: string, version: Omit<DocumentVersion, 'id' | 'createdAt'>, file: File) => Promise<void>;
    onRevertVersion: (docId: string, versionId: string) => Promise<void>;
    onEditDocument: (id: string, updates: Partial<Document>) => Promise<void>;
    onDeleteDocument: (id: string) => Promise<void>;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ documents, user, onAddDocument, onAddVersion, onRevertVersion, onEditDocument, onDeleteDocument }) => {
    const [filter, setFilter] = useState<'ALL' | 'PRIVATE'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Modals State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadMode, setUploadMode] = useState<'NEW' | 'VERSION'>('NEW');
    const [historyDoc, setHistoryDoc] = useState<Document | null>(null);
    const [editingDoc, setEditingDoc] = useState<Document | null>(null);

    // Upload State
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isPublic, setIsPublic] = useState(true);
    const [docType, setDocType] = useState<Document['type']>('OTHER');

    // Progress State
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Edit State
    const [editName, setEditName] = useState('');
    const [editIsPublic, setEditIsPublic] = useState(true);

    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'ALL' ? true : (!doc.isPublic && doc.uploaderId === user.id);
        return matchesSearch && matchesFilter;
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);

            // Auto-detect type
            if (file.type.includes('pdf')) setDocType('PDF');
            else if (file.type.includes('sheet') || file.type.includes('excel') || file.name.endsWith('.csv')) setDocType('SPREADSHEET');
            else if (file.type.includes('word') || file.type.includes('document')) setDocType('DOC');
            else if (file.type.includes('image')) setDocType('IMAGE');
            else setDocType('OTHER');
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;

        setIsUploading(true);
        setUploadProgress(0);

        // Simulate upload progress
        const steps = 20;
        for (let i = 1; i <= steps; i++) {
            await new Promise(resolve => setTimeout(resolve, 80)); // Simulate chunk upload
            setUploadProgress((i / steps) * 90); // Go up to 90%
        }

        if (uploadMode === 'NEW') {
            await onAddDocument({
                name: selectedFile.name,
                size: selectedFile.size,
                type: docType,
                isPublic
            }, selectedFile);
        } else if (uploadMode === 'VERSION' && historyDoc) {
            await onAddVersion(historyDoc.id, {
                name: selectedFile.name,
                size: selectedFile.size,
                type: docType,
                uploaderId: user.id,
                uploaderName: user.name
            }, selectedFile);
        }

        setUploadProgress(100);
        // Short delay to see 100%
        await new Promise(resolve => setTimeout(resolve, 500));

        setIsUploadModalOpen(false);
        setSelectedFile(null);
        setIsPublic(true);
        setDocType('OTHER');
        setIsUploading(false);
        setUploadProgress(0);
        setHistoryDoc(null); // Close history/context if open
    };

    const handleOpenUploadNewVersion = (doc: Document) => {
        setHistoryDoc(doc);
        setUploadMode('VERSION');
        setIsUploadModalOpen(true);
    };

    const handleOpenEdit = (doc: Document) => {
        setEditingDoc(doc);
        setEditName(doc.name);
        setEditIsPublic(doc.isPublic);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDoc) return;
        await onEditDocument(editingDoc.id, {
            name: editName,
            isPublic: editIsPublic
        });
        setEditingDoc(null);
    };

    const handleCopy = async (doc: Document) => {
        await onAddDocument({
            name: `Copy of ${doc.name}`,
            size: doc.size,
            type: doc.type,
            isPublic: doc.isPublic
        });
    };

    const handleRevert = async (doc: Document, versionId: string) => {
        if (confirm('Are you sure you want to restore this version? It will be created as a new version at the top of the history stack.')) {
            await onRevertVersion(doc.id, versionId);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getIcon = (type: Document['type']) => {
        switch (type) {
            case 'PDF': return <FileText className="text-red-500" size={24} />;
            case 'SPREADSHEET': return <FileSpreadsheet className="text-green-500" size={24} />;
            case 'DOC': return <FileText className="text-blue-500" size={24} />;
            case 'IMAGE': return <FileImage className="text-purple-500" size={24} />;
            default: return <File className="text-gray-400" size={24} />;
        }
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Documents</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage contracts, invoices, and internal files.</p>
                </div>
                <button
                    onClick={() => { setUploadMode('NEW'); setIsUploadModalOpen(true); }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                    <Upload size={18} />
                    Upload File
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 flex shadow-sm">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'ALL' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                    >
                        All Files
                    </button>
                    <button
                        onClick={() => setFilter('PRIVATE')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'PRIVATE' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
                    >
                        My Private Files
                    </button>
                </div>

                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm text-gray-900 dark:text-white transition-all shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12"></th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Access</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Uploaded By</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Size</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Modified</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredDocs.length > 0 ? filteredDocs.map(doc => (
                                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        {getIcon(doc.type)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">{doc.name}</p>
                                            <span className="text-xs text-gray-400">v{doc.versions ? doc.versions.length : 1}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {doc.isPublic ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                <Globe size={12} /> Public
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                <Lock size={12} /> Private
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                                                {doc.uploaderName.charAt(0)}
                                            </div>
                                            <span className="text-sm text-gray-600 dark:text-gray-300">{doc.uploaderId === user.id ? 'You' : doc.uploaderName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
                                        {formatSize(doc.size)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(doc.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                                title="Download Latest"
                                            >
                                                <Download size={16} />
                                            </button>

                                            <button
                                                onClick={() => setHistoryDoc(doc)}
                                                className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                                title="Version History"
                                            >
                                                <History size={16} />
                                            </button>

                                            {doc.uploaderId === user.id && (
                                                <>
                                                    <button
                                                        onClick={() => handleOpenEdit(doc)}
                                                        className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit size={16} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleCopy(doc)}
                                                        className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                                        title="Copy"
                                                    >
                                                        <Copy size={16} />
                                                    </button>

                                                    <button
                                                        onClick={() => onDeleteDocument(doc.id)}
                                                        className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <File className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                            <p>No documents found matching your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Version History Modal */}
            {historyDoc && !isUploadModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden transition-colors flex flex-col max-h-[80vh]">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                            <div className="flex items-center gap-2">
                                <History size={18} className="text-blue-500" />
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Version History</h3>
                            </div>
                            <button onClick={() => setHistoryDoc(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 bg-blue-50 dark:bg-blue-900/10 flex items-center justify-between border-b border-blue-100 dark:border-blue-800">
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{historyDoc.name}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Current Version: v{historyDoc.versions?.length || 1}</p>
                            </div>
                            <button
                                onClick={() => handleOpenUploadNewVersion(historyDoc)}
                                className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
                            >
                                <Upload size={14} />
                                Upload New Version
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-0">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-100 dark:border-gray-700 sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold">Version</th>
                                        <th className="px-6 py-3 font-semibold">Date</th>
                                        <th className="px-6 py-3 font-semibold">Uploaded By</th>
                                        <th className="px-6 py-3 font-semibold">Size</th>
                                        <th className="px-6 py-3 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {historyDoc.versions && historyDoc.versions.map((version, index) => {
                                        const isLatest = index === 0;
                                        return (
                                            <tr key={version.id} className={`${isLatest ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''} hover:bg-gray-50 dark:hover:bg-gray-700/50`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isLatest ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                            v{historyDoc.versions.length - index}
                                                        </span>
                                                        {isLatest && <span className="text-xs text-green-600 font-medium">Current</span>}
                                                    </div>
                                                    {!isLatest && <p className="text-xs text-gray-400 mt-1 truncate max-w-[150px]">{version.name}</p>}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                    {new Date(version.createdAt).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                    {version.uploaderName}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-mono text-gray-500 dark:text-gray-400">
                                                    {formatSize(version.size)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button className="text-blue-600 hover:underline text-xs font-medium">Download</button>
                                                        {!isLatest && (
                                                            <button
                                                                onClick={() => handleRevert(historyDoc, version.id)}
                                                                className="flex items-center gap-1 text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 text-xs font-medium transition-colors"
                                                                title="Restore this version"
                                                            >
                                                                <RotateCcw size={12} /> Restore
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingDoc && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-colors">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Edit size={18} className="text-blue-500" />
                                Edit Document
                            </h3>
                            <button onClick={() => setEditingDoc(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Document Name</label>
                                <input
                                    type="text"
                                    required
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Access Control</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditIsPublic(true)}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${editIsPublic ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}
                                    >
                                        <Globe size={16} />
                                        <span className="text-sm font-medium">Public</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditIsPublic(false)}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${!editIsPublic ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'}`}
                                    >
                                        <Lock size={16} />
                                        <span className="text-sm font-medium">Private</span>
                                    </button>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingDoc(null)}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-colors">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Upload size={18} className="text-blue-500" />
                                {uploadMode === 'NEW' ? 'Upload Document' : 'Upload New Version'}
                            </h3>
                            {!isUploading && (
                                <button onClick={() => { setIsUploadModalOpen(false); setHistoryDoc(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                                    <X size={20} />
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleUpload} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select File</label>
                                <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors bg-gray-50 dark:bg-gray-700/30 ${isUploading ? 'border-gray-200 dark:border-gray-600 opacity-50 cursor-not-allowed' : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400'}`}>
                                    <input
                                        type="file"
                                        onChange={handleFileSelect}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                        required
                                        disabled={isUploading}
                                    />
                                    {selectedFile ? (
                                        <div className="flex flex-col items-center gap-2">
                                            {getIcon(docType)}
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{selectedFile.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatSize(selectedFile.size)}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                                            <Upload size={24} />
                                            <p className="text-sm">Click to browse or drag file here</p>
                                            <p className="text-xs opacity-75">PDF, Excel, Word, Images up to 10MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Only show access control for new docs, not versions (versions inherit doc access) */}
                            {selectedFile && uploadMode === 'NEW' && (
                                <div className="space-y-4 pt-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Access Control</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setIsPublic(true)}
                                                disabled={isUploading}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${isPublic ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'} ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <Globe size={16} />
                                                <span className="text-sm font-medium">Public</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsPublic(false)}
                                                disabled={isUploading}
                                                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${!isPublic ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'} ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <Lock size={16} />
                                                <span className="text-sm font-medium">Private</span>
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                            {isPublic ? 'Visible to everyone in your organization.' : 'Only visible to you and administrators.'}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {isUploading ? (
                                <div className="pt-8 pb-4 space-y-3">
                                    <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                                        <span>Uploading...</span>
                                        <span>{Math.round(uploadProgress)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                        <div
                                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">Please wait while we process your file.</p>
                                </div>
                            ) : (
                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setIsUploadModalOpen(false); setHistoryDoc(null); }}
                                        className="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!selectedFile}
                                        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Upload
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
