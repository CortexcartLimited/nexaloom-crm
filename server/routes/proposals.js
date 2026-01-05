const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

module.exports = (pool) => {
    // GET /api/proposals (List)
    router.get('/', async (req, res) => {
        const { tenantId, leadId } = req.query;
        if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

        let query = 'SELECT * FROM proposals WHERE tenantId = ?';
        const params = [tenantId];

        if (leadId) {
            query += ' AND leadId = ?';
            params.push(leadId);
        }

        query += ' ORDER BY createdAt DESC';

        try {
            const [proposals] = await pool.query(query, params);

            // Fetch items for each proposal (Not efficiently, but functional for now)
            // Ideally should be a JOIN or separate call, but for simplicity:
            for (let prop of proposals) {
                const [items] = await pool.query('SELECT * FROM proposal_items WHERE proposalId = ?', [prop.id]);
                prop.items = items;
            }

            res.json(proposals);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/proposals (Create)
    router.post('/', async (req, res) => {
        const { id, tenantId, leadId, leadName, leadCompany, items, totalValue, status, validUntil, terms, createdBy } = req.body;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const proposalId = id || uuidv4();
            const validUntilDate = validUntil ? new Date(validUntil).toISOString().slice(0, 19).replace('T', ' ') : null;

            // 1. Insert Proposal
            await connection.query(
                `INSERT INTO proposals (id, tenantId, leadId, leadName, leadCompany, totalValue, status, validUntil, terms, createdBy, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [proposalId, tenantId, leadId, leadName, leadCompany, totalValue, status, validUntilDate, terms, createdBy]
            );

            // 2. Insert Items
            if (items && items.length > 0) {
                const itemValues = items.map(item => [
                    item.id || uuidv4(),
                    proposalId,
                    item.productId || null,
                    item.name,
                    item.quantity,
                    item.price,
                    item.description
                ]);

                await connection.query(
                    `INSERT INTO proposal_items (id, proposalId, productId, name, quantity, price, description) VALUES ?`,
                    [itemValues]
                );
            }

            await connection.commit();
            res.status(201).json({ id: proposalId, ...req.body });

        } catch (err) {
            await connection.rollback();
            console.error("Proposal Creation Error:", err);
            res.status(500).json({ error: err.message });
        } finally {
            connection.release();
        }
    });

    // PUT /api/proposals/:id (Update Status/Details)
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const updates = req.body;

        // Exclude items from simple updates for now, primarily for status changes
        // If full edit is needed, it would require diffing items or wiping and re-inserting
        delete updates.items;

        // Sanitize date if present
        if (updates.validUntil) {
            updates.validUntil = new Date(updates.validUntil).toISOString().slice(0, 19).replace('T', ' ');
        }

        try {
            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);

            if (fields.length > 0) {
                await pool.query(`UPDATE proposals SET ${fields} WHERE id = ?`, [...values, id]);
            }

            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // DELETE /api/proposals/:id
    router.delete('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await pool.query('DELETE FROM proposals WHERE id = ?', [id]);
            // Items filtered by CASCADE foreign key
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
