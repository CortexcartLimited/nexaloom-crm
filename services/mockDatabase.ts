
import { Tenant, User, Lead, Interaction, UserRole, LeadStatus, Product, Discount, DiscountType, Document, DocumentVersion, UserPreferences, SmtpConfig, Task, TaskPriority, Ticket, TicketStatus, DemoAccount, Proposal, ProposalStatus, KnowledgeBaseArticle } from '../types';

// Initial Mock Data
const MOCK_TENANT_ID = 'tenant-123';
const MOCK_USER_ID = 'user-admin-1';

const INITIAL_TENANT: Tenant = {
  id: MOCK_TENANT_ID,
  name: 'Acme Corp (Demo Tenant)',
  createdAt: new Date().toISOString(),
  smtpConfig: {
      host: 'smtp.example.com',
      port: 587,
      user: 'notifications@acmecorp.com',
      pass: 'password',
      fromEmail: 'notifications@acmecorp.com',
      secure: true
  },
  stripeAccountId: 'acct_1234567890',
  stripePublicKey: 'pk_test_51Mz...'
};

const INITIAL_USER: User = {
  id: MOCK_USER_ID,
  tenantId: MOCK_TENANT_ID,
  name: 'Jane Doe',
  email: 'jane@acmecorp.com',
  role: UserRole.ADMIN,
  preferences: {
    theme: 'light',
    backgroundId: 'default'
  }
};

const INITIAL_USERS: User[] = [
    INITIAL_USER,
    {
        id: 'user-lead-1',
        tenantId: MOCK_TENANT_ID,
        name: 'Michael Scott',
        email: 'michael@acmecorp.com',
        role: UserRole.TEAM_LEAD,
        preferences: { theme: 'light', backgroundId: 'default' }
    },
    {
        id: 'user-sales-1',
        tenantId: MOCK_TENANT_ID,
        name: 'Jim Halpert',
        email: 'jim@acmecorp.com',
        role: UserRole.SALES_AGENT,
        preferences: { theme: 'light', backgroundId: 'default' }
    },
    {
        id: 'user-support-1',
        tenantId: MOCK_TENANT_ID,
        name: 'Pam Beesly',
        email: 'pam@acmecorp.com',
        role: UserRole.RELATIONSHIP_AGENT,
        preferences: { theme: 'light', backgroundId: 'default' }
    }
];

const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-1',
    tenantId: MOCK_TENANT_ID,
    name: 'Robert California',
    company: 'Dunder Mifflin',
    email: 'robert@dm.com',
    phone: '555-0100',
    value: 50000,
    status: LeadStatus.PROPOSAL,
    createdAt: new Date().toISOString()
  },
  {
    id: 'lead-2',
    tenantId: MOCK_TENANT_ID,
    name: 'Ryan Howard',
    company: 'WUPHF.com',
    email: 'ryan@wuphf.com',
    phone: '555-0102',
    value: 12000,
    status: LeadStatus.NEW,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    tenantId: MOCK_TENANT_ID,
    name: 'Nexaloom Pro CRM',
    description: 'Advanced lead tracking, unlimited contacts, and AI-powered insights.',
    price: 49.00,
    billingCycle: 'MONTHLY',
    stripeProductId: 'prod_crm_pro',
    stripePriceId: 'price_crm_pro_monthly'
  },
  {
    id: 'prod-2',
    tenantId: MOCK_TENANT_ID,
    name: 'Enterprise Multi-Tenant Suite',
    description: 'White-label capabilities, custom domains, and dedicated support.',
    price: 199.00,
    billingCycle: 'MONTHLY',
    stripeProductId: 'prod_enterprise_suite'
  },
  {
    id: 'prod-3',
    tenantId: MOCK_TENANT_ID,
    name: 'AI Sales Assistant (Add-on)',
    description: 'Automated email drafting and interaction sentiment analysis.',
    price: 299.00,
    billingCycle: 'YEARLY',
    stripePriceId: 'price_ai_yearly'
  },
  {
    id: 'prod-4',
    tenantId: MOCK_TENANT_ID,
    name: 'Implementation & Training',
    description: 'One-time onboarding session for your entire sales organization.',
    price: 1500.00,
    billingCycle: 'ONE_TIME'
  }
];

