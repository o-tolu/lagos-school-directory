import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { broadcast } from '../events.js';
import { requireRole } from '../middleware/auth.js';
import { ENTITIES, SYSTEM_COLUMNS, ValidationError, coerce } from '../entities.js';

const router = Router();
const RELOAD_THRESHOLD = 200; // above this many rows, tell clients to refetch instead of sending one event per row
const MAX_LIMIT = 20000;

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.param('entity', (req, res, next, name) => {
    const cfg = ENTITIES[name];
    if (!cfg) return res.status(404).json({ message: `Unknown entity "${name}"` });
    req.entityName = name;
    req.cfg = cfg;
    next();
});

// ---------- helpers ----------
function pickWritable(cfg, body, { requireAll }) {
    const out = {};
    for (const [col, type] of Object.entries(cfg.columns)) {
        const v = coerce(type, body?.[col], col);
        if (v !== undefined) out[col] = v;
    }
    if (requireAll) {
        for (const col of cfg.required) {
            if (out[col] === undefined || out[col] === null || out[col] === '') throw new ValidationError(`Field ${col} is required`);
        }
    }
    return out;
}

function parseFilter(cfg, raw) {
    if (raw === undefined) return null;
    let obj;
    try { obj = JSON.parse(raw); } catch { throw new ValidationError('filter must be valid JSON'); }
    const clauses = [];
    const params = [];
    for (const [col, val] of Object.entries(obj)) {
        if (!(col in cfg.columns) && col !== 'id') throw new ValidationError(`Cannot filter on ${col}`);
        params.push(val);
        clauses.push(`${col} = $${params.length}`);
    }
    return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

function orderBy(cfg, sort) {
    if (!sort) return cfg.defaultOrder;
    const desc = sort.startsWith('-');
    const col = desc ? sort.slice(1) : sort;
    if (!(col in cfg.columns) && !SYSTEM_COLUMNS.includes(col)) throw new ValidationError(`Cannot sort by ${col}`);
    return `${col} ${desc ? 'DESC' : 'ASC'}`;
}

function emit(entity, type, rows) {
    if (rows.length > RELOAD_THRESHOLD) return broadcast({ entity, type: 'reload' });
    for (const data of rows) broadcast({ entity, type, data: type === 'delete' ? { id: data.id } : data });
}

async function insertRows(client, cfg, rows) {
    const inserted = [];
    const cols = Object.keys(cfg.columns);
    // Insert in statements of up to 500 rows.
    for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const usedCols = cols.filter((c) => chunk.some((r) => r[c] !== undefined));
        const params = [];
        const tuples = chunk.map((r) => '(' + usedCols.map((c) => {
            if (r[c] === undefined) return 'DEFAULT';
            params.push(r[c]);
            return `$${params.length}`;
        }).join(',') + ')');
        const sql = `INSERT INTO ${cfg.table} (${usedCols.join(',')}) VALUES ${tuples.join(',')}`
            + `${cfg.conflictDoNothing ? ' ON CONFLICT DO NOTHING' : ''} RETURNING *`;
        inserted.push(...(await client.query(sql, params)).rows);
    }
    return inserted;
}

async function cascadeDelete(client, cfg, id) {
    const removed = [];
    for (const c of cfg.cascades || []) {
        const target = ENTITIES[c.entity];
        const { rows } = await client.query(`DELETE FROM ${target.table} WHERE ${c.fk} = $1 RETURNING *`, [id]);
        removed.push({ entity: c.entity, rows });
    }
    return removed;
}

// ---------- routes ----------
router.get('/:entity', wrap(async (req, res) => {
    const { cfg } = req;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 1000, 1), MAX_LIMIT);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);
    const filter = parseFilter(cfg, req.query.filter);
    const params = filter ? filter.params : [];
    const { rows } = await query(
        `SELECT * FROM ${cfg.table} ${filter ? filter.where : ''} ORDER BY ${orderBy(cfg, req.query.sort)} LIMIT ${limit} OFFSET ${skip}`,
        params,
    );
    res.json(rows);
}));

router.get('/:entity/:id', wrap(async (req, res) => {
    const { rows } = await query(`SELECT * FROM ${req.cfg.table} WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
}));

router.post('/:entity', requireRole('admin', 'user'), wrap(async (req, res) => {
    const row = pickWritable(req.cfg, req.body, { requireAll: true });
    const inserted = await withTransaction((c) => insertRows(c, req.cfg, [row]));
    if (!inserted[0]) return res.status(409).json({ message: `${req.entityName} already exists` });
    emit(req.entityName, 'create', inserted);
    res.status(201).json(inserted[0]);
}));

router.post('/:entity/bulk', requireRole('admin', 'user'), wrap(async (req, res) => {
    if (!Array.isArray(req.body)) throw new ValidationError('Body must be an array');
    const rows = req.body.map((b) => pickWritable(req.cfg, b, { requireAll: true }));
    const inserted = await withTransaction((c) => insertRows(c, req.cfg, rows));
    emit(req.entityName, 'create', inserted);
    res.status(201).json(inserted);
}));

router.patch('/:entity/:id', requireRole('admin', 'user'), wrap(async (req, res) => {
    const patch = pickWritable(req.cfg, req.body, { requireAll: false });
    const keys = Object.keys(patch);
    if (!keys.length) throw new ValidationError('No updatable fields supplied');
    const params = keys.map((k) => patch[k]);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`);
    params.push(req.params.id);
    const { rows } = await query(
        `UPDATE ${req.cfg.table} SET ${sets.join(', ')}, updated_date = now() WHERE id = $${params.length} RETURNING *`, params);
    if (!rows[0]) return res.status(404).json({ message: 'Not found' });
    emit(req.entityName, 'update', rows);
    res.json(rows[0]);
}));

// Delete many rows matching ?filter={"salesperson_id":"..."}; filter={} deletes everything (used by Reset All).
router.delete('/:entity', requireRole('admin'), wrap(async (req, res) => {
    const { cfg } = req;
    if (!cfg.allowDeleteMany) return res.status(405).json({ message: 'Bulk delete not allowed for this entity' });
    const filter = parseFilter(cfg, req.query.filter);
    if (!filter) throw new ValidationError('A filter query parameter is required (use filter={} to delete all)');
    const { rows } = await query(`DELETE FROM ${cfg.table} ${filter.where} RETURNING id`, filter.params);
    emit(req.entityName, 'delete', rows);
    res.json({ deleted: rows.length });
}));

router.delete('/:entity/:id', requireRole('admin', 'user'), wrap(async (req, res) => {
    const { cfg } = req;
    const result = await withTransaction(async (c) => {
        const cascaded = await cascadeDelete(c, cfg, req.params.id);
        const { rows } = await c.query(`DELETE FROM ${cfg.table} WHERE id = $1 RETURNING id`, [req.params.id]);
        return { rows, cascaded };
    });
    if (!result.rows[0]) return res.status(404).json({ message: 'Not found' });
    for (const c of result.cascaded) emit(c.entity, 'delete', c.rows);
    emit(req.entityName, 'delete', result.rows);
    res.json({ deleted: 1 });
}));

export default router;
