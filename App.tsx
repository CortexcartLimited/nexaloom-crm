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
// Helper to render user management if needed within settings or separate
import { UserManagementView } from './components/UserManagementView';
import { DialerPanel } from './components/DialerPanel';
import { AuthState, User, Lead, LeadStatus, Product, Discount, Document, DocumentVersion, Interaction, Task, Tenant, Ticket, DemoAccount, Proposal, KnowledgeBaseArticle, UserRole } from './types';
import { Hexagon, Bell, X, ArrowRight } from 'lucide-react';
import './index.css';
import { api } from './services/api';
import { Login } from './components/Login';
import { ProtectedRoute } from './components/ProtectedRoute';

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

  const [activeReminders, setActiveReminders] = useState<Task[]>([]);

  const [isDialerOpen, setIsDialerOpen] = useState(false);
  const [dialerNumber, setDialerNumber] = useState('');
  const [dialerLeadId, setDialerLeadId] = useState<string | undefined>(undefined);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const processedRemindersRef = useRef<Set<string>>(new Set());

  // Define allowed tabs per role
  const getTabsForRole = (role?: UserRole): string[] => {
    if (!role) return [];
    switch (role) {
      case UserRole.ADMIN:
      case UserRole.TEAM_LEADER:
        return ['dashboard', 'leads', 'contacts', 'tasks', 'calendar', 'proposals', 'catalog', 'documents', 'kb', 'tickets', 'demos', 'users', 'schema', 'settings'];
      case UserRole.SALES_AGENT:
        return ['dashboard', 'leads', 'contacts', 'tasks', 'calendar', 'proposals', 'catalog', 'kb']; // No settings, no global reports (assuming dashboard is personal or limited)
      case UserRole.SERVICE_AGENT:
        return ['tickets', 'documents', 'kb', 'tasks', 'contacts']; // Primarily support
      default:
        return ['dashboard'];
    }
  };

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

      const token = localStorage.getItem('nexaloom_token');
      if (token) {
        try {
          const user = await api.getMe();
          // Fetch tenant info - assuming user object has tenantId or we fetch settings
          const settings = await api.getSettings(user.tenantId).catch(() => ({ id: user.tenantId, name: 'My Company' }));

          setAuth({
            user,
            tenant: settings as Tenant,
            isAuthenticated: true
          });

          // Set Theme from preferences
          if (user.preferences) {
            if (user.preferences.theme) {
              setTheme(user.preferences.theme);
              document.documentElement.classList.toggle('dark', user.preferences.theme === 'dark');
            }
            if (user.preferences.backgroundId) {
              setBackgroundId(user.preferences.backgroundId);
            }
          }

          // Load Data
          await loadData(user.tenantId);

          // Set initial tab based on role
          const allowed = getTabsForRole(user.role);
          if (!allowed.includes('dashboard') && allowed.length > 0) {
            setActiveTab(allowed[0]);
          }

        } catch (e) {
          console.error("Auth Failed:", e);
          localStorage.removeItem('nexaloom_token');
          setAuth({ user: null, tenant: null, isAuthenticated: false });
        }
      }

      setLoading(false);
    };
    init();
  }, []);

  // Helper to refresh documents
  const fetchDocuments = async (tId: string = auth.tenant?.id || '') => {
    if (!tId) return;
    const docs = await api.getDocuments(tId).catch(() => []);
    setDocuments(docs);
  };

  const loadData = async (tenantId: string) => {
    const [fetchedLeads, fetchedProducts, fetchedDiscounts, fetchedInteractions, fetchedTasks, fetchedProposals, fetchedArticles, fetchedTickets, fetchedUsers, fetchedDocuments] = await Promise.all([
      api.getLeads(tenantId).catch(() => []),
      api.getProducts(tenantId).catch(() => []),
      api.getDiscounts(tenantId).catch(() => []),
      api.getInteractions(tenantId).catch(() => []),
      api.getTasks(tenantId).catch(() => []),
      api.getProposals(tenantId).catch(() => []),
      api.getArticles(tenantId).catch(() => []),
      api.getTickets(tenantId).catch(() => []),
      api.getUsers(tenantId).catch(() => []),
      api.getDocuments(tenantId).catch(() => []),
    ]);

    setLeads(fetchedLeads);
    setProducts(fetchedProducts);
    setDiscounts(fetchedDiscounts);
    setInteractions(fetchedInteractions);
    setTasks(fetchedTasks);
    setProposals(fetchedProposals);
    setArticles(fetchedArticles);
    setTickets(fetchedTickets);
    setUsers(fetchedUsers);
    setDocuments(fetchedDocuments);
  };

  setLeads(fetchedLeads);
  setProducts(fetchedProducts);
  setDiscounts(fetchedDiscounts);
  setInteractions(fetchedInteractions);
  setTasks(fetchedTasks);
  setProposals(fetchedProposals);
  setArticles(fetchedArticles);
  setTickets(fetchedTickets);
  setUsers(fetchedUsers);
  setDocuments(fetchedDocuments);
};

