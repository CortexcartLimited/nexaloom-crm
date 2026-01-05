
import React, { useState } from 'react';
import { KnowledgeBaseArticle, User } from '../types';
import { BookOpen, Search, Plus, X, Edit, Trash2, Tag, Calendar, User as UserIcon, Globe, Lock } from 'lucide-react';

interface KnowledgeBaseViewProps {
    articles: KnowledgeBaseArticle[];
    user: User;
    onAddArticle: (article: Omit<KnowledgeBaseArticle, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    onUpdateArticle: (id: string, updates: Partial<KnowledgeBaseArticle>) => Promise<void>;
    onDeleteArticle: (id: string) => Promise<void>;
}

export const KnowledgeBaseView: React.FC<KnowledgeBaseViewProps> = ({ articles, user, onAddArticle, onUpdateArticle, onDeleteArticle }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingArticleId, setEditingArticleId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: '',
        tags: '',
        isPublic: true
    });

    const categories = Array.from(new Set(articles.map(a => a.category)));

    const filteredArticles = articles.filter(a => {
        const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.content.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'ALL' || a.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleOpenModal = (article?: KnowledgeBaseArticle) => {
        if (article) {
            setEditingArticleId(article.id);
            setFormData({
                title: article.title,
                content: article.content,
                category: article.category,
                tags: article.tags.join(', '),
                isPublic: article.isPublic
            });
        } else {
            setEditingArticleId(null);
            setFormData({
                title: '',
                content: '',
                category: '',
                tags: '',
                isPublic: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t);

        const payload = {
            tenantId: user.tenantId,
            title: formData.title,
            content: formData.content,
            category: formData.category || 'General',
            tags: tagsArray,
            authorId: user.id,
            authorName: user.name,
            isPublic: formData.isPublic
        };

        if (editingArticleId) {
            await onUpdateArticle(editingArticleId, payload);
        } else {
            await onAddArticle(payload);
        }
        setIsModalOpen(false);
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Knowledge Base</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage documentation, SOPs, and help guides.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
                >
                    <Plus size={18} />
                    Write Article
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
                {/* Sidebar Filters */}
                <div className="w-full lg:w-64 flex flex-col gap-4 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search articles..."
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-3 border-b border-gray-100 dark:border-gray-700 font-semibold text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Categories
                        </div>
                        <div className="p-2 space-y-1">
                            <button
                                onClick={() => setSelectedCategory('ALL')}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${selectedCategory === 'ALL' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                            >
                                All Articles
                                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{articles.length}</span>
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${selectedCategory === cat ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                                >
                                    {cat}
                                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{articles.filter(a => a.category === cat).length}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Article List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredArticles.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredArticles.map(article => (
                                <div key={article.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded uppercase tracking-wide">
                                                {article.category}
                                            </span>
                                            {article.isPublic ? (
                                                <span className="text-xs flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded"><Globe size={10} /> Public</span>
                                            ) : (
                                                <span className="text-xs flex items-center gap-1 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded"><Lock size={10} /> Internal</span>
                                            )}
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleOpenModal(article)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => onDeleteArticle(article.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{article.title}</h3>
                                    <div
                                        className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4 leading-relaxed prose dark:prose-invert max-w-none [&>*]:m-0 [&>p]:m-0"
                                        dangerouslySetInnerHTML={{ __html: article.content }}
                                    />

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 mt-auto">
                                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1"><UserIcon size={12} /> {article.authorName}</span>
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(article.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {article.tags.map(tag => (
                                                <span key={tag} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded flex items-center gap-1">
                                                    <Tag size={10} /> {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <BookOpen size={48} className="opacity-20 mb-4" />
                            <p className="font-medium">No articles found.</p>
                            <p className="text-sm">Try adjusting your search or create a new article.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <BookOpen size={18} className="text-blue-500" />
                                {editingArticleId ? 'Edit Article' : 'New Article'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-6 overflow-hidden">
                            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. How to integrate Webhooks"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                                            placeholder="e.g. Technical"
                                            list="category-options"
                                        />
                                        <datalist id="category-options">
                                            {categories.map(c => <option key={c} value={c} />)}
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tags (comma separated)</label>
                                        <input
                                            type="text"
                                            className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            value={formData.tags}
                                            onChange={e => setFormData({ ...formData, tags: e.target.value })}
                                            placeholder="api, guide, setup"
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col min-h-[200px]">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                                    <textarea
                                        required
                                        className="w-full flex-1 rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                        value={formData.content}
                                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                                        placeholder="Write your article content here..."
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isPublic"
                                        checked={formData.isPublic}
                                        onChange={e => setFormData({ ...formData, isPublic: e.target.checked })}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="isPublic" className="text-sm text-gray-700 dark:text-gray-300">Public Article (Visible in Customer Portal)</label>
                                </div>
                            </div>

                            <div className="pt-6 mt-2 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                                >
                                    {editingArticleId ? 'Save Changes' : 'Create Article'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
