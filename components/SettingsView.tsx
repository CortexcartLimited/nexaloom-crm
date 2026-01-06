
import React, { useState } from 'react';
import { Tenant, SmtpConfig } from '../types';
import { Building, Save, Globe, Mail, Phone, CreditCard, Shield, Server, Zap } from 'lucide-react';

interface SettingsViewProps {
    tenant: Tenant;
    onUpdateTenant: (updates: Partial<Tenant>) => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ tenant, onUpdateTenant }) => {
    const [activeTab, setActiveTab] = useState<'GENERAL' | 'SMTP' | 'INTEGRATIONS' | 'SECURITY'>('GENERAL');

    // General State
    const [name, setName] = useState(tenant.name);
    const [companyName, setCompanyName] = useState(tenant.companyName || '');
    const [companyAddress, setCompanyAddress] = useState(tenant.companyAddress || '');
    const [logoUrl, setLogoUrl] = useState(tenant.logoUrl || '');
    const [emailSignature, setEmailSignature] = useState(tenant.emailSignature || '');

    // SMTP State
    const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(tenant.smtpConfig || {
        host: '',
        port: 587,
        user: '',
        pass: '',
        fromEmail: '',
        secure: true
    });

    // Stripe State
    const [stripeAccountId, setStripeAccountId] = useState(tenant.stripeAccountId || '');
    const [stripePublicKey, setStripePublicKey] = useState(tenant.stripePublicKey || '');

    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleGeneralSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onUpdateTenant({ name, companyName, companyAddress, logoUrl, emailSignature });
        setIsSaving(false);
        setSuccessMessage('Organization settings updated successfully.');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleSmtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onUpdateTenant({ smtpConfig });
        setIsSaving(false);
        setSuccessMessage('SMTP configuration saved.');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleStripeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onUpdateTenant({ stripeAccountId, stripePublicKey });
        setIsSaving(false);
        setSuccessMessage('Stripe integration updated.');
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fade-in text-gray-900 dark:text-gray-100 pb-24">
            <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-xl">
                    <Building size={24} className="text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Organization Settings</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your company profile and preferences</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Settings Navigation */}
                <div className="space-y-1">
                    <button
                        onClick={() => setActiveTab('GENERAL')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors ${activeTab === 'GENERAL' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                    >
                        <Building size={18} /> General
                    </button>
                    <button
                        onClick={() => setActiveTab('SMTP')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors ${activeTab === 'SMTP' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                    >
                        <Mail size={18} /> Email & SMTP
                    </button>
                    <button
                        onClick={() => setActiveTab('INTEGRATIONS')}
                        className={`w-full text-left px-4 py-3 rounded-lg font-medium flex items-center gap-3 transition-colors ${activeTab === 'INTEGRATIONS' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                    >
                        <Zap size={18} /> Integrations
                    </button>
                    <button className="w-full text-left px-4 py-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 flex items-center gap-3 transition-colors cursor-not-allowed opacity-60">
                        <Shield size={18} /> Security & Access
                    </button>
                </div>

                {/* Main Form Area */}
                <div className="lg:col-span-2 space-y-6">

                    {/* GENERAL TAB */}
                    {activeTab === 'GENERAL' && (
                        <form onSubmit={handleGeneralSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">General Information</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Visible to all users within your organization</p>
                            </div>
                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Organization Name (Internal)</label>
                                    <input
                                        type="text" required value={name} onChange={(e) => setName(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Legal Company Name (Public)</label>
                                    <input
                                        type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                                        placeholder="e.g. Nexaloom Inc."
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Address</label>
                                    <textarea
                                        value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)}
                                        placeholder="1234 Tech Blvd, Suite 100&#10;San Francisco, CA 94105"
                                        rows={3}
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Logo URL</label>
                                    <div className="flex gap-4 items-start">
                                        <input
                                            type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)}
                                            placeholder="https://example.com/logo.png"
                                            className="flex-1 rounded-lg border-gray-300 dark:border-gray-600 border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                        />
                                        {logoUrl && (
                                            <div className="p-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800">
                                                <img src={logoUrl} alt="Preview" className="h-8 w-auto object-contain" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Signature</label>
                                    <textarea
                                        value={emailSignature}
                                        onChange={(e) => setEmailSignature(e.target.value)}
                                        placeholder="Best regards,&#10;Your Name"
                                        rows={4}
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This text will be appended to the bottom of all system emails.</p>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                <span className={`text-sm font-medium text-green-600 dark:text-green-400 transition-opacity duration-300 ${successMessage ? 'opacity-100' : 'opacity-0'}`}>{successMessage || 'Saved'}</span>
                                <button type="submit" disabled={isSaving} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                                    {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    )}

                    {/* SMTP TAB */}
                    {activeTab === 'SMTP' && (
                        <form onSubmit={handleSmtpSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SMTP Configuration</h3>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SMTP Host</label>
                                        <input type="text" required value={smtpConfig.host} onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })} className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-4 py-2.5 text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Port</label>
                                        <input type="number" required value={smtpConfig.port} onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) })} className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-4 py-2.5 text-sm outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3">
                                <button type="submit" disabled={isSaving} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                                    {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
                                    Save SMTP
                                </button>
                            </div>
                        </form>
                    )}

                    {/* INTEGRATIONS TAB */}
                    {activeTab === 'INTEGRATIONS' && (
                        <form onSubmit={handleStripeSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xl italic">S</div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stripe Integration</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Connect your Stripe account to sync payments and products.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                        <Shield size={14} className="text-gray-400" /> Stripe Account ID
                                    </label>
                                    <input
                                        type="text"
                                        value={stripeAccountId}
                                        onChange={(e) => setStripeAccountId(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="acct_..."
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">Found in your Stripe Dashboard under Settings &gt; Account details.</p>                        </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                        <Zap size={14} className="text-gray-400" /> Stripe Publishable Key
                                    </label>
                                    <input
                                        type="text"
                                        value={stripePublicKey}
                                        onChange={(e) => setStripePublicKey(e.target.value)}
                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="pk_test_..."
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">Found in Developers &gt; API keys.</p>                        </div>

                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-4 rounded-lg flex gap-3">
                                    <Shield className="text-amber-600 shrink-0" size={20} />
                                    <p className="text-xs text-amber-800 dark:text-amber-200">
                                        For security, Secret Keys should only be handled by the backend environment. Nexaloom store only public identifiers and publishable keys for client-side redirection.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                <span className={`text-sm font-medium text-green-600 dark:text-green-400 transition-opacity duration-300 ${successMessage ? 'opacity-100' : 'opacity-0'}`}>{successMessage || 'Integrations Saved'}</span>
                                <button type="submit" disabled={isSaving} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-500/20">
                                    {isSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={18} />}
                                    Update Stripe Config
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
