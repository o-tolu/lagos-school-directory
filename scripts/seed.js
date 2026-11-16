// Imports the school directory from the Excel file into PostgreSQL.
//   npm run seed                       -> uses data/lagos_schools.xlsx
//   npm run seed -- path/to/file.xlsx  -> uses another file
// Safe to run repeatedly: schools are upserted by School ID, so assignments are never orphaned and
// phone/email edits you made in the app (phone_overrides / email_override) are never overwritten.
import path from 'node:path';
import ExcelJS from 'exceljs';
import { config, assertConfig } from '../server/config.js';
import { pool } from '../server/db.js';
import { migrate } from '../server/migrate.js';

assertConfig();
const file = path.resolve(process.argv[2] || 'data/lagos_schools.xlsx');

const cellText = (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === 'object') v = v.text ?? v.result ?? (v.hyperlink || '');
    const s = String(v).trim();
    return s === '' ? null : s;
};
const intOrNull = (v) => {
    const s = cellText(v);
    if (s === null) return null;
    const n = Number(s);
    return Number.isFinite(n) && n !== 0 ? Math.round(n) : null; // 0 means unknown
};
const normalizeLga = (v) => {
    const s = cellText(v);
    return s ? s.replace(/\s*LGA\s*$/i, '').trim().replace(/\s*-\s*/g, '-') : null;
};
const cleanPhones = (v) => {
    const s = cellText(v);
    if (!s) return null;
    const unique = [...new Set(s.split(',').map((p) => p.trim()).filter(Boolean))];
    return unique.length ? unique.join(', ') : null;
};
const idList = (v) => {
    const s = cellText(v);
    if (!s) return null;
    const ids = s.split(',').map((x) => x.trim().replace(/\.0$/, '')).filter(Boolean);
    return ids.length ? ids.join(',') : null;
};
const idText = (v) => { const s = cellText(v); return s ? s.replace(/\.0$/, '') : null; };

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const ws = wb.worksheets[0];
const header = {};
ws.getRow(1).eachCell((cell, col) => { header[String(cell.value).trim().toLowerCase()] = col; });
const col = (name) => {
    if (!header[name]) throw new Error(`Column "${name}" not found in ${file}`);
    return header[name];
};
const C = {
    id: col('school id'), name: col('school name'), lga: col('location / lga'), type: col('school type'),
    own: col('ownership'), addr: col('address'), phone: col('phone number'), email: col('email'),
    web: col('website'), head: col('head teacher'), boys: col('boys population'), girls: col('girls population'),
    total: col('total population'), url: col('profile url'), gid: col('group id'), gtype: col('group type'),
    action: col('recommended action'), linked: col('linked school ids'),
};

const rows = [];
ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const g = (c) => row.getCell(c).value;
    const school_id = idText(g(C.id));
    const school_name = cellText(g(C.name));
    if (!school_id || !school_name) return;
    rows.push([
        school_id, school_name, normalizeLga(g(C.lga)), cellText(g(C.type)), cellText(g(C.own)), cellText(g(C.addr)),
        cleanPhones(g(C.phone)), cellText(g(C.email)), cellText(g(C.web)), cellText(g(C.head)),
        intOrNull(g(C.boys)), intOrNull(g(C.girls)), intOrNull(g(C.total)), cellText(g(C.url)),
        idText(g(C.gid)), cellText(g(C.gtype)), cellText(g(C.action)), idList(g(C.linked)),
    ]);
});

await migrate();
const COLS = ['school_id', 'school_name', 'lga', 'school_type', 'ownership', 'address', 'phone_number', 'email', 'website',
    'head_teacher', 'boys_population', 'girls_population', 'total_population', 'profile_url', 'group_id', 'group_type',
    'recommended_action', 'linked_school_ids'];
const update = COLS.slice(1).map((c) => `${c} = EXCLUDED.${c}`).join(', ');

const client = await pool.connect();
try {
    await client.query('BEGIN');
    for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const params = [];
        const tuples = chunk.map((r) => '(' + r.map((v) => { params.push(v); return `$${params.length}`; }).join(',') + ')');
        await client.query(
            `INSERT INTO schools (${COLS.join(',')}) VALUES ${tuples.join(',')}
             ON CONFLICT (school_id) DO UPDATE SET ${update}, updated_date = now()`, params);
        process.stdout.write(`\rImported ${Math.min(i + 500, rows.length)} / ${rows.length}`);
    }
    await client.query('COMMIT');
} catch (err) {
    await client.query('ROLLBACK');
    throw err;
} finally {
    client.release();
}
const { rows: [{ count }] } = await pool.query('SELECT count(*)::int AS count FROM schools WHERE NOT is_manual');
console.log(`\nDone. ${count} imported schools in the database (${config.databaseUrl.replace(/:\/\/.*@/, '://***@')}).`);
await pool.end();
