const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { authenticateToken } = require('./middleware/authMiddleware');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') })
console.log('DB Config Check:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    db: process.env.DB_NAME
});

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// --- AUTH ROUTES ---
app.use('/crm/nexaloom-crm/api/auth', require('./routes/auth')(pool));

// Apply Auth Middleware to all API routes below
// NOTE: We exclude /api/auth (defined above) and maybe public endpoints if any.
// For now, protecting everything else.
app.use('/crm/nexaloom-crm/api', authenticateToken);

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
    const { tenantId, name, company, email, phone, value, status, currency, country } = req.body;
    const id = uuidv4();
    const allowedFields = ['name', 'company', 'email', 'phone', 'value', 'status', 'currency', 'country', 'taxId'];
    const updates = [];
    const values = [];

    try {
        const query = 'INSERT INTO leads (id, tenantId, name, company, email, phone, value, status, currency, country, tax_id, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())';
        await pool.query(query, [id, tenantId, name, company, email, phone, value || 0, status || 'NEW', currency || 'GBP', country, req.body.taxId]);

        // Log interaction
        await pool.query('INSERT INTO interactions (id, tenantId, leadId, type, notes, date) VALUES (?, ?, ?, "Status Change", "Lead Created", NOW())',
            [uuidv4(), tenantId, id]);

        res.status(201).json({ id, tenantId, name, company, email, phone, value, status, currency, country, taxId: req.body.taxId });
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
// ROUTE: Send Email Outreach to Lead
// ROUTE: Send Email Outreach to Lead
app.post('/crm/nexaloom-crm/api/leads/:id/email', async (req, res) => {
    const { id } = req.params;
    const { subject, body } = req.body;
    console.log(`Starting Outreach Send for Lead ID: ${id}`);
    if (req.body.email) console.log(`(Frontend sent email in body: ${req.body.email})`);

    // Validate Inputs
    if (!subject || !body) return res.status(400).json({ error: 'Subject and Body are required' });

    try {
        // 1. Fetch Lead Details
        const [leads] = await pool.query('SELECT * FROM leads WHERE id = ?', [id]);
        if (leads.length === 0) return res.status(404).json({ error: 'Lead not found' });
        const lead = leads[0];

        if (!lead.email) {
            return res.status(400).json({ error: 'Lead does not have an email address' });
        }

        // 2. Fetch Tenant Branding
        const [tenants] = await pool.query('SELECT logoUrl, name, companyName, companyAddress, emailSignature, smtpConfig FROM tenants WHERE id = ?', [lead.tenantId]);
        const branding = tenants[0] || { companyName: 'Nexaloom' };

        // 3. Send Email (Imported dynamically to ensure freshness, though top-level is better for perf)
        // We require it here to ensure we get the latest version if files changed without restart (in dev), 
        // but for correctness we await it explicitly. 
        // CORRECT PATH: Go up one level from 'server' to root, then into 'services'
        const { sendBasicEmail } = require('../services/emailService');

        console.log(`Attempting to send outreach email to ${lead.email} for lead ${lead.id}...`);

        await sendBasicEmail(lead.email, lead.name, subject, body, [], {
            companyName: branding.companyName || branding.name,
            companyAddress: branding.companyAddress,
            logoUrl: branding.logoUrl,
            emailSignature: branding.emailSignature
        });

        console.log(`Email sent successfully to ${lead.email}. Logging interaction...`);

        // 4. Update Interactions Log (ONLY executed if email sends successfully)
        const interactionId = uuidv4();
        await pool.query(
            `INSERT INTO interactions (id, tenantId, leadId, type, notes, date, metadata) VALUES (?, ?, ?, 'EMAIL', ?, NOW(), ?)`,
            [interactionId, lead.tenantId, id, `Outreach: ${subject}`, JSON.stringify({ sentTo: lead.email, subject })]
        );

        res.json({ success: true, message: 'Email sent and logged successfully' });

    } catch (err) {
        console.error('Email Outreach Error:', err);
        // Explicitly return the error so the frontend knows it failed
        res.status(500).json({ error: `Failed to send email: ${err.message}` });
    }
});

// ROUTE: Update Lead (Edit Profile)
app.patch('/crm/nexaloom-crm/api/leads/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        // Dynamically build the update query based on provided fields
        // Allow currency updates if provided
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);

        await pool.query(
            `UPDATE leads SET ${fields} WHERE id = ?`,
            [...values, id]
        );

        // Insert into leads_history with explicit columns and safe values
        const historyId = uuidv4();
        const actionType = 'UPDATE';
        const details = JSON.stringify(updates) || '{}';

        await pool.query(
            'INSERT INTO leads_history (lead_id, action_type, details, event_id) VALUES (?, ?, ?, ?)',
            [id, actionType, details, historyId]
        );

        res.json({ success: true });
    } catch (err) {
    }
});

