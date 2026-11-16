import { assertConfig } from '../server/config.js';
import { pool } from '../server/db.js';
import { migrate } from '../server/migrate.js';

assertConfig();
await migrate();
console.log('Database is up to date.');
await pool.end();
