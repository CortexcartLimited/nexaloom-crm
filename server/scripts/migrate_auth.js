const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const path = require('path');
// Script is in server/scripts, so go up two levels to get to root
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.production') });

async function migrate() {
    try {
        const pool = mysql.createPool({
            host: 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        console.log("Connected to database...");

        // 1. Add Columns
        try {
            await pool.query("ALTER TABLE users ADD COLUMN passwordHash VARCHAR(255)");
            console.log("Added passwordHash column.");
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') console.error("Error adding passwordHash:", e.message);
            else console.log("passwordHash column already exists.");
        }

        try {
            await pool.query("ALTER TABLE users ADD COLUMN lastLogin DATETIME");
            console.log("Added lastLogin column.");
        } catch (e) {
            if (e.code !== 'ER_DUP_FIELDNAME') console.error("Error adding lastLogin:", e.message);
            else console.log("lastLogin column already exists.");
        }

        // 2. Migrate existing roles
        console.log("Migrating existing roles...");
        await pool.query("UPDATE users SET role = 'TEAM_LEADER' WHERE role = 'MANAGER'");
        await pool.query("UPDATE users SET role = 'SERVICE_AGENT' WHERE role = 'SUPPORT_AGENT'");

        // 3. Update Enum Definition
        console.log("Updating role ENUM definition...");
        await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('ADMIN', 'TEAM_LEADER', 'SERVICE_AGENT', 'SALES_AGENT') DEFAULT 'SALES_AGENT'");

        // 4. Create Demo Admin
        const demoEmail = 'admin@nexaloom.com';
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const tenantId = 't1';

        // Check if tenant exists, insert if not (just to be safe for local dev)
        const [tenants] = await pool.query("SELECT * FROM tenants WHERE id = ?", [tenantId]);
        if (tenants.length === 0) {
            await pool.query("INSERT INTO tenants (id, name) VALUES (?, ?)", [tenantId, "Nexaloom Demo"]);
            console.log("Created demo tenant t1");
        }

        // Upsert Admin User
        const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [demoEmail]);
        if (users.length === 0) {
            await pool.query(
                "INSERT INTO users (id, tenantId, name, email, role, passwordHash) VALUES (UUID(), ?, ?, ?, ?, ?)",
                [tenantId, "Admin User", demoEmail, 'ADMIN', hashedPassword]
            );
            console.log("Created demo admin user.");
        } else {
            // Update existing user to be admin and set password
            await pool.query(
                "UPDATE users SET role = 'ADMIN', passwordHash = ? WHERE email = ?",
                [hashedPassword, demoEmail]
            );
            console.log("Updated existing demo admin user with new password and role.");
        }

        console.log("Migration complete.");
        process.exit(0);

    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