const INITIAL_DISCOUNTS: Discount[] = [
  {
    id: 'disc-1',
    tenantId: MOCK_TENANT_ID,
    name: 'Welcome Bonus',
    code: 'WELCOME50',
    type: DiscountType.PERCENTAGE,
    value: 50,
    applicableProductIds: ['ALL']
  },
  {
    id: 'disc-2',
    tenantId: MOCK_TENANT_ID,
    name: 'Contractor Special',
    code: 'COMMIT12',
    type: DiscountType.CONTRACT,
    value: 20,
    contractTerm: 12,
    applicableProductIds: ['ALL']
  },
  {
    id: 'disc-3',
    tenantId: MOCK_TENANT_ID,
    name: 'AI Early Adopter',
    code: 'AIPOWER',
    type: DiscountType.PERCENTAGE,
    value: 15,
    applicableProductIds: ['prod-3'],
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString()
  }
];

const INITIAL_PROPOSALS: Proposal[] = [
    {
        id: 'prop-1',
        tenantId: MOCK_TENANT_ID,
        leadId: 'lead-1',
        leadName: 'Robert California',
        leadCompany: 'Dunder Mifflin',
        items: [
            { id: 'pi-1', productId: 'prod-2', name: 'Enterprise Multi-Tenant Suite', quantity: 1, price: 199.00, description: 'Annual License' }
        ],
        totalValue: 199.00,
        status: ProposalStatus.SENT,
        validUntil: new Date(Date.now() + 86400000 * 14).toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: 'Jane Doe',
        terms: 'Payment due within 30 days of invoice.'
    }
];

const INITIAL_KB_ARTICLES: KnowledgeBaseArticle[] = [
    {
        id: 'kb-1',
        tenantId: MOCK_TENANT_ID,
        title: 'Getting Started with CortexCart',
        category: 'Onboarding',
        content: 'Welcome to CortexCart! This guide will walk you through the initial setup process, including account creation, API key generation, and connecting your first data source.',
        tags: ['setup', 'basics'],
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        authorId: MOCK_USER_ID,
        authorName: 'Jane Doe',
        isPublic: true
    },
    {
        id: 'kb-2',
        tenantId: MOCK_TENANT_ID,
        title: 'API Rate Limits & Pricing',
        category: 'Technical',
        content: 'Our API has standard rate limits to ensure stability for all users. The Free tier allows 100 requests/min. The Pro tier allows 1000 requests/min. Enterprise plans have custom limits.',
        tags: ['api', 'billing', 'limits'],
        createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
        authorId: MOCK_USER_ID,
        authorName: 'Jane Doe',
        isPublic: true
    },
    {
        id: 'kb-3',
        tenantId: MOCK_TENANT_ID,
        title: 'Troubleshooting Connection Errors',
        category: 'Support',
        content: 'If you are experiencing 502 Bad Gateway errors, please check your webhook configuration. Ensure that your server is responding within the 30-second timeout window.',
        tags: ['errors', 'troubleshooting', 'webhooks'],
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        authorId: MOCK_USER_ID,
        authorName: 'Jane Doe',
        isPublic: false
    }
];

class MockDatabase {
  private getStorageKey(key: string): string {
    return `nexaloom_${key}`;
  }

