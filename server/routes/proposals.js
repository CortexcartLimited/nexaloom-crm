const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { sendProposalEmail, sendBasicEmail } = require('../../services/emailService');

// Helper to format JavaScript ISO dates to MySQL format (removes T and Z)
const formatSQLDate = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 19).replace('T', ' ');
};

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

            const validUntilDate = formatSQLDate(validUntil);
            const proposalId = id || uuidv4();

            await connection.query(
                `INSERT INTO proposals (id, tenantId, name, leadId, leadName, leadCompany, totalValue, status, validUntil, terms, createdBy, createdAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                [proposalId, tenantId, name, leadId, leadName, leadCompany, totalValue, status, validUntilDate, terms, createdBy]
            );

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
            res.status(500).json({ error: err.message });
        } finally {
            connection.release();
        }
    });

    // PUT /api/proposals/:id (Update)
    router.put('/:id', async (req, res) => {
        const { id } = req.params;
        const updates = { ...req.body };
        const items = updates.items;
        const files = updates.files;

        // Clean up the updates object so it only contains columns in the 'proposals' table
        delete updates.items;
        delete updates.files;
        delete updates.id;
        delete updates.createdAt;

        if (updates.validUntil) {
            updates.validUntil = formatSQLDate(updates.validUntil);
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const fields = Object.keys(updates).map(key => `\`${key}\` = ?`).join(', ');
            const values = Object.values(updates);

            if (fields.length > 0) {
                await connection.query(`UPDATE proposals SET ${fields} WHERE id = ?`, [...values, id]);
            }

            if (items) {
                await connection.query('DELETE FROM proposal_items WHERE proposalId = ?', [id]);
                if (items.length > 0) {
                    const itemValues = items.map(item => [
                        item.id && !item.id.toString().startsWith('item-') ? item.id : uuidv4(),
                        id,
                        item.productId || null,
                        item.name,
                        item.quantity,
                        item.price,
                        item.description
                    ]);
                    await connection.query(`INSERT INTO proposal_items (id, proposalId, productId, name, quantity, price, description) VALUES ?`, [itemValues]);
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

    // POST /api/proposals/:id/files (Update Attachments)
    router.post('/:id/files', async (req, res) => {
        const { id } = req.params;
        const { documentIds } = req.body;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query('DELETE FROM proposal_files WHERE proposalId = ?', [id]);
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

    // POST /api/proposals/:id/send (Email)
    router.post('/:id/send', async (req, res) => {
        const { id } = req.params;
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query(`
                SELECT p.name as proposalName, p.leadId, p.tenantId, p.totalValue, p.terms, l.name as leadName, l.email as leadEmail 
                FROM proposals p
                JOIN leads l ON p.leadId = l.id
                WHERE p.id = ?
            `, [id]);

            if (rows.length === 0) return res.status(404).json({ error: 'Proposal not found' });
            const { proposalName, leadName, leadEmail, tenantId, leadId, totalValue, terms } = rows[0];

            // 2. Fetch Attached Files & Tenant Branding
            const [files] = await connection.query(`
                SELECT d.fileName, d.fileUrl 
                FROM proposal_files pf 
                JOIN documents d ON pf.documentId = d.id 
                WHERE pf.proposalId = ?
            `, [id]);

            // Fetch Branding
            const [tenantRows] = await connection.query(`SELECT logoUrl, name, companyName, companyAddress, emailSignature FROM tenants WHERE id = ?`, [tenantId]);
            const branding = tenantRows[0] || { companyName: 'Nexaloom' };

            // Fetch Items for Email Table
            const [items] = await connection.query(`SELECT name, quantity, price, description FROM proposal_items WHERE proposalId = ?`, [id]);

            // 3. Prepare Attachments
            const attachments = files.map(f => ({
                filename: f.fileName,
                path: path.join(__dirname, '../../', f.fileUrl)
            }));

            // 4. Send Email
            await sendProposalEmail(leadEmail, leadName, proposalName, attachments, {
                companyName: branding.companyName || branding.name,
                companyAddress: branding.companyAddress,
                logoUrl: branding.logoUrl,
                emailSignature: branding.emailSignature
            }, {
                items,
                totalValue,
                terms
            });
            await connection.query('UPDATE proposals SET status = ? WHERE id = ?', ['Sent', id]);

            // Log to Email History
            await connection.query(`
                INSERT INTO email_history (leadId, subject, type, sentAt)
                VALUES (?, ?, 'Proposal', NOW())
            `, [leadId, `Proposal: ${proposalName}`]);

            const interactionId = uuidv4();
            await connection.query(`
                INSERT INTO interactions (id, tenantId, leadId, type, notes, date)
                VALUES (?, ?, ?, 'EMAIL', ?, NOW())
            `, [interactionId, tenantId, leadId, `PROPOSAL SENT: ${proposalName}`]);

            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        } finally {
            connection.release();
        }
    });

    // POST /api/proposals/outreach/:id (Basic Outreach Email)
    router.post('/outreach/:id', async (req, res) => {
        const { id } = req.params;
        const { subject, body } = req.body;
        const connection = await pool.getConnection();

        try {
            // 1. Fetch Lead Details & Branding
            const [leads] = await connection.query('SELECT * FROM leads WHERE id = ?', [id]);
            if (leads.length === 0) return res.status(404).json({ error: 'Lead not found' });
            const lead = leads[0];

            const [tenantRows] = await connection.query('SELECT * FROM tenants WHERE id = ?', [lead.tenantId]);
            const branding = tenantRows[0] || {};

            // 2. Send Email using sendBasicEmail
            await sendBasicEmail(lead.email, lead.name, subject, body, [], {
                companyName: branding.companyName || branding.name,
                companyAddress: branding.companyAddress,
                logoUrl: branding.logoUrl,
                emailSignature: branding.emailSignature
            });

            // 3. Log Interaction
            const interactionId = uuidv4();
            await connection.query(`
              INSERT INTO interactions (id, tenantId, leadId, type, notes, date)
              VALUES (?, ?, ?, 'EMAIL', ?, NOW())
          `, [interactionId, lead.tenantId, id, `OUTREACH SENT: ${subject}`]);

            // Log to Email History
            await connection.query(`
                INSERT INTO email_history (leadId, subject, type, sentAt)
                VALUES (?, ?, 'Outreach', NOW())
            `, [id, subject]);

            res.json({ success: true });
        } catch (err) {
            console.error('Outreach Error:', err);
            res.status(500).json({ error: err.message });
        } finally {
            connection.release();
        }
    });

    return router;
};