/**
 * Seed script — creates a default admin user
 * Run with: node src/database/seed.js
 */
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function seed() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });

        console.log('✓ Connected to database\n');

        // Create default admin user
        const password_hash = await bcrypt.hash('admin123', 10);

        const [existing] = await connection.query(
            `SELECT id FROM users WHERE email = 'admin@syncra.com'`
        );

        if (existing.length === 0) {
            await connection.query(
                `INSERT INTO users (role_id, full_name, email, password_hash)
                 VALUES ((SELECT id FROM roles WHERE name = 'admin'), 'Admin', 'admin@syncra.com', ?)`,
                [password_hash]
            );
            console.log('✅ Default admin user created:');
            console.log('   Email:    admin@syncra.com');
            console.log('   Password: admin123\n');
        } else {
            console.log('ℹ️  Admin user already exists, skipping.\n');
        }

    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

seed();
