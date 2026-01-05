const express = require('express');
const router = express.Router();

module.exports = (pool) => {
    // GET /api/settings (Tenant details)
    router.get('/', async (req, res) => {
        const { tenantId } = req.query;
        if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

        try {
            const [rows] = await pool.query('SELECT * FROM tenants WHERE id = ?', [tenantId]);
            if (rows.length === 0) return res.status(404).json({ error: "Tenant not found" });

            const tenant = rows[0];
            // Parse JSON fields
            if (typeof tenant.smtpConfig === 'string') tenant.smtpConfig = JSON.parse(tenant.smtpConfig);

            res.json(tenant);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // PUT /api/settings (Update Tenant)
    router.put('/', async (req, res) => {
        const { tenantId, ...updates } = req.body;
        if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

        if (updates.smtpConfig && typeof updates.smtpConfig === 'object') {
            updates.smtpConfig = JSON.stringify(updates.smtpConfig);
        }

        try {
            const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
            const values = Object.values(updates);

            if (fields.length > 0) {
                await pool.query(`UPDATE tenants SET ${fields} WHERE id = ?`, [...values, tenantId]);
            }
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // POST /api/settings/init (Initialize a tenant if strictly needed, mostly for dev)
    router.post('/init', async (req, res) => {
        const { id, name } = req.body;
        try {
            await pool.query(
                `INSERT IGNORE INTO tenants (id, name, createdAt) VALUES (?, ?, NOW())`,
                [id, name]
            );
            res.json({ success: true, id });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
};
