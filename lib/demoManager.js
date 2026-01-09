const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

async function getNextAvailablePort(pool) {
    const MIN_PORT = 8080;
    const MAX_PORT = 8100;

    try {
        // Query to find all ports currently assigned to leads with status that isn't INACTIVE (or LOST/etc.)
        // User request says "currently assigned to 'active' statuses". 
        // We'll assume any lead with a demo_port and an "ACTIVE" status is using it.
        const [rows] = await pool.query(
            'SELECT demo_port FROM leads WHERE demo_port IS NOT NULL AND demo_status = "ACTIVE"'
        );

        const assignedPorts = rows.map(r => r.demo_port);

        for (let port = MIN_PORT; port <= MAX_PORT; port++) {
            if (!assignedPorts.includes(port)) {
                return port;
            }
        }

        throw new Error('No available ports in range 8080-8100');
    } catch (err) {
        console.error('Error in getNextAvailablePort:', err);
        throw err;
    }
}

module.exports = { getNextAvailablePort };
