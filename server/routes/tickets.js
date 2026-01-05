const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

module.exports = (pool) => {
    // GET /api/tickets
    router.get('/', async (req, res) => {
        const { tenantId, leadId, status } = req.query;
        if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

        let query = 'SELECT * FROM tickets WHERE tenantId = ?';
        const params = [tenantId];

        if (leadId) {
            query += ' AND leadId = ?';
            params.push(leadId);
        }

        // Simplify status filter if needed, though frontend does most filtering
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY updatedAt DESC';

        try {
            const [rows] = await pool.query(query, params);
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/tickets
    router.post('/', async (req, res) => {
        const { id, tenantId, leadId, subject, description, priority, status } = req.body;
        const ticketId = id || uuidv4();

        try {
            await pool.query(
                `INSERT INTO tickets (id, tenantId, leadId, subject, description, priority, status, createdAt, updatedAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [ticketId, tenantId, leadId || null, subject, description, priority || 'Medium', status || 'Open']
            );
            res.status(201).json({ id: ticketId, ...req.body });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/tickets/:id
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const updates = req.body;

        // Remove undefined/nulls if any, but mysql driver handles some. 
        // Important: Update 'updatedAt'
        updates.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

        try {
            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);

            if (fields.length > 0) {
                await pool.query(`UPDATE tickets SET ${fields} WHERE id = ?`, [...values, id]);
            }
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/tickets/:id
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await pool.query('DELETE FROM tickets WHERE id = ?', [id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
