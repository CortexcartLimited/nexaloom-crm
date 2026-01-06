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
        } else {
            console.log("logoUrl column exists.");
        }

        if (!columnNames.includes('emailSignature')) {
            console.log("Adding emailSignature column...");
            await pool.query("ALTER TABLE tenants ADD COLUMN emailSignature TEXT");
        } else {
            console.log("emailSignature column exists.");
        }

        // companyName is usually 'name' in tenants table, but user asked for Company Name specifically. 
        // We already have 'name' in tenants. We can assume that matches. 
        // Or we can add specific 'companyName' if they want a separate overrides.
        // Let's assume 'name' is the company name for the tenant.

        console.log("Schema update completed successfully.");

    } catch (err) {
        console.error("Schema Update Error:", err);
    } finally {
        await pool.end();
    }
}

updateSchema();
