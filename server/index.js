const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
// This tells dotenv exactly which filename to use
require('dotenv').config({ path: path.join(__dirname, '.env.production') })
const app = express();
app.use(cors()); // Allows your React app to talk to this server
app.use(express.json());

// MySQL Connection Pool
const pool = mysql.createPool({
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Example Route: Get Users from MySQL
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- TASKS ROUTES ---

// Get all tasks for a specific tenant
app.get('/api/tasks', async (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

    try {
        const [rows] = await pool.query(
            'SELECT * FROM tasks WHERE tenantId = ? ORDER BY deadline ASC', 
            [tenantId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update a task (e.g., mark as completed)
app.patch('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { isCompleted, reminderSent } = req.body;
    try {
        await pool.query(
            'UPDATE tasks SET isCompleted = ?, reminderSent = ? WHERE id = ?',
            [isCompleted ? 1 : 0, reminderSent ? 1 : 0, id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all leads for a tenant
app.get('/api/leads', async (req, res) => {
    const { tenantId } = req.query;
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
    const { id, tenantId, name, company, email, phone, value, status } = req.body;
    try {
        await pool.query(
            'INSERT INTO leads (id, tenantId, name, company, email, phone, value, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, tenantId, name, company, email, phone, value, status]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});