const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config({ path: path.join(__dirname, '.env.production') })

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

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
    const { tenantId, name, company, email, phone, value, status } = req.body;
    const id = uuidv4();
    
    try {
        await pool.query(
            `INSERT INTO leads (id, tenantId, name, company, email, phone, value, status, createdAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [id, tenantId, name, company, email, phone, value, status]
        );
        res.status(201).json({ id, ...req.body });
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
// ROUTE: Update Lead (Edit Profile)
app.patch('/api/leads/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    try {
        // Dynamically build the update query based on provided fields
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        
        await pool.query(
            `UPDATE leads SET ${fields} WHERE id = ?`,
            [...values, id]
        );
        res.json({ success: true });
    } catch (err) {
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
            (id, tenantId, name, code, type, value, applicableProductIds, expiresAt, contractTerm, isManagerOnly) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            isManagerOnly ? 1 : 0
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
  
    // FIX: Changed 'db' to 'pool' (or whatever your working routes use)
    pool.query('DELETE FROM discounts WHERE id = ? AND tenantId = ?', [id, tenantId], (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Deleted successfully" });
    });
  });

// --- INTERACTIONS ROUTES ---
app.get('/api/interactions', async (req, res) => {
    const { leadId, tenantId } = req.query;
    if(!tenantId){
        return res.status(400).json({ error: 'tenantId is required' });
    }
    
    let query = 'SELECT * FROM interactions WHERE tenantId = ?';
    const params = [tenantId];

    if (leadId) {
        query += ' AND leadId = ?';
        params.push(leadId);
    }
    query += ' ORDER BY date DESC';

    try {
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});