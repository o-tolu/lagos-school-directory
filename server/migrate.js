import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/** Applies every server/migrations/*.sql file that has not run yet, in filename order. */
export async function migrate() {
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    const done = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
        if (done.has(file)) continue;
        const sql = fs.readFileSync(path.join(dir, file), 'utf8');
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [file]);
            await client.query('COMMIT');
            console.log(`Migration applied: ${file}`);
        } catch (err) {
            await client.query('ROLLBACK').catch(() => {});
            throw new Error(`Migration ${file} failed: ${err.message}`);
        } finally {
            client.release();
        }
    }
}
