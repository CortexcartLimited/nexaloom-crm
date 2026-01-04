
import React, { useState } from 'react';
import { LayoutDashboard, Users, Trello, Database, LogOut, Hexagon, Search, Menu, X, ShoppingBag, Sun, Moon, Palette, Check, Image as ImageIcon, Settings, FileText, Calendar as CalendarIcon, ListTodo, LifeBuoy, Rocket, Phone, ScrollText, BookOpen, Shield } from 'lucide-react';
import { User, Tenant, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: User;
  tenant: Tenant;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  backgroundId: string;
  onBackgroundChange: (id: string) => void;
  onOpenDialer: () => void;
}

const COLOR_THEMES = [
  { id: 'default', label: 'Clean', className: 'bg-gray-50 dark:bg-gray-900' },
  { id: 'ocean', label: 'Ocean', className: 'bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950' },
  { id: 'forest', label: 'Forest', className: 'bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950 dark:to-teal-950' },
  { id: 'sunset', label: 'Sunset', className: 'bg-gradient-to-br from-orange-50 to-rose-100 dark:from-orange-950 dark:to-rose-950' },
  { id: 'royal', label: 'Royal', className: 'bg-gradient-to-br from-slate-100 to-purple-100 dark:from-slate-900 dark:to-purple-950' },
  { id: 'monochrome', label: 'Mono', className: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-100 via-gray-200 to-gray-300 dark:from-gray-800 dark:via-gray-900 dark:to-black' },
];

const IMAGE_THEMES = [
  { id: 'executive', label: 'Executive', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000' },
  { id: 'serenity', label: 'Serenity', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&q=80&w=2000' },
  { id: 'metropolis', label: 'Metropolis', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=2000' },
  { id: 'flow', label: 'Flow', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=2000' },
];

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  onTabChange,
  user,
  tenant,
  onLogout,
  searchQuery,
  onSearchChange,
  theme,
  toggleTheme,
  backgroundId,
  onBackgroundChange,
  onOpenDialer
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const activeColor = COLOR_THEMES.find(t => t.id === backgroundId);
  const activeImage = IMAGE_THEMES.find(t => t.id === backgroundId);

  const mainStyle: React.CSSProperties = activeImage 
    ? { backgroundImage: `url(${activeImage.url})`, backgroundSize: 'cover', backgroundAttachment: 'fixed', backgroundPosition: 'center' } 
    : {};

  const mainClass = activeImage ? 'bg-no-repeat' : (activeColor?.className || COLOR_THEMES[0].className);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'tasks', label: 'Tasks', icon: ListTodo },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'leads', label: 'Pipeline', icon: Trello },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'catalog', label: 'Catalog', icon: ShoppingBag },
    { id: 'proposals', label: 'Proposals & Quotes', icon: ScrollText },
    { id: 'demos', label: 'Product Demos', icon: Rocket },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'kb', label: 'Knowledge Base', icon: BookOpen },
    { id: 'tickets', label: 'Support', icon: LifeBuoy },
    { id: 'schema', label: 'System Arch', icon: Database },
    // Only show Users tab if role is ADMIN
    ...(user.role === UserRole.ADMIN ? [{ id: 'users', label: 'Team', icon: Shield }] : []),
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className={`flex h-screen text-gray-900 dark:text-gray-100 font-sans overflow-hidden transition-all duration-300 bg-wallpaper-${backgroundId}`}>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 dark:bg-gray-950 text-white flex flex-col transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none border-r border-gray-800 lg:translate-x-0 lg:static lg:inset-auto lg:inset-y-0 lg:flex-shrink-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg"><Hexagon size={24} fill="currentColor" className="text-white" /></div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Nexaloom</h1>
              <p className="text-xs text-gray-400">CRM Suite</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800"><X size={20} /></button>
        </div>
        <div className="p-4 border-b border-gray-800 bg-gray-800/50 dark:bg-gray-900/50">
          <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Organization</p>
          <p className="text-sm font-medium truncate">{tenant.name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button key={item.id} onClick={() => { onTabChange(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800 mt-auto">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold shrink-0 text-white">{user.name.charAt(0)}</div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate text-gray-200">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center gap-2 text-gray-400 hover:text-white px-2 py-2 rounded hover:bg-gray-800 transition-colors text-sm"><LogOut size={16} />Sign Out</button>
        </div>
      </aside>
      <main className={`flex-1 flex flex-col h-full overflow-hidden relative w-full transition-all duration-300 ${mainClass}`} style={mainStyle}>
        <header className="h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 lg:px-6 shadow-sm z-10 shrink-0 sticky top-0">
          <div className="flex items-center gap-3 flex-1 lg:flex-none">
            <button onClick={toggleSidebar} className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-md transition-colors"><Menu size={24} /></button>
            <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-lg lg:text-xl font-semibold text-gray-800 dark:text-white capitalize whitespace-nowrap">{menuItems.find(m => m.id === activeTab)?.label}</span>
                <span className="text-gray-300 dark:text-gray-600 text-xl">/</span>
                <span className="text-base text-gray-500 dark:text-gray-400 truncate font-normal">{tenant.name}</span>
            </div>
          </div>
          <div className="hidden md:block flex-1 max-w-xl px-4">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input type="text" placeholder="Search leads, companies, or emails..." className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-4 lg:w-1/4 justify-end">
            <button 
              onClick={onOpenDialer}
              className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all group"
              title="Open Dialer"
            >
              <Phone size={20} className="group-hover:scale-110 transition-transform" />
            </button>
            <button onClick={toggleTheme} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">{theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}</button>
            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] lg:text-xs px-2 py-1 rounded-full border border-green-200 dark:border-green-800 font-medium whitespace-nowrap flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>Online
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-auto w-full relative">{children}</div>
        <div className="absolute bottom-6 right-6 z-40">
           {showThemePicker && (
             <div className="absolute bottom-12 right-0 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 p-4 w-64 animate-in slide-in-from-bottom-2 fade-in duration-200 max-h-[80vh] overflow-y-auto custom-scrollbar">
               <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2"><Palette size={16} /> Appearance</h3><button onClick={() => setShowThemePicker(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button></div>
               <div className="mb-4"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Solid & Gradients</p><div className="grid grid-cols-2 gap-1.5">{COLOR_THEMES.map(t => <button key={t.id} onClick={() => onBackgroundChange(t.id)} className={`w-full text-left px-3 py-2 text-xs rounded-lg flex items-center justify-between transition-colors ${backgroundId === t.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium border border-blue-200' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 border border-transparent'}`}><span>{t.label}</span>{backgroundId === t.id && <Check size={12} />}</button>)}</div></div>
               <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1 flex items-center gap-1"><ImageIcon size={12} /> Wallpapers</p><div className="grid grid-cols-2 gap-2">{IMAGE_THEMES.map(t => <button key={t.id} onClick={() => onBackgroundChange(t.id)} className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all ${backgroundId === t.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'}`}><img src={t.url} alt={t.label} className="w-full h-full object-cover group-hover:scale-110" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">{backgroundId === t.id && <Check size={20} className="text-white" />}</div><div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-center"><span className="text-[10px] text-white font-medium block truncate">{t.label}</span></div></button>)}</div></div>
             </div>
           )}
           <button onClick={() => setShowThemePicker(!showThemePicker)} className={`p-3 rounded-full shadow-lg border transition-all duration-300 ${showThemePicker ? 'bg-blue-600 text-white rotate-90 border-blue-700' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:scale-105'}`}><Palette size={20} /></button>
        </div>
      </main>
    </div>
  );
};