const handleLoginSuccess = async (token: string, user: any) => {
  localStorage.setItem('nexaloom_token', token);
  setLoading(true);
  try {
    const settings = await api.getSettings(user.tenantId).catch(() => ({ id: user.tenantId, name: 'My Company' }));
    setAuth({ user, tenant: settings as Tenant, isAuthenticated: true });

    // Load data
    await loadData(user.tenantId);

    // Redirect logic
    const allowed = getTabsForRole(user.role);
    if (allowed.includes('dashboard')) setActiveTab('dashboard');
    else if (allowed.length > 0) setActiveTab(allowed[0]);

  } catch (e) {
    console.error("Post-login load failed", e);
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  if (loading || !auth.isAuthenticated) return;

  const checkReminders = () => {
    const now = new Date();
    tasks.forEach(async (task) => {
      if (task.reminderAt && !task.reminderSent && !task.isCompleted && !processedRemindersRef.current.has(task.id)) {
        const reminderTime = new Date(task.reminderAt);
        if (now >= reminderTime) {
          processedRemindersRef.current.add(task.id);
          setActiveReminders(prev => [...prev, task]);
          await handleUpdateTask(task.id, { reminderSent: true });
        }
      }
    });
  };

  const interval = setInterval(checkReminders, 10000);
  return () => clearInterval(interval);
}, [tasks, loading, auth.isAuthenticated]);

const handleBackgroundChange = async (id: string) => {
  setBackgroundId(id);
  localStorage.setItem('nexaloom_bg_theme', id);
};


const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
  const oldLead = leads.find(l => l.id === leadId);

  setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));

  try {
    await api.updateLeadStatus(leadId, newStatus);
    if (oldLead && oldLead.status !== newStatus) {
      const interaction: Omit<Interaction, 'id' | 'date'> = {
        tenantId: auth.tenant!.id,
        leadId,
        userId: auth.user!.id,
        type: 'NOTE',
        notes: `SYSTEM LOG: Lead status changed from ${oldLead.status} to ${newStatus} by ${auth.user?.name}.`,
      };
      await handleAddInteraction(interaction);
    }
  } catch (error) {
    console.error("Failed to update lead status:", error);
    setLeads(prev => prev.map(l => l.id === leadId ? oldLead! : l));
  }
};

const handleAddLead = async (leadData?: Partial<Lead>) => {
  if (!auth.tenant) return;
  const newLeadData: Omit<Lead, 'id' | 'createdAt'> = {
    tenantId: auth.tenant.id,
    name: leadData?.name || 'New Prospect',
    company: leadData?.company || 'Unknown Co',
    email: leadData?.email || '',
    phone: leadData?.phone || '',
    value: leadData?.value || 0,
    status: leadData?.status || LeadStatus.NEW,
  };

  try {
    const createdLead = await api.createLead(newLeadData);
    setLeads(prev => [...prev, createdLead]);

    const interaction: Omit<Interaction, 'id' | 'date'> = {
      tenantId: auth.tenant.id,
      leadId: createdLead.id,
      userId: auth.user!.id,
      type: 'NOTE',
      notes: `SYSTEM LOG: Lead created by ${auth.user?.name}.`,
    };
    await handleAddInteraction(interaction);
  } catch (error) {
    console.error("Failed to create lead:", error);
  }
};

const handleAddLeads = async (newLeadsData: Omit<Lead, 'id' | 'tenantId' | 'status' | 'createdAt' | 'value'>[]) => {
  if (!auth.tenant) return;
  const tenantId = auth.tenant.id;
  const userId = auth.user!.id;

  const createdLeads: Lead[] = [];
  for (const l of newLeadsData) {
    const newLeadData = {
      ...l,
      tenantId,
      status: LeadStatus.NEW,
      value: (l as any).value || 0,
    };
    try {
      const createdLead = await api.createLead(newLeadData);
      createdLeads.push(createdLead);
      const interaction: Omit<Interaction, 'id' | 'date'> = {
        tenantId,
        leadId: createdLead.id,
        userId,
        type: 'NOTE',
        notes: `SYSTEM LOG: Lead imported via CSV by ${auth.user?.name}.`,
      };
      await handleAddInteraction(interaction);
    } catch (error) {
      console.error("Failed to create lead:", error);
    }
  }
  setLeads(prev => [...prev, ...createdLeads]);
};

