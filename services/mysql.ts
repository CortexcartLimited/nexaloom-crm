
import mysql from 'mysql2/promise';
import { Tenant, User, Lead, Interaction, UserRole, LeadStatus, Product, Discount, DiscountType, Document, DocumentVersion, UserPreferences, SmtpConfig, Task, TaskPriority, Ticket, TicketStatus, DemoAccount, Proposal, ProposalStatus, KnowledgeBaseArticle } from '../types';
import { PROPOSED_SQL_SCHEMA } from '../constants';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true // Allow multiple statements for schema creation
});

class MySqlDatabase {
  constructor() {
    this.initializeSchema();
  }

  private async initializeSchema() {
    try {
      const connection = await pool.getConnection();
      await connection.query(PROPOSED_SQL_SCHEMA);
      connection.release();
      console.log('Database schema initialized successfully.');
    } catch (error) {
      // We can ignore table already exists error
      if (error.code !== 'ER_TABLE_EXISTS_ERROR') {
        console.error('Error initializing database schema:', error);
      }
    }
  }

  async login(email: string): Promise<{ user: User; tenant: Tenant }> {
    const connection = await pool.getConnection();
    try {
      // For now, we will just return a mock user and tenant, like in the mock database.
      // This will be replaced with a real implementation.
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
      return { user: INITIAL_USER, tenant: INITIAL_TENANT };
    } finally {
      connection.release();
    }
  }

  async getInteractions(leadId: string): Promise<Interaction[]> {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute('SELECT * FROM interactions WHERE lead_id = ? ORDER BY occurred_at DESC', [leadId]);
      return (rows as any[]).map(row => ({ ...row, metadata: JSON.parse(row.metadata) }));
    } finally {
      connection.release();
    }
  }

  async addInteraction(interaction: Interaction): Promise<void> {
    const connection = await pool.getConnection();
    try {
      const { id, tenant_id, lead_id, user_id, type, notes, occurred_at, metadata } = interaction;
      await connection.execute(
        'INSERT INTO interactions (id, tenant_id, lead_id, user_id, type, notes, occurred_at, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, tenant_id, lead_id, user_id, type, notes, occurred_at, metadata ? JSON.stringify(metadata) : null]
      );
    } finally {
      connection.release();
    }
  }

  // ... other methods will be implemented later
  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> { throw new Error("Not implemented"); }
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<User> { throw new Error("Not implemented"); }
  async getUsers(tenantId: string): Promise<User[]> { throw new Error("Not implemented"); }
  async addUser(user: User): Promise<void> { throw new Error("Not implemented"); }
  async updateUser(id: string, updates: Partial<User>): Promise<void> { throw new Error("Not implemented"); }
  async deleteUser(id: string): Promise<void> { throw new Error("Not implemented"); }
  async getDemoAccounts(tenantId: string): Promise<DemoAccount[]> { throw new Error("Not implemented"); }
  async addDemoAccount(demo: DemoAccount): Promise<void> { throw new Error("Not implemented"); }
  async deleteDemoAccount(id: string): Promise<void> { throw new Error("Not implemented"); }
  async getTasks(tenantId: string): Promise<Task[]> { throw new Error("Not implemented"); }
  async addTask(task: Task): Promise<void> { throw new Error("Not implemented"); }
  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> { throw new Error("Not implemented"); }
  async deleteTask(taskId: string): Promise<void> { throw new Error("Not implemented"); }
  async getTickets(tenantId: string): Promise<Ticket[]> { throw new Error("Not implemented"); }
  async addTicket(ticket: Ticket): Promise<void> { throw new Error("Not implemented"); }
  async updateTicket(id: string, updates: Partial<Ticket>): Promise<void> { throw new Error("Not implemented"); }
  async deleteTicket(id: string): Promise<void> { throw new Error("Not implemented"); }
  async getProposals(tenantId: string): Promise<Proposal[]> { throw new Error("Not implemented"); }
  async addProposal(proposal: Proposal): Promise<void> { throw new Error("Not implemented"); }
  async updateProposal(id: string, updates: Partial<Proposal>): Promise<void> { throw new Error("Not implemented"); }
  async deleteProposal(id: string): Promise<void> { throw new Error("Not implemented"); }
  async getArticles(tenantId: string): Promise<KnowledgeBaseArticle[]> { throw new Error("Not implemented"); }
  async addArticle(article: KnowledgeBaseArticle): Promise<void> { throw new Error("Not implemented"); }
  async updateArticle(id: string, updates: Partial<KnowledgeBaseArticle>): Promise<void> { throw new Error("Not implemented"); }
  async deleteArticle(id: string): Promise<void> { throw new Error("Not implemented"); }
  async getLeads(tenantId: string): Promise<Lead[]> { throw new Error("Not implemented"); }
  async updateLeadStatus(leadId: string, status: LeadStatus): Promise<void> { throw new Error("Not implemented"); }
  async addLead(lead: Lead): Promise<void> { throw new Error("Not implemented"); }
  async addLeads(newLeads: Lead[]): Promise<void> { throw new Error("Not implemented"); }
  async getAllInteractions(tenantId: string): Promise<Interaction[]> { throw new Error("Not implemented"); }
  async getProducts(tenantId: string): Promise<Product[]> { throw new Error("Not implemented"); }
  async addProduct(product: Product): Promise<void> { throw new Error("Not implemented"); }
  async getDiscounts(tenantId: string): Promise<Discount[]> { throw new Error("Not implemented"); }
  async addDiscount(discount: Discount): Promise<void> { throw new Error("Not implemented"); }
  async updateDiscount(id: string, updates: Partial<Discount>): Promise<void> { throw new Error("Not implemented"); }
  async deleteDiscount(id: string): Promise<void> { throw new Error("Not implemented"); }
  async getDocuments(tenantId: string, userId: string): Promise<Document[]> { throw new Error("Not implemented"); }
  async addDocument(doc: Document): Promise<void> { throw new Error("Not implemented"); }
  async addDocumentVersion(docId: string, versionData: Omit<DocumentVersion, 'id' | 'createdAt'>): Promise<void> { throw new Error("Not implemented"); }
  async revertDocumentVersion(docId: string, versionId: string): Promise<void> { throw new Error("Not implemented"); }
  async updateDocument(id: string, updates: Partial<Document>): Promise<void> { throw new Error("Not implemented"); }
  async deleteDocument(id: string): Promise<void> { throw new Error("Not implemented"); }
}

export const db = new MySqlDatabase();
