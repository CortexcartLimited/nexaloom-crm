export const PROPOSED_SQL_SCHEMA = `
-- Nexaloom Multi-Tenant Database Schema (MySQL 8)

-- 1. Tenants Table (Isolates Data Ownership)
CREATE TABLE tenants (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table (Belongs to a Tenant)
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'USER') DEFAULT 'USER',
    full_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, email) -- Email unique per tenant
);

-- 3. Leads Table (Core CRM Entity)
CREATE TABLE leads (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    tenant_id VARCHAR(36) NOT NULL,
    owner_id VARCHAR(36),
    name VARCHAR(100) NOT NULL,
    company VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    value DECIMAL(12, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'New',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Interactions (Logs calls, emails, notes)
CREATE TABLE interactions (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL,
    lead_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    type VARCHAR(50) NOT NULL, -- 'CALL', 'EMAIL', 'MEETING'
    notes TEXT,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON, -- Store email subjects, attachments etc.
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for Performance & Tenant Isolation
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_interactions_tenant ON interactions(tenant_id);
`;
