const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.production') });

async function updateSchema() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        console.log("Checking tenants table for branding columns...");

        // Check columns
        const [columns] = await pool.query("SHOW COLUMNS FROM tenants");
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('logoUrl')) {
            console.log("Adding logoUrl column...");
            await pool.query("ALTER TABLE tenants ADD COLUMN logoUrl TEXT");
        }
        if (!columnNames.includes('emailSignature')) {
            console.log("Adding emailSignature column...");
            await pool.query("ALTER TABLE tenants ADD COLUMN emailSignature TEXT");
        }
        if (!columnNames.includes('companyName')) {
            console.log("Adding companyName column...");
            // Default to existing name if possible, or just add column
            await pool.query("ALTER TABLE tenants ADD COLUMN companyName VARCHAR(255)");
            await pool.query("UPDATE tenants SET companyName = name");
        }
        if (!columnNames.includes('companyAddress')) {
            console.log("Adding companyAddress column...");
            await pool.query("ALTER TABLE tenants ADD COLUMN companyAddress TEXT");
        }

        console.log("Schema update completed successfully.");

    } catch (err) {
        console.error("Schema Update Error:", err);
    } finally {
        await pool.end();
    }
}

updateSchema();
