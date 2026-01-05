const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

module.exports = (pool) => {
    // GET /api/users
    router.get('/', async (req, res) => {
        const { tenantId } = req.query;
        if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

        try {
            const [rows] = await pool.query('SELECT * FROM users WHERE tenantId = ? ORDER BY name ASC', [tenantId]);
            // Parse preferences if string
            const result = rows.map(row => ({
                ...row,
                preferences: typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences
            }));
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/users
    router.post('/', async (req, res) => {
        const { id, tenantId, name, email, role, preferences } = req.body;
        const userId = id || uuidv4();
        const prefs = JSON.stringify(preferences || { theme: 'light' });

        try {
            await pool.query(
                `INSERT INTO users (id, tenantId, name, email, role, preferences, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                [userId, tenantId, name, email, role, prefs]
            );
            res.status(201).json({ ...req.body, id: userId });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/users/:id
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const updates = req.body;

        if (updates.preferences && typeof updates.preferences === 'object') {
            updates.preferences = JSON.stringify(updates.preferences);
        }

        try {
            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);

            if (fields.length > 0) {
                await pool.query(`UPDATE users SET ${fields} WHERE id = ?`, [...values, id]);
            }
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/users/:id
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await pool.query('DELETE FROM users WHERE id = ?', [id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
