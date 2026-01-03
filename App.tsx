import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { LeadsBoard } from './components/LeadsBoard';
import { ContactsView } from './components/ContactsView';
import { CatalogView } from './components/CatalogView';
import { ProposalsView } from './components/ProposalsView';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { SchemaViewer } from './components/SchemaViewer';
import { SettingsView } from './components/SettingsView';
import { DocumentsView } from './components/DocumentsView';
import { CalendarView } from './components/CalendarView';
import { TasksView } from './components/TasksView';
import { TicketsView } from './components/TicketsView';
import { DemoAccountsView } from './components/DemoAccountsView';
import { UserManagementView } from './components/UserManagementView';
import { DialerPanel } from './components/DialerPanel';
import { AuthState, Lead, LeadStatus, Product, Discount, Document, DocumentVersion, Interaction, Task, Tenant, Ticket, DemoAccount, Proposal, KnowledgeBaseArticle, User } from './types';
import { Hexagon, Bell, X, ArrowRight } from 'lucide-react';
import './index.css';
import { api } from './services/api';

const db = {
  login: async () => ({ 
    user: { id: 'u1', name: "Demo User", email: "demo@nexaloom.com", role: 'ADMIN', preferences: { theme: 'light' } }, 
    tenant: { id: 't1', name: "Nexaloom Demo" } 
  }),
  getLeads: async () => [],
  getProducts: async () => [],
  getDiscounts: async () => [],
  getDocuments: async () => [],
  getAllInteractions: async () => [],
  getTasks: async () => [],
  getTickets: async () => [],
  getDemoAccounts: async () => [],
  getProposals: async () => [],
  getArticles: async () => [],
  getUsers: async () => [],
  // Helper methods called by your handlers
  updateUserPreferences: async (id, prefs) => ({ id, preferences: prefs }),
  updateTenant: async (id, updates) => ({ id, ...updates }),
  updateLeadStatus: async (id, status) => ({ id, status }),
  addLead: async (lead) => lead,
  addLeads: async (leads) => leads,
  addProduct: async (prod) => prod,
  addDiscount: async (disc) => disc,
  updateDiscount: async (id, upd) => ({ id, ...upd }),
  deleteDiscount: async (id) => id,
  addDocument: async (doc) => doc,
  addDocumentVersion: async (id, v) => v,
  revertDocumentVersion: async (id, vId) => ({ id }),
  updateDocument: async (id, upd) => ({ id, ...upd }),
  deleteDocument: async (id) => id,
  addInteraction: async (int) => int,
  addTask: async (task) => task,
  updateTask: async (id, upd) => ({ id, ...upd }),
  deleteTask: async (id) => id,
  addTicket: async (tick) => tick,
  updateTicket: async (id, upd) => ({ id, ...upd }),
  deleteTicket: async (id) => id,
  addDemoAccount: async (demo) => demo,
  deleteDemoAccount: async (id) => id,
  addProposal: async (prop) => prop,
  updateProposal: async (id, upd) => ({ id, ...upd }),
  deleteProposal: async (id) => id,
  addArticle: async (art) => art,
  updateArticle: async (id, upd) => ({ id, ...upd }),
  deleteArticle: async (id) => id,
  addUser: async (user) => user,
  updateUser: async (id, upd) => ({ id, ...upd }),
  deleteUser: async (id) => id,
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [auth, setAuth] = useState<AuthState>({ 
    user: null, 
    tenant: null, 
    isAuthenticated: false 
  });
  
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [backgroundId, setBackgroundId] = useState('default');

  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Notification State
  const [activeReminders, setActiveReminders] = useState<Task[]>([]);
  
  // Dialer State
  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [dialerNumber, setDialerNumber] = useState('');
  const [dialerLeadId, setDialerLeadId] = useState<string | undefined>(undefined);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Refs for tracking sent reminders to prevent race conditions during state updates
  const processedRemindersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (savedTheme) {
          setTheme(savedTheme);
          document.documentElement.classList.toggle('dark', savedTheme === 'dark');
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          setTheme('dark');
          document.documentElement.classList.add('dark');
      }

      const savedBg = localStorage.getItem('nexaloom_bg_theme');
      if (savedBg) setBackgroundId(savedBg);

      const { user, tenant } = await db.login('demo@nexaloom.com');
      
      if (user.preferences) {
          setTheme(user.preferences.theme);
          document.documentElement.classList.toggle('dark', user.preferences.theme === 'dark');
          localStorage.setItem('theme', user.preferences.theme);

          if (user.preferences.backgroundId) {
             setBackgroundId(user.preferences.backgroundId);
             localStorage.setItem('nexaloom_bg_theme', user.preferences.backgroundId);
          }
      }
      
      setAuth({ user, tenant, isAuthenticated: true });
      
      const [fetchedLeads, fetchedProducts, fetchedDiscounts, fetchedDocuments, fetchedInteractions, fetchedTasks, fetchedTickets, fetchedDemos, fetchedProposals, fetchedArticles, fetchedUsers] = await Promise.all([
        api.getLeads(tenant.id),
        db.getProducts(tenant.id),
        db.getDiscounts(tenant.id),
        db.getDocuments(tenant.id, user.id),
        db.getAllInteractions(tenant.id),
        api.getTasks(tenant.id),
        db.getTickets(tenant.id),
        db.getDemoAccounts(tenant.id),
        db.getProposals(tenant.id),
        db.getArticles(tenant.id),
        db.getUsers(tenant.id)
      ]);
      
      setLeads(fetchedLeads);
      setProducts(fetchedProducts);
      setDiscounts(fetchedDiscounts);
      setDocuments(fetchedDocuments);
      setInteractions(fetchedInteractions);
      setTasks(fetchedTasks);
      setTickets(fetchedTickets);
      setDemoAccounts(fetchedDemos);
      setProposals(fetchedProposals);
      setArticles(fetchedArticles);
      setUsers(fetchedUsers);
      
      setLoading(false);
    };
    init();
  }, []);

  // Task Reminders Monitoring Effect
  useEffect(() => {
    if (loading || !auth.isAuthenticated) return;

    const checkReminders = () => {
      const now = new Date();
      tasks.forEach(async (task) => {
        // Condition: Has reminder, not yet sent, not completed, time has passed
        if (task.reminderAt && !task.reminderSent && !task.isCompleted && !processedRemindersRef.current.has(task.id)) {
          const reminderTime = new Date(task.reminderAt);
          if (now >= reminderTime) {
            processedRemindersRef.current.add(task.id);
            setActiveReminders(prev => [...prev, task]);
            // Update in DB and local state
            await handleUpdateTask(task.id, { reminderSent: true });
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [tasks, loading, auth.isAuthenticated]);

  const handleToggleTheme = async () => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      if (auth.user) {
          const updatedUser = await db.updateUserPreferences(auth.user.id, { theme: newTheme });
          setAuth(prev => ({ ...prev, user: updatedUser }));
      }
  };

  const handleBackgroundChange = async (id: string) => {
      setBackgroundId(id);
      localStorage.setItem('nexaloom_bg_theme', id);
      if (auth.user) {
          const updatedUser = await db.updateUserPreferences(auth.user.id, { backgroundId: id });
          setAuth(prev => ({ ...prev, user: updatedUser }));
      }
  };

  const handleUpdateTenant = async (updates: Partial<Tenant>) => {
    if (!auth.tenant) return;
    const updatedTenant = await db.updateTenant(auth.tenant.id, updates);
    setAuth(prev => ({ ...prev, tenant: updatedTenant }));
  };

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    const oldLead = leads.find(l => l.id === leadId);
    if (oldLead && oldLead.status !== newStatus) {
        // Log status change
        const interaction: Interaction = {
            id: `int-status-${Date.now()}`,
            tenantId: auth.tenant!.id,
            leadId,
            type: 'NOTE',
            notes: `SYSTEM LOG: Lead status changed from ${oldLead.status} to ${newStatus} by ${auth.user?.name}.`,
            date: new Date().toISOString()
        };
        await handleAddInteraction(interaction);
    }
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    await db.updateLeadStatus(leadId, newStatus);
  };

  const handleAddLead = async (leadData?: Partial<Lead>) => {
    if (!auth.tenant) return;
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      tenantId: auth.tenant.id,
      name: leadData?.name || 'New Prospect',
      company: leadData?.company || 'Unknown Co',
      email: leadData?.email || '',
      phone: leadData?.phone || '',
      value: leadData?.value || 0,
      status: leadData?.status || LeadStatus.NEW,
      createdAt: new Date().toISOString()
    };
    await api.createLead(newLead); 
    setLeads([...leads, newLead]);
    
    // Log creation
    const interaction: Interaction = {
        id: `int-create-${Date.now()}`,
        tenantId: auth.tenant.id,
        leadId: newLead.id,
        type: 'NOTE',
        notes: `SYSTEM LOG: Lead created by ${auth.user?.name}.`,
        date: new Date().toISOString()
    };
    await handleAddInteraction(interaction);
  };

  const handleAddLeads = async (newLeadsData: Omit<Lead, 'id' | 'tenantId' | 'status' | 'createdAt' | 'value'>[]) => {
      if (!auth.tenant) return;
      const newLeads: Lead[] = newLeadsData.map((l, index) => ({
          ...l,
          id: `lead-${Date.now()}-${index}`,
          tenantId: auth.tenant!.id,
          status: LeadStatus.NEW,
          value: (l as any).value || 0,
          createdAt: new Date().toISOString()
      }));
      await db.addLeads(newLeads);
      setLeads([...leads, ...newLeads]);

      // Bulk log creation
      for (const nl of newLeads) {
          const interaction: Interaction = {
              id: `int-create-bulk-${Date.now()}-${nl.id}`,
              tenantId: auth.tenant.id,
              leadId: nl.id,
              type: 'NOTE',
              notes: `SYSTEM LOG: Lead imported via CSV by ${auth.user?.name}.`,
              date: new Date().toISOString()
          };
          await handleAddInteraction(interaction);
      }
  };

  const handleAddProduct = async (productData: Omit<Product, 'id' | 'tenantId'>) => {
    if (!auth.tenant) return;
    const newProduct: Product = { ...productData, id: `prod-${Date.now()}`, tenantId: auth.tenant.id };
    await db.addProduct(newProduct);
    setProducts([...products, newProduct]);
  };

  const handleAddDiscount = async (discountData: Omit<Discount, 'id' | 'tenantId'>) => {
    if (!auth.tenant) return;
    const newDiscount: Discount = { ...discountData, id: `disc-${Date.now()}`, tenantId: auth.tenant.id };
    await db.addDiscount(newDiscount);
    setDiscounts([...discounts, newDiscount]);
  };

  const handleEditDiscount = async (id: string, updates: Partial<Discount>) => {
    if (!auth.tenant) return;
    await db.updateDiscount(id, updates);
    setDiscounts(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const handleDeleteDiscount = async (id: string) => {
    if (!auth.tenant) return;
    await db.deleteDiscount(id);
    setDiscounts(prev => prev.filter(d => d.id !== id));
  };

  const handleAddDocument = async (docData: Omit<Document, 'id' | 'createdAt' | 'tenantId' | 'uploaderId' | 'uploaderName'>) => {
    if (!auth.tenant || !auth.user) return;
    const newDoc: Document = {
      ...docData,
      id: `doc-${Date.now()}`,
      tenantId: auth.tenant.id,
      uploaderId: auth.user.id,
      uploaderName: auth.user.name,
      createdAt: new Date().toISOString(),
      versions: [{ id: `v1-${Date.now()}`, name: docData.name, type: docData.type, size: docData.size, createdAt: new Date().toISOString(), uploaderId: auth.user.id, uploaderName: auth.user.name }]
    };
    await db.addDocument(newDoc);
    setDocuments([newDoc, ...documents]);
  };

  const handleAddVersion = async (docId: string, versionData: Omit<DocumentVersion, 'id' | 'createdAt'>) => {
      await db.addDocumentVersion(docId, versionData);
      if (auth.tenant && auth.user) {
          const fetched = await db.getDocuments(auth.tenant.id, auth.user.id);
          setDocuments(fetched);
      }
  };

  const handleRevertVersion = async (docId: string, versionId: string) => {
      await db.revertDocumentVersion(docId, versionId);
      if (auth.tenant && auth.user) {
          const fetched = await db.getDocuments(auth.tenant.id, auth.user.id);
          setDocuments(fetched);
      }
  };

  const handleEditDocument = async (id: string, updates: Partial<Document>) => {
    if (!auth.tenant) return;
    await db.updateDocument(id, updates);
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const handleDeleteDocument = async (id: string) => {
    await db.deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleAddInteraction = async (interaction: Interaction) => {
      await db.addInteraction(interaction);
      setInteractions([interaction, ...interactions]);
  };

  const handleAddTask = async (taskData: Omit<Task, 'id' | 'tenantId' | 'createdAt' | 'isCompleted'>) => {
    if (!auth.tenant) return;
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      tenantId: auth.tenant.id,
      createdAt: new Date().toISOString(),
      isCompleted: false,
      reminderSent: false
    };
    await db.addTask(newTask);
    setTasks(prev => [...prev, newTask].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()));
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    const originalTask = tasks.find(t => t.id === taskId);
    if (originalTask && updates.isCompleted === true && !originalTask.isCompleted) {
        // Log completion to customer notes if linked
        if (originalTask.leadId) {
            const interaction: Interaction = {
                id: `int-task-done-${Date.now()}`,
                tenantId: originalTask.tenantId,
                leadId: originalTask.leadId,
                type: 'NOTE',
                notes: `ACTION LOG: Task Completed - "${originalTask.title}" (ID: ${originalTask.id}) by ${auth.user?.name}.`,
                date: new Date().toISOString()
            };
            await handleAddInteraction(interaction);
        }
    }
    await db.updateTask(taskId, updates);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
  };

  const handleDeleteTask = async (taskId: string) => {
    await db.deleteTask(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const handleAddTicket = async (ticketData: Omit<Ticket, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => {
      if (!auth.tenant) return;
      const newTicket: Ticket = {
          ...ticketData,
          id: `tick-${Date.now()}`,
          tenantId: auth.tenant.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
      };
      await db.addTicket(newTicket);
      setTickets(prev => [newTicket, ...prev]);

      // Log ticket creation if lead linked
      if (newTicket.leadId) {
          const interaction: Interaction = {
              id: `int-ticket-${Date.now()}`,
              tenantId: auth.tenant.id,
              leadId: newTicket.leadId,
              type: 'NOTE',
              notes: `SUPPORT LOG: New Ticket Created - "${newTicket.subject}" by ${auth.user?.name}.`,
              date: new Date().toISOString()
          };
          await handleAddInteraction(interaction);
      }
  };

  const handleUpdateTicket = async (id: string, updates: Partial<Ticket>) => {
      const original = tickets.find(t => t.id === id);
      await db.updateTicket(id, updates);
      setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));
      
      if (original?.leadId && updates.status && updates.status !== original.status) {
          const interaction: Interaction = {
              id: `int-ticket-update-${Date.now()}`,
              tenantId: original.tenantId,
              leadId: original.leadId,
              type: 'NOTE',
              notes: `SUPPORT LOG: Ticket Status changed to ${updates.status} for "${original.subject}" by ${auth.user?.name}.`,
              date: new Date().toISOString()
          };
          await handleAddInteraction(interaction);
      }
  };

  const handleDeleteTicket = async (id: string) => {
      await db.deleteTicket(id);
      setTickets(prev => prev.filter(t => t.id !== id));
  };

  const handleAddDemo = async (demoData: Omit<DemoAccount, 'id' | 'tenantId' | 'createdAt' | 'status'>) => {
      if (!auth.tenant) return;
      const newDemo: DemoAccount = {
          ...demoData,
          id: `demo-${Date.now()}`,
          tenantId: auth.tenant.id,
          createdAt: new Date().toISOString(),
          status: 'ACTIVE'
      };
      await db.addDemoAccount(newDemo);
      setDemoAccounts(prev => [newDemo, ...prev]);
  };

  const handleDeleteDemo = async (id: string) => {
      await db.deleteDemoAccount(id);
      setDemoAccounts(prev => prev.filter(d => d.id !== id));
  };

  const handleAddProposal = async (proposal: Proposal) => {
      if (!auth.tenant) return;
      await db.addProposal(proposal);
      setProposals(prev => [proposal, ...prev]);
  };

  const handleUpdateProposal = async (id: string, updates: Partial<Proposal>) => {
      await db.updateProposal(id, updates);
      setProposals(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleDeleteProposal = async (id: string) => {
      await db.deleteProposal(id);
      setProposals(prev => prev.filter(p => p.id !== id));
  };

  const handleAddArticle = async (articleData: Omit<KnowledgeBaseArticle, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!auth.tenant) return;
      const newArticle: KnowledgeBaseArticle = {
          ...articleData,
          id: `kb-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
      };
      await db.addArticle(newArticle);
      setArticles(prev => [newArticle, ...prev]);
  };

  const handleUpdateArticle = async (id: string, updates: Partial<KnowledgeBaseArticle>) => {
      await db.updateArticle(id, updates);
      setArticles(prev => prev.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a));
  };

  const handleDeleteArticle = async (id: string) => {
      await db.deleteArticle(id);
      setArticles(prev => prev.filter(a => a.id !== id));
  };

  const handleAddUser = async (userData: Omit<User, 'id' | 'tenantId'>) => {
    if (!auth.tenant) return;
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      tenantId: auth.tenant.id,
    };
    await db.addUser(newUser);
    setUsers(prev => [...prev, newUser]);
  };

  const handleUpdateUser = async (id: string, updates: Partial<User>) => {
    await db.updateUser(id, updates);
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    
    // Update auth state if current user is updated
    if (auth.user?.id === id) {
      setAuth(prev => ({ ...prev, user: { ...prev.user!, ...updates } }));
    }
  };

  const handleDeleteUser = async (id: string) => {
    await db.deleteUser(id);
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleOpenDialer = (phone?: string, leadId?: string) => {
    if (phone && typeof phone === 'string') setDialerNumber(phone);
    if (leadId) setDialerLeadId(leadId);
    else setDialerLeadId(undefined);
    setIsDialerOpen(true);
  };

  const dismissReminder = (id: string) => {
    setActiveReminders(prev => prev.filter(r => r.id !== id));
  };

  const viewTaskFromReminder = (id: string) => {
    dismissReminder(id);
    setActiveTab('tasks');
  };

  const filteredLeads = leads.filter(lead => {
    const query = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(query) ||
      lead.company.toLowerCase().includes(query) ||
      (lead.email && lead.email.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 flex-col gap-4">
        <Hexagon size={48} className="text-blue-600 animate-pulse" />
        <p className="text-gray-500 dark:text-gray-400 font-medium">Initializing Nexaloom...</p>
      </div>
    );
  }

  if (!auth.isAuthenticated || !auth.user || !auth.tenant) {
    return <div>Login required (Auto-login failed)</div>;
  }

  return (
    <>
      <Layout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={auth.user}
        tenant={auth.tenant}
        onLogout={() => window.location.reload()}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        theme={theme}
        toggleTheme={handleToggleTheme}
        backgroundId={backgroundId}
        onBackgroundChange={handleBackgroundChange}
        onOpenDialer={() => handleOpenDialer()}
      >
        {activeTab === 'dashboard' && (
          <Dashboard 
            leads={filteredLeads} 
            interactions={interactions} 
            onNavigate={setActiveTab} 
          />
        )}
        {activeTab === 'tasks' && (
          <TasksView 
            tasks={tasks}
            leads={leads}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarView 
            interactions={interactions} 
            leads={leads} 
            user={auth.user}
            onAddInteraction={handleAddInteraction} 
          />
        )}
        {activeTab === 'leads' && (
          <LeadsBoard 
            leads={filteredLeads} 
            onStatusChange={handleStatusChange}
            onAddLead={handleAddLead}
            onAddLeads={handleAddLeads}
            documents={documents}
            onOpenDialer={handleOpenDialer}
          />
        )}
        {activeTab === 'contacts' && (
          <ContactsView 
            contacts={filteredLeads} 
            onAddLeads={handleAddLeads} 
            documents={documents}
            articles={articles}
            onOpenDialer={handleOpenDialer}
          />
        )}
        {activeTab === 'catalog' && (
          <CatalogView 
              products={products} 
              discounts={discounts}
              leads={leads}
              onAddProduct={handleAddProduct}
              onAddDiscount={handleAddDiscount}
              onEditDiscount={handleEditDiscount}
              onDeleteDiscount={handleDeleteDiscount}
              onAddInteraction={handleAddInteraction}
              user={auth.user}
          />
        )}
        {activeTab === 'proposals' && (
          <ProposalsView 
              proposals={proposals}
              leads={leads}
              products={products}
              user={auth.user}
              onAddProposal={handleAddProposal}
              onUpdateProposal={handleUpdateProposal}
              onDeleteProposal={handleDeleteProposal}
              onAddInteraction={handleAddInteraction}
          />
        )}
        {activeTab === 'demos' && (
          <DemoAccountsView 
              demoAccounts={demoAccounts}
              leads={leads}
              user={auth.user}
              onAddDemo={handleAddDemo}
              onDeleteDemo={handleDeleteDemo}
              onAddInteraction={handleAddInteraction}
          />
        )}
        {activeTab === 'documents' && (
          <DocumentsView 
            documents={documents}
            user={auth.user}
            onAddDocument={handleAddDocument}
            onAddVersion={handleAddVersion}
            onRevertVersion={handleRevertVersion}
            onEditDocument={handleEditDocument}
            onDeleteDocument={handleDeleteDocument}
          />
        )}
        {activeTab === 'kb' && (
          <KnowledgeBaseView 
              articles={articles}
              user={auth.user}
              onAddArticle={handleAddArticle}
              onUpdateArticle={handleUpdateArticle}
              onDeleteArticle={handleDeleteArticle}
          />
        )}
        {activeTab === 'tickets' && (
            <TicketsView 
              tickets={tickets}
              leads={leads}
              articles={articles}
              user={auth.user}
              onAddTicket={handleAddTicket}
              onUpdateTicket={handleUpdateTicket}
              onDeleteTicket={handleDeleteTicket}
              onAddInteraction={handleAddInteraction}
            />
        )}
        {activeTab === 'users' && auth.user.role === 'ADMIN' && (
          <UserManagementView 
            users={users}
            currentUser={auth.user}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
          />
        )}
        {activeTab === 'schema' && <SchemaViewer />}
        {activeTab === 'settings' && (
          <SettingsView tenant={auth.tenant} onUpdateTenant={handleUpdateTenant} />
        )}
      </Layout>

      {/* Global Reminder Notifications */}
      <div className="fixed bottom-6 right-6 z-[300] flex flex-col gap-3 max-w-xs w-full">
          {activeReminders.map(task => (
            <div key={task.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-l-4 border-blue-600 dark:border-blue-500 overflow-hidden animate-in slide-in-from-right-10 duration-300">
                <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                            <Bell size={18} className="animate-bounce" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Task Reminder</span>
                        </div>
                        <button onClick={() => dismissReminder(task.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <X size={16} />
                        </button>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{task.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{task.description || 'No description provided.'}</p>
                    <div className="mt-4 flex gap-2">
                        <button 
                            onClick={() => viewTaskFromReminder(task.id)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                            View Task <ArrowRight size={12} />
                        </button>
                        <button 
                            onClick={() => dismissReminder(task.id)}
                            className="px-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-[10px] font-bold py-2 rounded-lg transition-colors"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
          ))}
      </div>

      <DialerPanel 
        isOpen={isDialerOpen} 
        onClose={() => { setIsDialerOpen(false); setDialerNumber(''); setDialerLeadId(undefined); }} 
        userName={auth.user?.name || 'User'}
        phoneNumber={dialerNumber}
        leadId={dialerLeadId}
        tenantId={auth.tenant?.id}
        onAddInteraction={handleAddInteraction}
      />
    </>
  );
};

export default App;