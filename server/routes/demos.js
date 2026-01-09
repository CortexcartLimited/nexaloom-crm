const { v4: uuidv4 } = require('uuid');
const { getNextAvailablePort } = require('../../lib/demoManager');

module.exports = (pool) => {
    return async (req, res) => {
        const { leadId } = req.body;
        const GCP_IP = '35.208.82.250';
        const SECRET_KEY = 'CortexDemo2026!';

        if (!leadId) {
            return res.status(400).json({ error: 'leadId is required' });
        }

        try {
            // 1. Get available port
            const port = await getNextAvailablePort(pool);

            // 2. Fetch GCP Agent
            const gcpResponse = await fetch(`http://${GCP_IP}:5001/provision`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    leadId,
                    port,
                    secret: SECRET_KEY
                })
            });

            if (!gcpResponse.ok) {
                const errorText = await gcpResponse.text();
                throw new Error(`GCP Agent error: ${errorText}`);
            }

            const result = await gcpResponse.json();

            // 3. Update Lead in Database
            await pool.query(
                'UPDATE leads SET demo_port = ?, demo_status = "ACTIVE", demo_last_launched = NOW() WHERE id = ?',
                [port, leadId]
            );

            // 4. Log interaction
            await pool.query(
                'INSERT INTO interactions (id, tenantId, leadId, type, notes, date) SELECT ?, tenantId, ?, "NOTE", ?, NOW() FROM leads WHERE id = ?',
                [uuidv4(), leadId, `Demo provisioned on port ${port}`, leadId]
            );

            // 5. Return Demo URL
            res.json({
                success: true,
                demoUrl: `http://demo.cortexcart.com:${port}`
            });

        } catch (err) {
            console.error('Provisioning Error:', err);
            res.status(500).json({ error: err.message });
        }
    };
};
