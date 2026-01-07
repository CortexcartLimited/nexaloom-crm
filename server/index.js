const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { authenticateToken } = require('./middleware/authMiddleware');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') })
console.log('DB Config Check:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    db: process.env.DB_NAME
});

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// --- AUTH ROUTES ---
app.use('/api/auth', require('./routes/auth')(pool));

// Apply Auth Middleware to all API routes below
// NOTE: We exclude /api/auth (defined above) and maybe public endpoints if any.
// For now, protecting everything else.
app.use('/api', authenticateToken);

// --- LEADS ROUTES ---

// Get all leads for a tenant
app.get('/api/leads', async (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

    try {
        const [rows] = await pool.query(
            'SELECT * FROM leads WHERE tenantId = ? ORDER BY createdAt DESC',
            [tenantId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new lead
app.post('/api/leads', async (req, res) => {
    const { tenantId, name, company, email, phone, value, status, currency, country } = req.body;
    const id = uuidv4();
    const allowedFields = ['name', 'company', 'email', 'phone', 'value', 'status', 'currency', 'country', 'taxId'];
    const updates = [];
    const values = [];

    try {
        const query = 'INSERT INTO leads (id, tenantId, name, company, email, phone, value, status, currency, country, taxId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())';
        await pool.query(query, [id, tenantId, name, company, email, phone, value || 0, status || 'NEW', currency || 'GBP', country, req.body.taxId]);

        // Log interaction
        await pool.query('INSERT INTO interactions (id, tenantId, leadId, type, notes, date) VALUES (?, ?, ?, "Status Change", "Lead Created", NOW())',
            [uuidv4(), tenantId, id]);

        res.status(201).json({ id, tenantId, name, company, email, phone, value, status, currency, country, taxId: req.body.taxId });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Update lead status
app.patch('/api/leads/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const [result] = await pool.query(
            'UPDATE leads SET status = ? WHERE id = ?',
            [status, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }
        res.json({ success: true, message: 'Lead status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- PRODUCTS ROUTES ---
app.get('/api/products', async (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
    }
    try {
        const [rows] = await pool.query('SELECT * FROM products WHERE tenantId = ?', [tenantId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', async (req, res) => {
    const { tenantId, name, description, price, category } = req.body;
    const id = uuidv4();
    try {
        await pool.query(
            'INSERT INTO products (id, tenantId, name, description, price, category) VALUES (?, ?, ?, ?, ?, ?)',
            [id, tenantId, name, description, price, category]
        );
        res.status(201).json({ id, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ROUTE: Send Email Outreach to Lead
// ROUTE: Send Email Outreach to Lead
app.post('/api/leads/:id/email', async (req, res) => {
    const { id } = req.params;
    const { subject, body } = req.body;
    console.log(`Starting Outreach Send for Lead ID: ${id}`);
    if (req.body.email) console.log(`(Frontend sent email in body: ${req.body.email})`);

    // Validate Inputs
    if (!subject || !body) return res.status(400).json({ error: 'Subject and Body are required' });

    try {
        // 1. Fetch Lead Details
        const [leads] = await pool.query('SELECT * FROM leads WHERE id = ?', [id]);
        if (leads.length === 0) return res.status(404).json({ error: 'Lead not found' });
        const lead = leads[0];

        if (!lead.email) {
            return res.status(400).json({ error: 'Lead does not have an email address' });
        }

        // 2. Fetch Tenant Branding
        const [tenants] = await pool.query('SELECT logoUrl, name, companyName, companyAddress, emailSignature, smtpConfig FROM tenants WHERE id = ?', [lead.tenantId]);
        const branding = tenants[0] || { companyName: 'Nexaloom' };

        // 3. Send Email (Imported dynamically to ensure freshness, though top-level is better for perf)
        // We require it here to ensure we get the latest version if files changed without restart (in dev), 
        // but for correctness we await it explicitly. 
        // CORRECT PATH: Go up one level from 'server' to root, then into 'services'
        const { sendBasicEmail } = require('../services/emailService');

        console.log(`Attempting to send outreach email to ${lead.email} for lead ${lead.id}...`);

        await sendBasicEmail(lead.email, lead.name, subject, body, [], {
            companyName: branding.companyName || branding.name,
            companyAddress: branding.companyAddress,
            logoUrl: branding.logoUrl,
            emailSignature: branding.emailSignature
        });

        console.log(`Email sent successfully to ${lead.email}. Logging interaction...`);

        // 4. Update Interactions Log (ONLY executed if email sends successfully)
        const interactionId = uuidv4();
        await pool.query(
            `INSERT INTO interactions (id, tenantId, leadId, type, notes, date, metadata) VALUES (?, ?, ?, 'EMAIL', ?, NOW(), ?)`,
            [interactionId, lead.tenantId, id, `Outreach: ${subject}`, JSON.stringify({ sentTo: lead.email, subject })]
        );

        res.json({ success: true, message: 'Email sent and logged successfully' });

    } catch (err) {
        console.error('Email Outreach Error:', err);
        // Explicitly return the error so the frontend knows it failed
        res.status(500).json({ error: `Failed to send email: ${err.message}` });
    }
});

// ROUTE: Update Lead (Edit Profile)
app.patch('/api/leads/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        // Dynamically build the update query based on provided fields
        // Allow currency updates if provided
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);

        await pool.query(
            `UPDATE leads SET ${fields} WHERE id = ?`,
            [...values, id]
        );
        res.json({ success: true });
    } catch (err) {
    }
});

// ROUTE: Get Email History for a Lead
app.get('/api/leads/:id/email-history', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM email_history WHERE leadId = ? ORDER BY sentAt DESC',
            [id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching email history:', err);
        res.status(500).json({ error: err.message });
    }
});

// ROUTE: Create Interaction (Save Notes/Emails)
app.post('/api/interactions', async (req, res) => {
    const { id, tenantId, leadId, userId, type, notes, date, metadata, productId } = req.body;

    // Convert '2026-01-04T11:36:41.196Z' to '2026-01-04 11:36:41'
    const formattedDate = (date ? new Date(date) : new Date())
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');

    try {
        await pool.query(
            `INSERT INTO interactions (id, tenantId, leadId, userId, type, notes, date, metadata, productId) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id || uuidv4(),
                tenantId,
                leadId,
                userId || null,
                type,
                notes,
                formattedDate, // Use the cleaned-up date here
                JSON.stringify(metadata || {}),
                productId || null
            ]
        );
        res.status(201).json({ success: true });
    } catch (err) {
        console.error("SQL ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});
// --- DISCOUNTS ROUTES ---
app.get('/api/discounts', async (req, res) => {
    const { tenantId } = req.query;
    try {
        const [rows] = await pool.query('SELECT * FROM discounts WHERE tenantId = ?', [tenantId]);

        // This part is the "Magic Fix" for the disappearing discounts
        const sanitizedRows = rows.map(row => ({
            ...row,
            applicableProductIds: row.applicableProductIds ? JSON.parse(row.applicableProductIds) : []
        }));

        res.json(sanitizedRows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch discounts" });
    }
});

app.post('/api/discounts', async (req, res) => {
    const { id, tenantId, name, code, type, value, applicableProductIds, expiresAt, contractTerm, isManagerOnly } = req.body;

    try {
        // Stringify the array for MySQL TEXT column
        const productsJson = JSON.stringify(applicableProductIds || ['ALL']);

        // Format date for MySQL or use NULL
        const mysqlExpiresAt = expiresAt ? new Date(expiresAt).toISOString().slice(0, 19).replace('T', ' ') : null;

        const query = `
            INSERT INTO discounts 
            (id, tenantId, name, code, type, value, applicableProductIds, expiresAt, contractTerm, isManagerOnly, currency) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await pool.query(query, [
            id,
            tenantId,
            name,
            code,
            type,
            value,
            productsJson,
            mysqlExpiresAt,
            contractTerm || null,
            isManagerOnly ? 1 : 0,
            req.body.currency || 'GBP'
        ]);

        res.status(201).json({ success: true });
    } catch (err) {
        console.error("DISCOUNT INSERT ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/discounts/:id', async (req, res) => {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'];

    try {
        // Use [result] destructuring and await, just like your other working routes
        const [result] = await pool.query(
            'DELETE FROM discounts WHERE id = ? AND tenantId = ?',
            [id, tenantId]
        );
        res.json({ message: "Deleted successfully", affectedRows: result.affectedRows });
    } catch (err) {
        console.error("DELETE ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- INTERACTIONS ROUTES ---
app.get('/api/interactions', async (req, res) => {
    const { leadId, tenantId } = req.query;
    if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
    }

    let query = 'SELECT * FROM interactions WHERE tenantId = ?';
    const params = [tenantId];

    if (leadId) {
        query += ' AND leadId = ?';
        params.push(leadId);
    }

    // Optional date filtering for Calendar
    const { startDate, endDate } = req.query;
    if (startDate) {
        query += ' AND date >= ?';
        params.push(startDate);
    }
    if (endDate) {
        query += ' AND date <= ?';
        params.push(endDate);
    }

    query += ' ORDER BY date DESC';

    try {
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TASKS ROUTES ---
app.use('/api/tasks', require('./routes/tasks')(pool));

// --- DOCUMENTS ROUTES ---
app.use('/api/documents', require('./routes/documents')(pool));
app.use('/api/documents', require('./routes/documents')(pool));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- PROPOSALS ROUTES ---
app.use('/api/proposals', require('./routes/proposals')(pool));

// --- KNOWLEDGE BASE ROUTES ---
app.use('/api/knowledge-base', require('./routes/knowledge-base')(pool));

// --- TICKETS ROUTES ---
app.use('/api/tickets', require('./routes/tickets')(pool));

// --- USERS ROUTES ---
app.use('/api/users', require('./routes/users')(pool));

// --- SETTINGS ROUTES ---
app.use('/api/settings', require('./routes/settings')(pool));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});