const handleAddProduct = async (productData: Omit<Product, 'id' | 'tenantId'>) => {
  if (!auth.tenant) return;
  const newProductData = { ...productData, tenantId: auth.tenant.id };
  try {
    const newProduct = await api.createProduct(newProductData);
    setProducts(prev => [...prev, newProduct]);
  } catch (e) {
    console.error("Failed to create product", e)
  }
};

const handleAddDiscount = async (discountData: any) => {
  const newDiscount = {
    ...discountData,
    id: `disc-${Date.now()}`,
    tenantId: auth.tenant.id,
  };

  try {
    const success = await api.addDiscount(newDiscount); // Make sure this matches your api.ts function name
    if (success) {
      setDiscounts(prev => [...prev, newDiscount]);
    }
  } catch (error) {
    console.error("Save failed:", error);
  }
};

const handleEditDiscount = async (id: string, updates: Partial<Discount>) => {
  setDiscounts(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
};

const handleAddDocument = async (docData: Omit<Document, 'id' | 'createdAt' | 'tenantId' | 'uploaderId' | 'uploaderName'>, file?: File) => {
  if (!auth.tenant || !auth.user || !file) return;

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tenantId', auth.tenant.id);
    formData.append('uploaderId', auth.user.id);
    formData.append('visibility', docData.isPublic ? 'PUBLIC' : 'PRIVATE');
    formData.append('type', docData.type);
    // formData.append('leadId', '...'); // If we had a lead selector, we'd append it here

    const response = await api.uploadDocument(formData);

    if (response.success) {
      // REFACTOR: Fetch fresh data to ensure we have the correct join data (uploaderName, etc.)
      // This prevents the "blank page" crash caused by incomplete local objects
      await fetchDocuments();
    }
  } catch (e) {
    console.error("Failed to upload document", e);
  }
};

const handleAddVersion = async (docId: string, versionData: Omit<DocumentVersion, 'id' | 'createdAt'>) => {
  if (auth.tenant && auth.user) {
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, versions: [...d.versions, { ...versionData, id: `v${d.versions.length + 1}-${Date.now()}`, createdAt: new Date().toISOString() }] } : d));
  }
};

const handleRevertVersion = async (docId: string, versionId: string) => {
  if (auth.tenant && auth.user) {
    setDocuments(prev => prev.map(d => d.id === docId ? { ...d, versions: [...d.versions.filter(v => v.id !== versionId), d.versions.find(v => v.id === versionId)!] } : d));
  }
};

const handleEditDocument = async (id: string, updates: Partial<Document>) => {
  if (!auth.tenant) return;
  setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
};

const handleDeleteDocument = async (id: string) => {
  const originalDocs = [...documents];
  setDocuments(prev => prev.filter(d => d.id !== id));

  try {
    await api.deleteDocument(id);
  } catch (e) {
    console.error("Failed to delete document", e);
    setDocuments(originalDocs);
  }
};
const loadProducts = async (tenantId?: string) => {
  const id = tenantId || auth.tenant?.id;
  if (!id) return;
  try {
    const fetchedProducts = await api.getProducts(id);
    setProducts(fetchedProducts);
  } catch (e) {
    console.error("Error loading products:", e);
  }
};

const loadDiscounts = async (tenantId?: string) => {
  const id = tenantId || auth.tenant?.id;
  if (!id) return;
  try {
    const fetchedDiscounts = await api.getDiscounts(id);
    setDiscounts(fetchedDiscounts);
  } catch (e) {
    console.error("Error loading discounts:", e);
  }
};
const handleAddTask = async (taskData: Omit<Task, 'id' | 'tenantId' | 'createdAt' | 'isCompleted'>) => {
  if (!auth.tenant) return;
  const newTaskPayload = {
    ...taskData,
    tenantId: auth.tenant.id,
    isCompleted: false,
    reminderSent: false
  };
  try {
    const createdTask = await api.createTask(newTaskPayload);
    setTasks(prev => [...prev, createdTask].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()));
  } catch (e) {
    console.error("Failed to create task", e);
  }
};

