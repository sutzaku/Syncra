/**
 * Database Migration Script
 * Run with: npm run db:migrate
 */

const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            multipleStatements: true
        });

        console.log('✓ Connected to MySQL server');

        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        console.log('✓ Schema file loaded');
        console.log('⏳ Running migration...\n');

        await connection.query(schema);

        console.log('✅ Migration completed successfully!');
        console.log(`   Database: ${process.env.DB_NAME}`);
        console.log('   All tables and seed data have been created.\n');
    } catch (error) {
        console.error('❌ Migration failed:\n');
        console.error(`   Error: ${error.message}`);
        if (error.errno) console.error(`   Code:  ${error.errno}`);
        console.error('');
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
