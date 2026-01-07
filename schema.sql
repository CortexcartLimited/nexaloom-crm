
CREATE TABLE IF NOT EXISTS leads (
    id VARCHAR(255) PRIMARY KEY,
    tenantId VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(255),
    value DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST') DEFAULT 'NEW',
    currency VARCHAR(10) DEFAULT 'GBP',
    country VARCHAR(100),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastInteraction DATETIME
);

CREATE TABLE products (
    id VARCHAR(255) PRIMARY KEY,
    tenantId VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(255)
);

CREATE TABLE discounts (
    id VARCHAR(255) PRIMARY KEY,
    tenantId VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'percentage', 'fixed'
    value DECIMAL(10, 2) NOT NULL,
    productId VARCHAR(255),
    FOREIGN KEY (productId) REFERENCES products(id)
);

CREATE TABLE interactions (
    id VARCHAR(255) PRIMARY KEY,
    tenantId VARCHAR(255) NOT NULL,
    leadId VARCHAR(255) NOT NULL,
    userId VARCHAR(255),
    type VARCHAR(255) NOT NULL, -- e.g., 'Note', 'Call', 'Email', 'Meeting', 'Status Change'
    notes TEXT,
    date DATETIME NOT NULL,
    FOREIGN KEY (leadId) REFERENCES leads(id),
    FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(255) PRIMARY KEY,
    tenantId VARCHAR(255) NOT NULL,
    leadId VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline DATETIME,
    priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
    isCompleted BOOLEAN DEFAULT FALSE,
    reminderAt DATETIME,
    reminderSent BOOLEAN DEFAULT FALSE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leadId) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(255) PRIMARY KEY,
    tenantId VARCHAR(255) NOT NULL,
    leadId VARCHAR(255),
    fileName VARCHAR(255) NOT NULL,
    fileUrl TEXT NOT NULL,
    fileSize INT,
    visibility ENUM('PUBLIC', 'PRIVATE') DEFAULT 'PRIVATE',
    type VARCHAR(50),
    uploaderId VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leadId) REFERENCES leads(id) ON DELETE CASCADE
);

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    tenantId VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    passwordHash VARCHAR(255),
    role ENUM('ADMIN', 'TEAM_LEADER', 'SERVICE_AGENT', 'SALES_AGENT') DEFAULT 'SALES_AGENT',
    lastLogin DATETIME,
    preferences JSON,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE CASCADE
);

-- TENANTS TABLE
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    smtpConfig JSON,
    stripeAccountId VARCHAR(255),
    stripePublicKey VARCHAR(255),
    logoUrl TEXT,
    emailSignature TEXT,
    companyName VARCHAR(255),
    companyAddress TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- PROPOSALS TABLES
CREATE TABLE IF NOT EXISTS proposals (
    id VARCHAR(255) PRIMARY KEY,
    tenantId VARCHAR(255) NOT NULL,
    leadId VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    status ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED') DEFAULT 'DRAFT',
    totalValue DECIMAL(10, 2) DEFAULT 0.00,
    validUntil DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leadId) REFERENCES leads(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS proposal_items (
    id VARCHAR(255) PRIMARY KEY,
    proposalId VARCHAR(255) NOT NULL,
    productId VARCHAR(255),
    description TEXT,
    quantity INT DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (proposalId) REFERENCES proposals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS proposal_files (
    id VARCHAR(50) PRIMARY KEY,
    proposalId VARCHAR(50) NOT NULL,
    documentId VARCHAR(255) NOT NULL,
    FOREIGN KEY (proposalId) REFERENCES proposals(id) ON DELETE CASCADE,
    FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE
);

-- KNOWLEDGE BASE
CREATE TABLE IF NOT EXISTS knowledge_base (
    id VARCHAR(255) PRIMARY KEY,
    tenantId VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    category VARCHAR(100),
    tags TEXT, -- JSON array of strings
    isPublic BOOLEAN DEFAULT FALSE,
    authorId VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS tickets (
    id VARCHAR(255) PRIMARY KEY,
    tenantId VARCHAR(255) NOT NULL,
    leadId VARCHAR(255), -- Optional link to a customer
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED') DEFAULT 'OPEN',
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    assignedTo VARCHAR(255), -- User ID
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    leadId VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    type VARCHAR(50) NOT NULL, -- 'outreach', 'proposal'
    sentAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (leadId) REFERENCES leads(id) ON DELETE CASCADE
);