const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
  const originalTask = tasks.find(t => t.id === taskId);

  // Optimistic update
  setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

  try {
    await api.updateTask(taskId, updates);

    if (originalTask && updates.isCompleted === true && !originalTask.isCompleted) {
      if (originalTask.leadId) {
        const interaction: Omit<Interaction, 'id' | 'date'> = {
          tenantId: originalTask.tenantId,
          leadId: originalTask.leadId,
          userId: auth.user!.id,
          type: 'NOTE',
          notes: `ACTION LOG: Task Completed - "${originalTask.title}" (ID: ${originalTask.id}) by ${auth.user?.name}.`,
        };
        await handleAddInteraction(interaction);
      }
    }
  } catch (e) {
    console.error("Failed to update task", e);
    // Revert on failure
    if (originalTask) {
      setTasks(prev => prev.map(t => t.id === taskId ? originalTask : t));
    }
  }
};

const handleDeleteTask = async (taskId: string) => {
  const originalTasks = [...tasks];
  setTasks(prev => prev.filter(t => t.id !== taskId));

  try {
    await api.deleteTask(taskId, auth.tenant?.id);
  } catch (e) {
    console.error("Failed to delete task", e);
    setTasks(originalTasks);
  }
};

const handleAddTicket = async (ticketData: Omit<Ticket, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>) => {
  if (!auth.tenant || !auth.user) return;
  const newTicket: Ticket = {
    ...ticketData,
    id: `tick-${Date.now()}`,
    tenantId: auth.tenant.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  setTickets(prev => [newTicket, ...prev]);

  if (newTicket.leadId) {
    const interaction: Omit<Interaction, 'id' | 'date'> = {
      tenantId: auth.tenant.id,
      leadId: newTicket.leadId,
      userId: auth.user.id,
      type: 'NOTE',
      notes: `SUPPORT LOG: New Ticket Created - "${newTicket.subject}" by ${auth.user?.name}.`,
    };
    await handleAddInteraction(interaction);
  }
};

const handleUpdateTicket = async (id: string, updates: Partial<Ticket>) => {
  const original = tickets.find(t => t.id === id);
  setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));

  if (original?.leadId && updates.status && updates.status !== original.status) {
    const interaction: Omit<Interaction, 'id' | 'date'> = {
      tenantId: original.tenantId,
      leadId: original.leadId,
      userId: auth.user!.id,
      type: 'NOTE',
      notes: `SUPPORT LOG: Ticket Status changed to ${updates.status} for "${original.subject}" by ${auth.user?.name}.`,
    };
    await handleAddInteraction(interaction);
  }
};

const handleDeleteTicket = async (id: string) => {
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
  setDemoAccounts(prev => [newDemo, ...prev]);
};

const handleDeleteDemo = async (id: string) => {
  setDemoAccounts(prev => prev.filter(d => d.id !== id));
};

const handleAddProposal = async (proposal: Proposal) => {
  if (!auth.tenant) return;
  try {
    const createdProposal = await api.createProposal(proposal);
    // If the backend returns just the ID or partial, merge it, but our route returns full body + id
    // Ensure items are included in state
    setProposals(prev => [createdProposal, ...prev]);
  } catch (e) {
    console.error("Failed to create proposal", e);
  }
};

const handleUpdateProposal = async (id: string, updates: Partial<Proposal>) => {
  setProposals(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  try {
    await api.updateProposal(id, updates);
  } catch (e) {
    console.error("Failed to update proposal", e);
  }
};

const handleDeleteProposal = async (id: string) => {
  setProposals(prev => prev.filter(p => p.id !== id));
  try {
    await api.deleteProposal(id);
  } catch (e) {
    console.error("Failed to delete proposal", e);
  }
};

// App.tsx

// 1. Handle Updating Contact Details (The "Edit" button)
const handleAddArticle = async (articleData: Omit<KnowledgeBaseArticle, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!auth.tenant || !auth.user) return;
  const newArticle = { ...articleData, tenantId: auth.tenant.id, authorId: auth.user.id, authorName: auth.user.name };
  try {
    const created = await api.createArticle(newArticle);
    setArticles(prev => [created, ...prev]);
  } catch (e) {
    console.error("Failed to create article", e);
  }
};

