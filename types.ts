
export enum UserRole {
  ADMIN = 'ADMIN',
  TEAM_LEADER = 'TEAM_LEADER',
  SERVICE_AGENT = 'SERVICE_AGENT',
  SALES_AGENT = 'SALES_AGENT'
}

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  WON = 'WON',
  LOST = 'LOST'
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export enum TicketStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved',
  CLOSED = 'Closed'
}

export enum ProposalStatus {
  DRAFT = 'Draft',
  SENT = 'Sent',
  VIEWED = 'Viewed',
  ACCEPTED = 'Accepted',
  DECLINED = 'Declined'
}

export interface DemoAccount {
  id: string;
  tenantId: string;
  leadId: string;
  leadName: string;
  username: string;
  passwordHash: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
  expiresAt: string;
  createdAt: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  secure: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  createdAt?: string;
  smtpConfig?: SmtpConfig;
  stripeAccountId?: string;
  stripePublicKey?: string;
  logoUrl?: string;
  emailSignature?: string;
  companyName?: string;
  companyAddress?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  backgroundId: string;
}

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  preferences: UserPreferences;
}

export interface Lead {
  id: string;
  tenantId: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  value: number;
  status: LeadStatus;
  createdAt: string;
  lastInteraction?: string;
  currency?: string;
  country?: string;
}

export interface Interaction {
  id: string;
  tenantId: string;
  leadId: string;
  userId?: string;
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE';
  notes: string;
  date: string;
  metadata?: {
    subject?: string;
    snippet?: string;
    from?: string;
    to?: string;
    attachments?: string[];
  };
}

export interface Task {
  id: string;
  tenantId: string;
  leadId: string;
  title: string;
  description?: string;
  deadline: string;
  reminderAt?: string;
  reminderSent?: boolean;
  isCompleted: boolean;
  priority: TaskPriority;
  createdAt: string;
}

export interface Ticket {
  id: string;
  tenantId: string;
  leadId?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  price: number;
  billingCycle: 'MONTHLY' | 'YEARLY' | 'ONE_TIME' | 'EVERY_28_DAYS';
  stripeProductId?: string;
  stripePriceId?: string;
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  TRIAL_EXTENSION = 'TRIAL_EXTENSION',
  CONTRACT = 'CONTRACT',
  CUSTOM = 'CUSTOM',
  FIXED_AMOUNT = 'FIXED_AMOUNT'
}

export interface Discount {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  type: DiscountType;
  value: number;
  currency?: string;
  contractTerm?: 6 | 12;
  isManagerOnly?: boolean;
  applicableProductIds: string[];
  expiresAt?: string;
}

export interface ProposalItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  description?: string;
}

export interface Proposal {
  id: string;
  tenantId: string;
  name: string;
  leadId: string;
  leadName: string;
  leadCompany: string;
  items: ProposalItem[];
  totalValue: number;
  taxRate?: number;
  taxAmount?: number;
  status: ProposalStatus;
  currency?: string;
  validUntil: string;
  terms?: string;
  createdAt: string;
  createdBy: string;
  files?: { id: string; name: string }[];
}

export interface DocumentVersion {
  id: string;
  name: string;
  type: 'PDF' | 'SPREADSHEET' | 'DOC' | 'IMAGE' | 'OTHER';
  size: number;
  createdAt: string;
  uploaderId: string;
  uploaderName: string;
}

export interface Document {
  id: string;
  tenantId: string;
  uploaderId: string;
  uploaderName: string;
  name: string;
  type: 'PDF' | 'SPREADSHEET' | 'DOC' | 'IMAGE' | 'OTHER';
  size: number;
  isPublic: boolean;
  createdAt: string;
  versions: DocumentVersion[];
}

export interface KnowledgeBaseArticle {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string;
  isPublic: boolean;
}