// ROUTE: Get Email History for a Lead
app.get('/crm/nexaloom-crm/api/leads/:id/email-history', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            'SELECT * FROM email_history WHERE leadId = ? ORDER BY sentAt DESC',
            [id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Error fetching email history:', err);
        res.status(500).json({ error: err.message });
    }
});

// ROUTE: Create Interaction (Save Notes/Emails)
app.post('/crm/nexaloom-crm/api/interactions', async (req, res) => {
    const { id, tenantId, leadId, userId, type, notes, date, metadata, productId } = req.body;

    // Convert ISO string to MySQL format per user request
    const mysqlDate = new Date(req.body.date || new Date()).toISOString().slice(0, 19).replace('T', ' ');

    // DEBUG: Log params to catch undefined values
    // Verify params match PLACEHOLDERS exactly
    // VALIDATION: Strict Lead ID Check
    if (typeof leadId !== 'string' || leadId.length < 10) {
        return res.status(400).send('Invalid Lead ID: Must be a string UUID.');
    }

    const query = `INSERT INTO events (id, tenantId, leadId, title, description, start_date, status) 
               VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const params = [
        String(id || uuidv4()),             // id
        String(tenantId),                   // tenantId
        String(leadId),                     // leadId
        String(type || 'Meeting'),          // title (mapping 'type' to 'title')
        String(notes || ''),                // description (mapping 'notes' to 'description')
        mysqlDate,                          // start_date
        req.body.status || 'SCHEDULED'      // status
    ];

    console.log("POST /api/events Params (Targeting Events Table):", params);

    try {
        await pool.query(query, params);
        res.status(201).json({ success: true });
    } catch (err) {
        console.error("SQL ERROR in POST /events", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ROUTE: Update Interaction (e.g. Status Change / Cancel / Reschedule)
app.patch('/crm/nexaloom-crm/api/interactions/:id', async (req, res) => {
    const { id } = req.params;
    const { date, notes, status, type, metadata } = req.body;

    // VALIDATION: Ensure ID is present
    if (!id) return res.status(400).json({ error: "Interaction ID is required" });

    try {
        // 1. Fetch current state
        const [current] = await pool.query('SELECT * FROM interactions WHERE id = ?', [id]);
        if (current.length === 0) return res.status(404).json({ error: 'Interaction not found' });
        const interaction = current[0];

        // 2. Prepare Safe Values

        // Date Check
        let newDate = interaction.date;
        if (date !== undefined && date !== null) {
            newDate = new Date(date).toISOString().slice(0, 19).replace('T', ' ');
        }

        const newNotes = notes !== undefined ? notes : interaction.notes;
        const newStatus = status !== undefined ? status : interaction.status;
        const newType = type !== undefined ? type : interaction.type;
        const newMetadata = metadata !== undefined ? JSON.stringify(metadata) : interaction.metadata;

        const updateParams = [newDate, newNotes, newStatus, newType, newMetadata, id];
        console.log("PATCH /api/interactions/:id Update Params:", updateParams);

        // 3. Execute Explicit UPDATE
        await pool.query(
            `UPDATE interactions 
             SET date = ?, notes = ?, status = ?, type = ?, metadata = ?
             WHERE id = ?`,
            updateParams
        );

        // 4. History Logging (Safe Insert)
        if (date || status) {
            const historyId = uuidv4();
            const actionType = 'INTERACTION_UPDATE';

            // Construct details object safely
            const detailsObj = {
                date: date || 'unchanged',
                status: status || 'unchanged',
                notes: notes || 'unchanged'
            };
            const details = JSON.stringify(detailsObj);

            // Guarantee lead_id is not undefined.
            // Guarantee lead_id is not undefined.
            if (interaction.leadId) {
                // Use newStatus (safe value) or default
                const statusForHistory = newStatus || 'SCHEDULED';
                // CRITICAL: Explicit String() casting for UUIDs to prevent "Data truncated" or "Invalid Buffer" errors
                const historyParams = [String(interaction.leadId), actionType, details, String(historyId), statusForHistory];
                console.log("History Log Params:", historyParams);

                try {
                    await pool.query(
                        'INSERT INTO leads_history (lead_id, action_type, details, event_id, status) VALUES (?, ?, ?, ?, ?)',
                        historyParams
                    );
                } catch (historyErr) {
                    console.error("HISTORY LOG ERROR (Non-Critical):", historyErr.message);
                    // Do NOT crash the response, just log it.
                }
            }
        }

        res.json({ success: true, message: 'Interaction updated successfully' });
    } catch (err) {
        console.error("UPDATE INTERACTION ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});
// --- DISCOUNTS ROUTES ---
app.get('/crm/nexaloom-crm/api/discounts', async (req, res) => {
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

app.post('/crm/nexaloom-crm/api/discounts', async (req, res) => {
    const { id, tenantId, name, code, type, value, applicableProductIds, expiresAt, contractTerm, isManagerOnly } = req.body;

    try {
        // Stringify the array for MySQL TEXT column
        const productsJson = JSON.stringify(applicableProductIds || ['ALL']);

        // Format date for MySQL or use NULL
        const mysqlExpiresAt = expiresAt ? new Date(expiresAt).toISOString().slice(0, 19).replace('T', ' ') : null;

        const query = `
            INSERT INTO discounts 
            (id, tenantId, name, code, type, value, applicableProductIds, expiresAt, contractTerm, isManagerOnly, currency) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            isManagerOnly ? 1 : 0,
            req.body.currency || 'GBP'
        ]);

        res.status(201).json({ success: true });
    } catch (err) {
        console.error("DISCOUNT INSERT ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/crm/nexaloom-crm/api/discounts/:id', async (req, res) => {
    const { id } = req.params;
    const tenantId = req.headers['x-tenant-id'];

    try {
        // Use [result] destructuring and await, just like your other working routes
        const [result] = await pool.query(
            'DELETE FROM discounts WHERE id = ? AND tenantId = ?',
            [id, tenantId]
        );
        res.json({ message: "Deleted successfully", affectedRows: result.affectedRows });
    } catch (err) {
        console.error("DELETE ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- INTERACTIONS ROUTES ---
app.get('/crm/nexaloom-crm/api/interactions', async (req, res) => {
    const { leadId, tenantId } = req.query;

    if (!tenantId) {
        return res.status(400).json({ error: 'tenantId is required' });
    }

    // TARGET: the NEW events table
    let query = 'SELECT id, title, start_date AS start, description, status FROM events WHERE tenantId = ?';
    const params = [tenantId];

    if (leadId && leadId !== 'undefined' && leadId !== 'null') {
        query += ' AND leadId = ?';
        params.push(String(leadId));
    }

    query += ' ORDER BY start_date DESC';

    try {
        const [rows] = await pool.query(query, params);

        // Ensure the date is in a format the Calendar loves
        const formattedRows = rows.map(row => ({
            ...row,
            start: row.start ? new Date(row.start).toISOString() : null
        }));

        res.json(formattedRows);
    } catch (err) {
        console.error("GET /interactions Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ROUTE: Create New Event (Calendar)
app.post('/crm/nexaloom-crm/api/events', async (req, res) => {
    const { tenantId, leadId, title, description, start_date } = req.body;

    if (!tenantId || !title || !start_date) {
        return res.status(400).json({ error: 'Missing required fields (tenantId, title, start_date)' });
    }

    const id = uuidv4();
    try {
        await pool.query(
            'INSERT INTO events (id, tenantId, leadId, title, description, start_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id, tenantId, leadId, title, description || '', start_date, 'SCHEDULED']
        );
        res.status(201).json({ success: true, id, message: 'Event created' });
    } catch (err) {
        console.error('Error creating event:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- TASKS ROUTES ---
app.use('/crm/nexaloom-crm/api/tasks', require('./routes/tasks')(pool));

// --- DOCUMENTS ROUTES ---
app.use('/crm/nexaloom-crm/api/documents', require('./routes/documents')(pool));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- PROPOSALS ROUTES ---
app.use('/crm/nexaloom-crm/api/proposals', require('./routes/proposals')(pool));

// --- KNOWLEDGE BASE ROUTES ---
app.use('/crm/nexaloom-crm/api/knowledge-base', require('./routes/knowledge-base')(pool));

// --- TICKETS ROUTES ---
app.use('/crm/nexaloom-crm/api/tickets', require('./routes/tickets')(pool));

// --- USERS ROUTES ---
app.use('/crm/nexaloom-crm/api/users', require('./routes/users')(pool));

// --- SETTINGS ROUTES ---
app.use('/crm/nexaloom-crm/api/settings', require('./routes/settings')(pool));

app.get('/crm/nexaloom-crm/api/leads/:id/timeline', async (req, res) => {
    const { id } = req.params;
    const { tenantId } = req.query;

    try {
        // FIX: Ensure ID is String
        const leadId = String(id);

        // 1. Fetch Interactions (Calendar Items + Notes)
        const [interactions] = await pool.query(
            'SELECT id, type, notes, date, status, "interaction" as source FROM interactions WHERE leadId = ? AND tenantId = ?',
            [leadId, tenantId]
        );

        // 2. Fetch Lead History (Audit Logs)
        // FIX: Use JOIN to verify tenantId via leads table (since leads_history lacks tenantId)
        // 2. Fetch Lead History (Audit Logs)
        // FIX: Exact SQL per user request (JOIN + ORDER BY + h.*)
        const [history] = await pool.query(
            `SELECT h.*, h.created_at AS date FROM leads_history h JOIN leads l ON h.lead_id = l.id WHERE h.lead_id = ? AND l.tenantId = ? ORDER BY h.created_at DESC`,
            [leadId, tenantId]
        );

        // 3. Fetch Email History
        const [emails] = await pool.query(
            'SELECT id, type, subject, sentAt as date, "email" as source FROM email_history WHERE leadId = ?',
            [leadId]
        );

        // 4. Merge and Format
        const timeline = [
            ...interactions.map(i => ({
                id: i.id,
                type: i.type, // 'MEETING', 'CALL', 'NOTE'
                date: i.date ? new Date(i.date).toISOString() : null, // FIX: ISO String
                notes: i.notes,
                status: i.status || 'COMPLETED',
                source: 'interaction'
            })),
            ...history.map(h => {
                let noteContent = '';
                try {
                    const details = JSON.parse(h.details || '{}');
                    // Format details into a readable string
                    noteContent = Object.entries(details)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(', ');
                } catch (e) {
                    noteContent = h.details;
                }
                return {
                    id: `hist-${h.id}`,
                    type: h.action_type, // 'INTERACTION_UPDATE'
                    date: h.date ? new Date(h.date).toISOString() : null, // FIX: ISO String
                    notes: noteContent,
                    status: h.status,
                    source: 'history'
                };
            }),
            ...emails.map(e => ({
                id: `email-${e.id}`,
                type: 'EMAIL',
                date: e.date ? new Date(e.date).toISOString() : null, // FIX: ISO String
                notes: `Subject: ${e.subject}`,
                status: 'SENT',
                source: 'email'
            }))
        ];

        // 5. Sort by Date Descending
        timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

        console.log('Timeline Data Found:', timeline.length);
        console.log(`Debug Counts - Interactions: ${interactions.length}, History: ${history.length}, Emails: ${emails.length}`);

        res.json(timeline);
    } catch (err) {
        console.error("TIMELINE FETCH ERROR:", err);
        // Fallback: if columns fail (e.g. leads_history created_at), return generic error
        res.status(500).json({ error: "Failed to fetch timeline", details: err.message });
    }
});

const PORT = 5000; // Hardcoded to match HestiaCP/Nginx configuration
app.listen(PORT, () => {
    console.log(`--- SERVER STARTING ON PORT ${PORT} ---`);
});