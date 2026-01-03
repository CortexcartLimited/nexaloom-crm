
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
