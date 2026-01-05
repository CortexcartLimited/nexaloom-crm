const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

module.exports = (pool) => {
    // GET /api/tasks
    router.get('/', async (req, res) => {
        const { tenantId, leadId } = req.query;
        if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

        let query = 'SELECT * FROM tasks WHERE tenantId = ?';
        const params = [tenantId];

        if (leadId) {
            query += ' AND leadId = ?';
            params.push(leadId);
        }

        query += ' ORDER BY deadline ASC'; // Closest deadlines first

        try {
            const [rows] = await pool.query(query, params);
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/tasks
    router.post('/', async (req, res) => {
        const { tenantId, leadId, title, description, deadline, priority, reminderAt } = req.body;
        const id = uuidv4();

        // Basic validation
        if (!tenantId || !leadId || !title) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        try {
            const mysqlDeadline = deadline ? new Date(deadline).toISOString().slice(0, 19).replace('T', ' ') : null;
            const mysqlReminderAt = reminderAt ? new Date(reminderAt).toISOString().slice(0, 19).replace('T', ' ') : null;

            await pool.query(
                `INSERT INTO tasks (id, tenantId, leadId, title, description, deadline, priority, reminderAt, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [id, tenantId, leadId, title, description, mysqlDeadline, priority || 'Medium', mysqlReminderAt]
            );
            res.status(201).json({ id, ...req.body });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/tasks/:id
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const { title, description, deadline, priority, reminderAt, isCompleted } = req.body;
        const tenantId = req.headers['x-tenant-id'] || req.body.tenantId; // Ideally from auth middleware

        try {
            const updates = [];
            const values = [];

            if (title !== undefined) { updates.push('title = ?'); values.push(title); }
            if (description !== undefined) { updates.push('description = ?'); values.push(description); }
            if (deadline !== undefined) { 
                updates.push('deadline = ?'); 
                values.push(deadline ? new Date(deadline).toISOString().slice(0, 19).replace('T', ' ') : null); 
            }
            if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
            if (reminderAt !== undefined) { 
                updates.push('reminderAt = ?'); 
                values.push(reminderAt ? new Date(reminderAt).toISOString().slice(0, 19).replace('T', ' ') : null); 
            }
            if (isCompleted !== undefined) { updates.push('isCompleted = ?'); values.push(isCompleted ? 1 : 0); }

            if (updates.length === 0) return res.json({ message: "No changes" });

            const query = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
            // Note: In a real app we'd also check tenantId here for security
            
            await pool.query(query, [...values, id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/tasks/:id
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        const { tenantId } = req.query; // Or body/headers

        try {
             // In real app add tenantId check: WHERE id = ? AND tenantId = ?
            await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/tasks/:id/toggle
    router.post('/:id/toggle', async (req, res) => {
        const { id } = req.params;
        
        try {
            // First get current status
            const [rows] = await pool.query('SELECT isCompleted FROM tasks WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: "Task not found" });

            const newStatus = !rows[0].isCompleted;
            await pool.query('UPDATE tasks SET isCompleted = ? WHERE id = ?', [newStatus, id]);
            
            res.json({ success: true, isCompleted: newStatus });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