const handleUpdateArticle = async (id: string, updates: Partial<KnowledgeBaseArticle>) => {
  setArticles(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  try {
    await api.updateArticle(id, updates);
  } catch (e) {
    console.error("Failed to update article", e);
  }
};

const handleDeleteArticle = async (id: string) => {
  setArticles(prev => prev.filter(a => a.id !== id));
  try {
    await api.deleteArticle(id);
  } catch (e) {
    console.error("Failed to delete article", e);
  }
};

const handleUpdateLead = async (id: string, updates: Partial<Lead>) => {
  try {
    const success = await api.updateLead(id, updates);
    if (success) {
      // Update local state so UI reflects changes immediately
      setLeads(prev => prev.map(lead =>
        lead.id === id ? { ...lead, ...updates } : lead
      ));
    }
  } catch (error) {
    console.error("Failed to update lead:", error);
    alert("Error updating contact information.");
  }
};
const handleToggleTheme = () => {
  const newTheme = theme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);

  localStorage.setItem('theme', newTheme);

  // Directly toggle the class on the html element
  if (newTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// 2. Handle Adding Interactions (Notes, Emails, Calls)
const handleAddInteraction = async (interactionData: Omit<Interaction, 'id' | 'date'>) => {
  try {
    // Ensure tenantId is included and add missing fields
    const payload: Interaction = {
      ...interactionData,
      tenantId: auth.tenant?.id || '',
      id: `int-${Date.now()}`,
      date: new Date().toISOString()
    };

    const success = await api.createInteraction(payload);
    if (success) {
      // Add to local state to refresh the Timeline instantly
      setInteractions(prev => [payload, ...prev]);
    }
  } catch (error) {
    console.error("Failed to save interaction:", error);
    alert("Error saving note to timeline.");
  }
};

const handleAddUser = async (userData: Omit<User, 'id' | 'tenantId'>) => {
  if (!auth.tenant) return;
  try {
    const createdUser = await api.createUser({ ...userData, tenantId: auth.tenant.id });
    setUsers(prev => [...prev, createdUser]);
  } catch (e) {
    console.error("Failed to create user", e);
  }
};

const handleUpdateUser = async (id: string, updates: Partial<User>) => {
  setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  if (auth.user?.id === id) {
    setAuth(prev => ({ ...prev, user: { ...prev.user!, ...updates } }));
  }
  try {
    await api.updateUser(id, updates);
  } catch (e) {
    console.error("Failed to update user", e);
  }
};

const handleDeleteUser = async (id: string) => {
  setUsers(prev => prev.filter(u => u.id !== id));
  try {
    await api.deleteUser(id);
  } catch (e) {
    console.error("Failed to delete user", e);
  }
};

const handleUpdateTenant = async (updates: Partial<Tenant>) => {
  if (auth.tenant) {
    const updatedTenant = { ...auth.tenant, ...updates };
    setAuth(prev => ({ ...prev, tenant: updatedTenant }));
    try {
      await api.updateSettings({ ...updates, tenantId: auth.tenant.id });
    } catch (e) {
      console.error("Failed to update settings", e);
    }
  }
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
  const name = lead.name || '';
  const company = lead.company || '';
  return (
    name.toLowerCase().includes(query) ||
    company.toLowerCase().includes(query) ||
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
  return <Login onLoginSuccess={handleLoginSuccess} />;
}
const handleDeleteDiscount = async (id: string) => {
  const tenantId = auth.tenant?.id;
  if (!tenantId) {
    alert("Session error: Tenant ID not found.");
    return;
  }

  try {
    const response = await fetch(`https://cortexcart.com/crm/nexaloom-crm/api/discounts/${id}`, {
      method: 'DELETE',
      headers: {
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      setDiscounts(prev => prev.filter(d => d.id !== id));
    }
  } catch (err) {
    console.error("Network error during delete:", err);
  }
};
const handleSyncCatalog = async () => {
  if (!auth.tenant?.id) {
    console.warn("Sync attempted before tenant was loaded");
    return;
  }
  await Promise.all([
    loadProducts(auth.tenant.id),
    loadDiscounts(auth.tenant.id)
  ]);
};
const handleLogout = () => {
  localStorage.removeItem('nexaloom_token');
  setAuth({ user: null, tenant: null, isAuthenticated: false });
  // Optional: Only reload if you want to clear all react state completely, 
  // but clearing auth state usually triggers the login screen which is cleaner.
  // If you prefer a hard reset:
  window.location.href = '/';
};

return (
  <>
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      user={auth.user}
      tenant={auth.tenant}
      onLogout={handleLogout}
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
          products={products}
          onStatusChange={handleStatusChange}
          onAddLead={handleAddLead}
          onAddLeads={handleAddLeads}
          documents={documents}
          onOpenDialer={handleOpenDialer}
        />
      )}

      {activeTab === 'contacts' && auth.user && (
        <ContactsView
          contacts={leads}
          interactions={interactions}
          onUpdateLead={handleUpdateLead}
          onAddInteraction={handleAddInteraction}
          onOpenDialer={handleOpenDialer}
          user={auth.user} // Changed from user to auth.user
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
          onRefresh={handleSyncCatalog}
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
      {activeTab === 'users' && (auth.user.role === 'ADMIN' || auth.user.role === 'TEAM_LEADER') && (
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