  private get<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(this.getStorageKey(key));
    return data ? JSON.parse(data) : defaultValue;
  }

  private set<T>(key: string, value: T): void {
    localStorage.setItem(this.getStorageKey(key), JSON.stringify(value));
  }

  async login(email: string): Promise<{ user: User; tenant: Tenant }> {
    await new Promise(resolve => setTimeout(resolve, 600));
    const storedUser = this.get<User>('currentUser', INITIAL_USER);
    const storedTenant = this.get<Tenant>('currentTenant', INITIAL_TENANT);
    
    // Seed users list if not exists
    const allUsers = this.get<User[]>('users', []);
    if (allUsers.length === 0) this.set('users', INITIAL_USERS);

    if (!storedUser.preferences) {
        storedUser.preferences = INITIAL_USER.preferences;
        this.set('currentUser', storedUser);
    }

    if (!localStorage.getItem(this.getStorageKey('leads'))) this.set('leads', INITIAL_LEADS);
    if (!localStorage.getItem(this.getStorageKey('interactions'))) this.set('interactions', []);
    
    // Seed Catalog if empty
    const currentProducts = this.get<Product[]>('products', []);
    if (currentProducts.length === 0) this.set('products', INITIAL_PRODUCTS);
    
    const currentDiscounts = this.get<Discount[]>('discounts', []);
    if (currentDiscounts.length === 0) this.set('discounts', INITIAL_DISCOUNTS);

    if (!localStorage.getItem(this.getStorageKey('documents'))) this.set('documents', []);
    if (!localStorage.getItem(this.getStorageKey('tasks'))) this.set('tasks', []);
    if (!localStorage.getItem(this.getStorageKey('tickets'))) this.set('tickets', []);
    if (!localStorage.getItem(this.getStorageKey('demo_accounts'))) this.set('demo_accounts', []);
    if (!localStorage.getItem(this.getStorageKey('proposals'))) this.set('proposals', INITIAL_PROPOSALS);
    if (!localStorage.getItem(this.getStorageKey('kb_articles'))) this.set('kb_articles', INITIAL_KB_ARTICLES);
    if (!localStorage.getItem(this.getStorageKey('currentTenant'))) this.set('currentTenant', INITIAL_TENANT);

    return { user: storedUser, tenant: storedTenant };
  }

  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const current = this.get<Tenant>('currentTenant', INITIAL_TENANT);
    if (current.id === tenantId) {
        const updated = { 
            ...current, 
            ...updates, 
            smtpConfig: updates.smtpConfig ? { ...current.smtpConfig, ...updates.smtpConfig } : current.smtpConfig 
        } as Tenant;
        this.set('currentTenant', updated);
        return updated;
    }
    return current;
  }
  
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<User> {
    const user = this.get<User>('currentUser', INITIAL_USER);
    if (user.id === userId) {
        const updatedUser = { ...user, preferences: { ...user.preferences, ...preferences } };
        this.set('currentUser', updatedUser);
        return updatedUser;
    }
    return user;
  }

  // --- Users Management ---
  async getUsers(tenantId: string): Promise<User[]> {
      const all = this.get<User[]>('users', []);
      return all.filter(u => u.tenantId === tenantId);
  }

  async addUser(user: User): Promise<void> {
      const all = this.get<User[]>('users', []);
      this.set('users', [...all, user]);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
      const all = this.get<User[]>('users', []);
      const updated = all.map(u => u.id === id ? { ...u, ...updates } : u);
      this.set('users', updated);
      
      // Update current user if it matches
      const currentUser = this.get<User>('currentUser', INITIAL_USER);
      if (currentUser.id === id) {
          this.set('currentUser', { ...currentUser, ...updates });
      }
  }

  async deleteUser(id: string): Promise<void> {
      const all = this.get<User[]>('users', []);
      this.set('users', all.filter(u => u.id !== id));
  }

  // --- Demo Accounts ---
  async getDemoAccounts(tenantId: string): Promise<DemoAccount[]> {
      const all = this.get<DemoAccount[]>('demo_accounts', []);
      return all.filter(d => d.tenantId === tenantId);
  }

  async addDemoAccount(demo: DemoAccount): Promise<void> {
      const all = this.get<DemoAccount[]>('demo_accounts', []);
      this.set('demo_accounts', [demo, ...all]);
  }

  async deleteDemoAccount(id: string): Promise<void> {
      const all = this.get<DemoAccount[]>('demo_accounts', []);
      this.set('demo_accounts', all.filter(d => d.id !== id));
  }

  // --- Tasks ---
  async getTasks(tenantId: string): Promise<Task[]> {
    const tasks = this.get<Task[]>('tasks', []);
    return tasks.filter(t => t.tenantId === tenantId).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }

  async addTask(task: Task): Promise<void> {
    const tasks = this.get<Task[]>('tasks', []);
    this.set('tasks', [...tasks, task]);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const tasks = this.get<Task[]>('tasks', []);
    const updated = tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
    this.set('tasks', updated);
  }

  async deleteTask(taskId: string): Promise<void> {
    const tasks = this.get<Task[]>('tasks', []);
    this.set('tasks', tasks.filter(t => t.id !== taskId));
  }

  // --- Support Tickets ---
  async getTickets(tenantId: string): Promise<Ticket[]> {
      const tickets = this.get<Ticket[]>('tickets', []);
      return tickets.filter(t => t.tenantId === tenantId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async addTicket(ticket: Ticket): Promise<void> {
      const tickets = this.get<Ticket[]>('tickets', []);
      this.set('tickets', [ticket, ...tickets]);
  }

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<void> {
      const tickets = this.get<Ticket[]>('tickets', []);
      const updated = tickets.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
      this.set('tickets', updated);
  }

  async deleteTicket(id: string): Promise<void> {
      const tickets = this.get<Ticket[]>('tickets', []);
      this.set('tickets', tickets.filter(t => t.id !== id));
  }

  // --- Proposals ---
  async getProposals(tenantId: string): Promise<Proposal[]> {
      const proposals = this.get<Proposal[]>('proposals', []);
      return proposals.filter(p => p.tenantId === tenantId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async addProposal(proposal: Proposal): Promise<void> {
      const proposals = this.get<Proposal[]>('proposals', []);
      this.set('proposals', [proposal, ...proposals]);
  }

  async updateProposal(id: string, updates: Partial<Proposal>): Promise<void> {
      const proposals = this.get<Proposal[]>('proposals', []);
      const updated = proposals.map(p => p.id === id ? { ...p, ...updates } : p);
      this.set('proposals', updated);
  }

  async deleteProposal(id: string): Promise<void> {
      const proposals = this.get<Proposal[]>('proposals', []);
      this.set('proposals', proposals.filter(p => p.id !== id));
  }

  // --- Knowledge Base ---
  async getArticles(tenantId: string): Promise<KnowledgeBaseArticle[]> {
      const articles = this.get<KnowledgeBaseArticle[]>('kb_articles', []);
      return articles.filter(a => a.tenantId === tenantId).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async addArticle(article: KnowledgeBaseArticle): Promise<void> {
      const articles = this.get<KnowledgeBaseArticle[]>('kb_articles', []);
      this.set('kb_articles', [article, ...articles]);
  }

  async updateArticle(id: string, updates: Partial<KnowledgeBaseArticle>): Promise<void> {
      const articles = this.get<KnowledgeBaseArticle[]>('kb_articles', []);
      const updated = articles.map(a => a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a);
      this.set('kb_articles', updated);
  }

  async deleteArticle(id: string): Promise<void> {
      const articles = this.get<KnowledgeBaseArticle[]>('kb_articles', []);
      this.set('kb_articles', articles.filter(a => a.id !== id));
  }

  // --- Leads ---
  async getLeads(tenantId: string): Promise<Lead[]> {
    const leads = this.get<Lead[]>('leads', []);
    return leads.filter(l => l.tenantId === tenantId);
  }

  async updateLeadStatus(leadId: string, status: LeadStatus): Promise<void> {
    const leads = this.get<Lead[]>('leads', []);
    const updated = leads.map(l => l.id === leadId ? { ...l, status } : l);
    this.set('leads', updated);
  }

  async addLead(lead: Lead): Promise<void> {
    const leads = this.get<Lead[]>('leads', []);
    this.set('leads', [...leads, lead]);
  }
  
  async addLeads(newLeads: Lead[]): Promise<void> {
    const leads = this.get<Lead[]>('leads', []);
    this.set('leads', [...leads, ...newLeads]);
  }

  // --- Interactions ---
  async getInteractions(leadId: string): Promise<Interaction[]> {
    const all = this.get<Interaction[]>('interactions', []);
    return all.filter(i => i.leadId === leadId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getAllInteractions(tenantId: string): Promise<Interaction[]> {
    const all = this.get<Interaction[]>('interactions', []);
    return all.filter(i => i.tenantId === tenantId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async addInteraction(interaction: Interaction): Promise<void> {
    const all = this.get<Interaction[]>('interactions', []);
    this.set('interactions', [...all, interaction]);
  }

  // --- Products ---
  async getProducts(tenantId: string): Promise<Product[]> {
    const all = this.get<Product[]>('products', []);
    return all.filter(p => p.tenantId === tenantId);
  }

  async addProduct(product: Product): Promise<void> {
    const all = this.get<Product[]>('products', []);
    this.set('products', [...all, product]);
  }

  // --- Discounts ---
  async getDiscounts(tenantId: string): Promise<Discount[]> {
    const all = this.get<Discount[]>('discounts', []);
    return all.filter(d => d.tenantId === tenantId);
  }

  async addDiscount(discount: Discount): Promise<void> {
    const all = this.get<Discount[]>('discounts', []);
    this.set('discounts', [...all, discount]);
  }

  async updateDiscount(id: string, updates: Partial<Discount>): Promise<void> {
    const all = this.get<Discount[]>('discounts', []);
    const updated = all.map(d => d.id === id ? { ...d, ...updates } : d);
    this.set('discounts', updated);
  }

  async deleteDiscount(id: string): Promise<void> {
    const all = this.get<Discount[]>('discounts', []);
    this.set('discounts', all.filter(d => d.id !== id));
  }

  // --- Documents ---
  async getDocuments(tenantId: string, userId: string): Promise<Document[]> {
    const all = this.get<Document[]>('documents', []);
    return all.filter(d => d.tenantId === tenantId && (d.isPublic || d.uploaderId === userId));
  }

  async addDocument(doc: Document): Promise<void> {
    const all = this.get<Document[]>('documents', []);
    if (!doc.versions || doc.versions.length === 0) {
        doc.versions = [{
            id: `v1-${Date.now()}`,
            name: doc.name,
            type: doc.type,
            size: doc.size,
            createdAt: doc.createdAt,
            uploaderId: doc.uploaderId,
            uploaderName: doc.uploaderName
        }];
    }
    this.set('documents', [doc, ...all]);
  }

  async addDocumentVersion(docId: string, versionData: Omit<DocumentVersion, 'id' | 'createdAt'>): Promise<void> {
      const all = this.get<Document[]>('documents', []);
      const updated = all.map(d => {
          if (d.id === docId) {
              const newVersion: DocumentVersion = {
                  ...versionData,
                  id: `v${d.versions.length + 1}-${Date.now()}`,
                  createdAt: new Date().toISOString()
              };
              return { ...d, name: versionData.name, type: versionData.type, size: versionData.size, versions: [newVersion, ...d.versions] };
          }
          return d;
      });
      this.set('documents', updated);
  }

  async revertDocumentVersion(docId: string, versionId: string): Promise<void> {
      const all = this.get<Document[]>('documents', []);
      const updated = all.map(d => {
          if (d.id === docId) {
              const targetVersion = d.versions.find(v => v.id === versionId);
              if (!targetVersion) return d;
              const restoredVersion: DocumentVersion = {
                  ...targetVersion,
                  id: `v${d.versions.length + 1}-restored-${Date.now()}`,
                  createdAt: new Date().toISOString(),
                  name: `Restored: ${targetVersion.name}`
              };
              return { ...d, name: restoredVersion.name, type: restoredVersion.type, size: restoredVersion.size, versions: [restoredVersion, ...d.versions] };
          }
          return d;
      });
      this.set('documents', updated);
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<void> {
    const all = this.get<Document[]>('documents', []);
    const updated = all.map(d => d.id === id ? { ...d, ...updates } : d);
    this.set('documents', updated);
  }

  async deleteDocument(id: string): Promise<void> {
    const all = this.get<Document[]>('documents', []);
    this.set('documents', all.filter(d => d.id !== id));
  }
}

export const db = new MockDatabase();
