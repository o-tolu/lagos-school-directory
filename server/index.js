import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config, assertConfig } from './config.js';
import { pool } from './db.js';
import { migrate } from './migrate.js';
import { addClient } from './events.js';
import { authenticate } from './middleware/auth.js';
import entityRoutes from './routes/entities.js';

assertConfig();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '5mb' }));
app.use('/api', authenticate);

app.get('/api/health', async (_req, res) => {
    try { await pool.query('SELECT 1'); res.json({ ok: true }); }
    catch { res.status(503).json({ ok: false }); }
});

// Who is the current user? Open access today; becomes real once auth is enabled.
app.get('/api/auth/me', (req, res) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    res.json(req.user);
});

// Live updates (Server-Sent Events).
app.get('/api/events', (req, res) => {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    res.write('retry: 3000\n\n');
    addClient(res);
});

app.use('/api/entities', entityRoutes);
app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found' }));

// Serve the built frontend (npm run build) so the whole app runs from one port.
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// Error handler
app.use((err, _req, res, _next) => {
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    if (err.code === '23505') return res.status(409).json({ message: 'Duplicate record' });
    if (err.code === '22P02' || err.code === '23503' || err.code === '23514') return res.status(400).json({ message: 'Invalid data supplied' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON' });
    console.error(err);
    res.status(500).json({ message: 'Server error' });
});

try {
    if (config.autoMigrate) await migrate();
    await pool.query('SELECT 1');
} catch (err) {
    console.error(`\nCould not connect to PostgreSQL: ${err.message}\nCheck DATABASE_URL in your .env file.\n`);
    process.exit(1);
}

app.listen(config.port, config.host, () => {
    console.log(`Lagos Schools CRM API listening on http://${config.host}:${config.port}`);
});
