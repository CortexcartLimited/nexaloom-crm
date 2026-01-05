const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { sendProposalEmail } = require('../services/emailService');

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

    // GET /api/proposals/:id (Single)
    router.get('/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const [rows] = await pool.query('SELECT * FROM proposals WHERE id = ?', [id]);
            if (rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });

            const proposal = rows[0];
            const [items] = await pool.query('SELECT * FROM proposal_items WHERE proposalId = ?', [id]);
            proposal.items = items;

            const [files] = await pool.query(`
                SELECT pf.documentId as id, d.fileName as name 
                FROM proposal_files pf 
                JOIN documents d ON pf.documentId = d.id 
                WHERE pf.proposalId = ?`, [id]);
            proposal.files = files;

            res.json(proposal);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/proposals (Create)
    router.post('/', async (req, res) => {
        const { id, tenantId, name, leadId, leadName, leadCompany, items, totalValue, status, validUntil, terms, createdBy } = req.body;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const validUntilDate = validUntil ? new Date(validUntil).toISOString().slice(0, 19).replace('T', ' ') : null;

            // 1. Insert Proposal
            const proposalId = id || uuidv4();
            await connection.query(
                `INSERT INTO proposals (id, tenantId, name, leadId, leadName, leadCompany, totalValue, status, validUntil, terms, createdBy, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [proposalId, tenantId, name, leadId, leadName, leadCompany, totalValue, status, validUntilDate, terms, createdBy]
            );



            // 2. Insert Items
            if (items && items.length > 0) {
                const itemValues = items.map(item => [
                    item.id && !item.id.toString().startsWith('item-') ? item.id : uuidv4(),
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

    // PUT /api/proposals/:id (Update)
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const updates = req.body;
        const items = updates.items;

        // Remove items from main table update object
        delete updates.items;

        // Sanitize date if present
        if (updates.validUntil) {
            updates.validUntil = new Date(updates.validUntil).toISOString().slice(0, 19).replace('T', ' ');
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);

            if (fields.length > 0) {
                await connection.query(`UPDATE proposals SET ${fields} WHERE id = ?`, [...values, id]);
            }

            // Sync Items if provided
            if (items) {
                // Delete old items
                await connection.query('DELETE FROM proposal_items WHERE proposalId = ?', [id]);

                // Insert new items
                if (items.length > 0) {
                    const itemValues = items.map(item => [
                        item.id || uuidv4(),
                        id,
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
            }

            await connection.commit();
            res.json({ success: true });
        } catch (err) {
            await connection.rollback();
            res.status(500).json({ error: err.message });
        } finally {
            connection.release();
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

    // POST /api/proposals/:id/files (Update Attachments)
    router.post('/:id/files', async (req, res) => {
        const { id } = req.params;
        const { documentIds } = req.body;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Clear existing files
            await connection.query('DELETE FROM proposal_files WHERE proposalId = ?', [id]);

            // Insert new files
            if (documentIds && documentIds.length > 0) {
                const values = documentIds.map(docId => [uuidv4(), id, docId]);
                await connection.query('INSERT INTO proposal_files (id, proposalId, documentId) VALUES ?', [values]);
            }

            await connection.commit();
            res.json({ success: true });
        } catch (err) {
            await connection.rollback();
            res.status(500).json({ error: err.message });
        } finally {
            connection.release();
        }
    });

    // POST /api/proposals/:id/send (Email Proposal)
    router.post('/:id/send', async (req, res) => {
        const { id } = req.params;

        const connection = await pool.getConnection();
        try {
            // 1. Fetch Proposal & Lead Info
            const [rows] = await connection.query(`
                SELECT p.name as proposalName, p.leadId, p.tenantId, p.totalValue, l.name as leadName, l.email as leadEmail 
                FROM proposals p
                JOIN leads l ON p.leadId = l.id
                WHERE p.id = ?
            `, [id]);

            if (rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });
            const { proposalName, leadName, leadEmail, tenantId, leadId, totalValue } = rows[0];

            if (!leadEmail) return res.status(400).json({ error: 'Lead has no email address' });

            // 2. Fetch Attached Files
            const [files] = await connection.query(`
                SELECT d.fileName, d.fileUrl 
                FROM proposal_files pf 
                JOIN documents d ON pf.documentId = d.id 
                WHERE pf.proposalId = ?
            `, [id]);

            // 3. Prepare Attachments
            const attachments = files.map(f => ({
                filename: f.fileName,
                path: path.join(__dirname, '../../', f.fileUrl) // Resolve absolute path from project root
            }));

            // 4. Send Email
            await sendProposalEmail(leadEmail, leadName, proposalName, attachments);

            // 5. Update Status
            await connection.query('UPDATE proposals SET status = ? WHERE id = ?', ['Sent', id]);

            // 6. Log Interaction
            const interactionId = uuidv4();
            await connection.query(`
                INSERT INTO interactions (id, tenantId, leadId, type, notes, date)
                VALUES (?, ?, ?, 'EMAIL', ?, NOW())
            `, [interactionId, tenantId, leadId, `PROPOSAL SENT via Email. Value: $${totalValue}`]);

            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to send email: ' + err.message });
        } finally {
            connection.release();
        }
    });

    return router;
};
