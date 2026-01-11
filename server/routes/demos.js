const { v4: uuidv4 } = require('uuid');
const { getNextAvailablePort } = require('../../lib/demoManager');

module.exports = (pool) => {
    const provision = async (req, res) => {
        const { leadId } = req.body;
        const GCP_IP = '35.208.82.250';

        if (!leadId) {
            return res.status(400).json({ error: 'leadId is required' });
        }

        try {
            // 1. Get available port
            const port = await getNextAvailablePort(pool);

            // 2. Trigger GCP Agent (Fire and Forget / Async)
            // We do NOT await the response stream here. We start it and let it run.
            // However, we should at least await the initial connection to ensure the agent is up.
            // But requirements say "NOT await the full response". 
            // We use a promise chain to update status to ACTIVE when done, without blocking the response.
            fetch(`http://${GCP_IP}:5001/deploy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repo_url: "https://github.com/CortexcartLimited/cortex-insight-demo.git",
                    project_name: `demo-${leadId}`,
                    port: port
                })
            })
                .then(async (response) => {
                    if (!response.ok) {
                        const txt = await response.text();
                        throw new Error(txt);
                    }
                    // If the agent streams the response, response.ok is true immediately.
                    // We need to consume the stream to know when it's done.
                    // If we don't consume it, the connection might close early depending on agent.
                    // Assuming we want to wait for the build to finish to mark as ACTIVE.
                    const reader = response.body.getReader();
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        // We could parse logs here if we wanted to stream them elsewhere
                    }

                    // Build Finished Successfully
                    await pool.query(
                        'UPDATE leads SET demo_status = "ACTIVE" WHERE id = ?',
                        [leadId]
                    );
                    console.log(`Background provisioning for lead ${leadId} completed. Status: ACTIVE`);
                })
                .catch(async (err) => {
                    console.error(`Background provisioning for lead ${leadId} failed:`, err);
                    await pool.query(
                        'UPDATE leads SET demo_status = "ERROR", demo_port = NULL WHERE id = ?',
                        [leadId]
                    );
                });

            // 3. Update Lead in Database IMMEDIATELY to PROVISIONING
            await pool.query(
                'UPDATE leads SET demo_port = ?, demo_status = "PROVISIONING", demo_last_launched = NOW() WHERE id = ?',
                [port, leadId]
            );

            // 4. Log interaction
            await pool.query(
                'INSERT INTO interactions (id, tenantId, leadId, type, notes, date) SELECT ?, tenantId, ?, "NOTE", ?, NOW() FROM leads WHERE id = ?',
                [uuidv4(), leadId, `Demo provisioning started on port ${port}`, leadId]
            );

            // 5. Return Success to UI instantly
            res.json({
                success: true,
                message: "Provisioning started. This will take 2-3 minutes.",
                status: "PROVISIONING",
                demoUrl: `http://35.208.82.250:${port}`
            });

        } catch (err) {
            console.error('Provisioning Error:', err);
            res.status(500).json({ error: err.message });
        }
    };

    const terminate = async (req, res) => {
        const { leadId, port: bodyPort } = req.body; // Accept port in body if provided, or lookup
        const GCP_IP = '35.208.82.250';

        if (!leadId && !bodyPort) {
            // If we rely purely on port (like in new frontend)
            if (bodyPort) {
                // Try to find lead by port to update DB
                // Or just terminate on agent first?
                // Let's stick to existing logic requiring leadId for DB updates
                // But new frontend primarily passes just port for Delete.
                // We should support getting leadId from port if missing.
            }
        }

        if (!leadId) {
            return res.status(400).json({ error: 'leadId is required for DB updates' });
        }

        try {
            // 1. Fetch Lead to get the port if not provided
            let port = bodyPort;
            if (!port) {
                const [leads] = await pool.query('SELECT demo_port FROM leads WHERE id = ?', [leadId]);
                if (leads.length === 0) return res.status(404).json({ error: 'Lead not found' });
                port = leads[0].demo_port;
            }

            if (!port) {
                return res.status(400).json({ error: 'No active demo found for this lead' });
            }

            // 2. Fetch GCP Agent to terminate
            const gcpResponse = await fetch(`http://${GCP_IP}:5001/terminate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    leadId,
                    port
                })
            });

            if (!gcpResponse.ok) {
                const errorText = await gcpResponse.text();
                // We shouldn't block DB cleanup on agent error if it's just "not found"
                console.warn(`GCP Agent termination warning: ${errorText}`);
            }

            // 3. Update Lead in Database
            await pool.query(
                'UPDATE leads SET demo_port = NULL, demo_status = "INACTIVE" WHERE id = ?',
                [leadId]
            );

            // 4. Log interaction
            await pool.query(
                'INSERT INTO interactions (id, tenantId, leadId, type, notes, date) SELECT ?, tenantId, ?, "NOTE", ?, NOW() FROM leads WHERE id = ?',
                [uuidv4(), leadId, `Demo terminated on port ${port}`, leadId]
            );

            res.json({ success: true, message: 'Demo terminated' });

        } catch (err) {
            console.error('Termination Error:', err);
            res.status(500).json({ error: err.message });
        }
    };

    const sync = async (req, res) => {
        const GCP_IP = '35.208.82.250';
        try {
            // 1. Fetch Active Containers from VM
            // Expected format: { active_containers: ["demo-leadId1", "demo-leadId2", ...] }
            const vmResponse = await fetch(`http://${GCP_IP}:5001/sync-status`);
            if (!vmResponse.ok) {
                throw new Error('Failed to fetch status from VM Agent');
            }
            const { active_containers } = await vmResponse.json();
            const validContainers = new Set(active_containers || []);

            // 2. Fetch all DB leads marked ACTIVE
            const [leads] = await pool.query('SELECT id FROM leads WHERE demo_status = "ACTIVE"');

            let syncedCount = 0;
            const updates = [];

            // 3. Compare and Cleanup
            for (const lead of leads) {
                const containerName = `demo-${lead.id}`;
                if (!validContainers.has(containerName)) {
                    // Container missing on VM -> Mark INACTIVE in DB
                    const updatePromise = pool.query(
                        'UPDATE leads SET demo_status = "INACTIVE", demo_port = NULL WHERE id = ?',
                        [lead.id]
                    ).then(() => {
                        // Log it
                        pool.query(
                            'INSERT INTO interactions (id, tenantId, leadId, type, notes, date) SELECT ?, tenantId, ?, "NOTE", "Demo sync: Container not found, marked INACTIVE", NOW() FROM leads WHERE id = ?',
                            [uuidv4(), lead.id, lead.id]
                        );
                    });
                    updates.push(updatePromise);
                    syncedCount++;
                }
            }

            await Promise.all(updates);

            res.json({
                success: true,
                message: `Sync complete. ${syncedCount} leads updated to INACTIVE.`,
                syncedCount
            });

        } catch (err) {
            console.error('Sync Error:', err);
            res.status(500).json({ error: err.message });
        }
    };

    return { provision, terminate, sync };
};
