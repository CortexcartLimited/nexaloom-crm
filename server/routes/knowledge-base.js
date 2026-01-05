const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

module.exports = (pool) => {
    // GET /api/knowledge-base
    router.get('/', async (req, res) => {
        const { tenantId, category, search } = req.query;
        if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

        let query = 'SELECT * FROM knowledge_base WHERE tenantId = ?';
        const params = [tenantId];

        if (category && category !== 'ALL') {
            query += ' AND category = ?';
            params.push(category);
        }

        if (search) {
            query += ' AND (title LIKE ? OR content LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY updatedAt DESC';

        try {
            const [rows] = await pool.query(query, params);
            // Parse tags from JSON/String if needed, but for now assuming comma separated string stored as TEXT or dealing with it in frontend
            // If stored as JSON string:
            const result = rows.map(row => ({
                ...row,
                tags: row.tags ? (row.tags.startsWith('[') ? JSON.parse(row.tags) : row.tags.split(',')) : []
            }));
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/knowledge-base
    router.post('/', async (req, res) => {
        const { id, tenantId, title, content, category, tags, authorId, authorName, isPublic } = req.body;
        const articleId = id || uuidv4();

        // Ensure tags is a string for TEXT column if simplistic, or JSON
        const tagsString = Array.isArray(tags) ? JSON.stringify(tags) : tags;

        try {
            await pool.query(
                `INSERT INTO knowledge_base (id, tenantId, title, content, category, tags, authorId, authorName, isPublic, createdAt, updatedAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                [articleId, tenantId, title, content, category, tagsString, authorId, authorName, isPublic ? 1 : 0]
            );
            res.status(201).json({ id: articleId, ...req.body });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/knowledge-base/:id
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const updates = req.body;

        // Handle tags array -> string conversion if present
        if (updates.tags && Array.isArray(updates.tags)) {
            updates.tags = JSON.stringify(updates.tags);
        }

        try {
            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);

            if (fields.length > 0) {
                await pool.query(`UPDATE knowledge_base SET ${fields} WHERE id = ?`, [...values, id]);
            }
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/knowledge-base/:id
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await pool.query('DELETE FROM knowledge_base WHERE id = ?', [id]);
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
