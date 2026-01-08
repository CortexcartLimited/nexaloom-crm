const mysql = require('mysql2/promise');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

const config = {
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

async function migrate() {
    const connection = await mysql.createConnection(config);
    try {
        console.log('Connected to database.');

        // 1. Create Events Table
        console.log('Creating events table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS events (
                id VARCHAR(50) PRIMARY KEY,
                tenantId VARCHAR(50) NOT NULL,
                leadId VARCHAR(50),
                title VARCHAR(255),
                description TEXT,
                start_date DATETIME,
                status VARCHAR(50),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Events table created.');

        // 2. Fetch interactions to migrate
        console.log('Fetching meetings and calls from interactions...');
        const [rows] = await connection.query(`
            SELECT * FROM interactions 
            WHERE event_type IN ('MEETING', 'CALL') 
               OR event_type IN ('meeting', 'call') 
               OR type IN ('MEETING', 'CALL')
        `);

        console.log(`Found ${rows.length} records to migrate.`);

        // 3. Insert into events
        for (const row of rows) {
            // Map fields
            const newId = uuidv4();
            const dateVal = row.date ? new Date(row.date) : new Date();
            const titleVal = row.event_type || row.type || 'Untitled Event';
            const descVal = row.notes || '';
            const statusVal = row.status || 'SCHEDULED';

            await connection.query(`
                INSERT INTO events (id, tenantId, leadId, title, description, start_date, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [newId, row.tenantId, row.leadId, titleVal, descVal, dateVal, statusVal, row.created_at || new Date()]);
        }

        console.log('Migration complete.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await connection.end();
    }
}

migrate();
