const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.production') });

async function migrate() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        console.log('Fixing documents table schema...');

        // Alter table to modify leadId column to allow NULL
        // Note: We need to know the foreign key name to drop it if we were changing types, 
        // but changing to nullable usually doesn't require dropping FK in MySQL unless strict.
        // However, safest is to just MODIFY COLUMN.

        await pool.query(`ALTER TABLE documents MODIFY COLUMN leadId VARCHAR(255) NULL;`);

        console.log('SUCCESS: documents.leadId is now nullable.');

    } catch (err) {
        console.error('Migration Failed:', err);
    } finally {
        await pool.end();
    }
}

migrate();
