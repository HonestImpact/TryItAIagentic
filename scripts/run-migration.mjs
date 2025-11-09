#!/usr/bin/env node

/**
 * Run a database migration
 *
 * Usage:
 *   node scripts/run-migration.mjs <migration-file>
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const { Client } = pg;

async function main() {
  const migrationFile = process.argv[2];

  if (!migrationFile) {
    console.error('❌ Usage: node scripts/run-migration.mjs <migration-file>');
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });

  try {
    console.log(`\n🔄 Running migration: ${migrationFile}\n`);

    await client.connect();
    console.log('✅ Connected to database');

    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
    const sql = await fs.readFile(migrationPath, 'utf-8');

    console.log('📝 Executing SQL...\n');
    await client.query(sql);

    console.log('✅ Migration completed successfully\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
