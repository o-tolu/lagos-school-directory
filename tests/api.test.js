// Non-destructive API smoke test (creates and removes its own records).
//   1. start the API:        npm run dev:api     (against a database you do not mind testing on)
//   2. run:                  npm test
import test from 'node:test';
import assert from 'node:assert/strict';

const API = (process.env.TEST_API_URL || 'http://127.0.0.1:3001') + '/api';
const call = async (method, path, body) => {
    const res = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : null };
};

test('API end to end', async () => {
    assert.equal((await call('GET', '/health')).body.ok, true);

    const schools = (await call('GET', '/entities/School?limit=20000')).body;
    assert.ok(schools.length >= 5102, `expected at least 5102 schools, got ${schools.length}`);
    assert.equal(schools[0].school_id, '1717', 'schools come back in School ID order');

    // validation
    assert.equal((await call('POST', '/entities/Salesperson', {})).status, 400);
    assert.equal((await call('GET', '/entities/Nope')).status, 404);
    assert.equal((await call('POST', '/entities/Assignment', { school_record_id: 'x', salesperson_id: 'y' })).status, 400);

    // manual school + salesperson + assignment
    const sp = (await call('POST', '/entities/Salesperson', { name: 'Test Person' })).body;
    const manual = (await call('POST', '/entities/School', { school_name: 'Test School', school_id: `MANUAL-${Date.now()}`, is_manual: true, phone_number: '0800', total_population: '120' })).body;
    assert.equal(manual.total_population, 120);
    assert.deepEqual(manual.phone_overrides, []);

    const [a] = (await call('POST', '/entities/Assignment/bulk', [{ school_record_id: manual.id, salesperson_id: sp.id }])).body;
    assert.equal(a.interest_level, 'not_contacted');
    // already assigned schools are skipped, not duplicated
    assert.equal((await call('POST', '/entities/Assignment/bulk', [{ school_record_id: manual.id, salesperson_id: sp.id }])).body.length, 0);

    const upd = (await call('PATCH', `/entities/Assignment/${a.id}`, { interest_level: 'committed' })).body;
    assert.equal(upd.interest_level, 'committed');
    assert.equal((await call('PATCH', `/entities/Assignment/${a.id}`, { interest_level: 'bogus' })).status, 400);

    await call('POST', '/entities/AddedContact', { school_record_id: manual.id, contact_type: 'phone', value: '0801' });

    // deleting a salesperson removes their assignments
    assert.equal((await call('DELETE', `/entities/Salesperson/${sp.id}`)).status, 200);
    const left = (await call('GET', `/entities/Assignment?filter=${encodeURIComponent(JSON.stringify({ salesperson_id: sp.id }))}`)).body;
    assert.equal(left.length, 0);

    // deleting a school removes its added contacts
    assert.equal((await call('DELETE', `/entities/School/${manual.id}`)).status, 200);
    const contacts = (await call('GET', `/entities/AddedContact?filter=${encodeURIComponent(JSON.stringify({ school_record_id: manual.id }))}`)).body;
    assert.equal(contacts.length, 0);

    // bulk delete needs an explicit filter; schools cannot be bulk deleted
    assert.equal((await call('DELETE', '/entities/Assignment')).status, 400);
    assert.equal((await call('DELETE', '/entities/School?filter=%7B%7D')).status, 405);
});
