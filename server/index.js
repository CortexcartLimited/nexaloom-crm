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
app.get('/crm/nexaloom-crm/api/leads', async (req, res) => {
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
app.post('/crm/nexaloom-crm/api/leads', async (req, res) => {
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
app.patch('/crm/nexaloom-crm/api/leads/:id/status', async (req, res) => {
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
app.get('/crm/nexaloom-crm/api/products', async (req, res) => {
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

app.post('/crm/nexaloom-crm/api/products', async (req, res) => {
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

// --- DISCOUNTS ROUTES ---
app.get('/crm/nexaloom-crm/api/discounts', async (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
    }
    try {
        const [rows] = await pool.query('SELECT * FROM discounts WHERE tenantId = ?', [tenantId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/crm/nexaloom-crm/api/discounts', async (req, res) => {
    const { tenantId, code, type, value, productId } = req.body;
    const id = uuidv4();
    try {
        await pool.query(
            'INSERT INTO discounts (id, tenantId, code, type, value, productId) VALUES (?, ?, ?, ?, ?, ?)',
            [id, tenantId, code, type, value, productId]
        );
        res.status(201).json({ id, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- INTERACTIONS ROUTES ---
app.get('/crm/nexaloom-crm/api/interactions', async (req, res) => {
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

app.post('/crm/nexaloom-crm/api/interactions', async (req, res) => {
    const { tenantId, leadId, userId, type, notes } = req.body;
    const id = uuidv4();
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    try {
        await pool.query(
            'INSERT INTO interactions (id, tenantId, leadId, userId, type, notes, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, tenantId, leadId, userId, type, notes, date]
        );
        res.status(201).json({ id, date, ...req.body });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});