// Frontend client for the local Express API. It keeps the same shape the app used before
// (api.entities.School.list / create / update / delete / bulkCreate / deleteMany / subscribe),
// so the rest of the code does not care how data is stored.

class ApiError extends Error {
    constructor(message, status) { super(message); this.name = 'ApiError'; this.status = status; }
}

async function request(method, path, body) {
    const res = await fetch(`/api${path}`, {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        let message = res.statusText;
        try { message = (await res.json()).message || message; } catch { /* non-JSON error */ }
        throw new ApiError(message, res.status);
    }
    return res.status === 204 ? null : res.json();
}

// ---- Live updates (Server-Sent Events), shared by every entity ----
const listeners = new Map();      // entity name -> Set(callback)
const connectionListeners = new Set();
let source = null;
let connected = false;
let hadConnection = false;

function setConnected(value) {
    if (connected === value) return;
    connected = value;
    connectionListeners.forEach((cb) => cb(value));
}

function openStream() {
    if (source || typeof EventSource === 'undefined') return;
    source = new EventSource('/api/events');
    source.onopen = () => {
        // After a reconnect we may have missed changes, so ask every subscriber to reload.
        if (hadConnection) listeners.forEach((set) => set.forEach((cb) => cb({ type: 'reload' })));
        hadConnection = true;
        setConnected(true);
    };
    source.onerror = () => setConnected(false); // EventSource retries by itself
    source.onmessage = (e) => {
        let event;
        try { event = JSON.parse(e.data); } catch { return; }
        listeners.get(event.entity)?.forEach((cb) => cb(event));
    };
}

function createEntity(name) {
    const base = `/entities/${name}`;
    return {
        list: (sort = null, limit = 1000, skip = 0) => {
            const q = new URLSearchParams({ limit: String(limit), skip: String(skip) });
            if (sort) q.set('sort', sort);
            return request('GET', `${base}?${q}`);
        },
        get: (id) => request('GET', `${base}/${id}`),
        create: (data) => request('POST', base, data),
        bulkCreate: (records) => request('POST', `${base}/bulk`, records),
        update: (id, data) => request('PATCH', `${base}/${id}`, data),
        delete: (id) => request('DELETE', `${base}/${id}`),
        // deleteMany({}) removes everything; deleteMany({ salesperson_id }) removes matching rows.
        deleteMany: (filter = {}) => request('DELETE', `${base}?filter=${encodeURIComponent(JSON.stringify(filter))}`),
        // callback receives { type: 'create'|'update'|'delete'|'reload', data }. Returns an unsubscribe function.
        subscribe: (callback) => {
            if (!listeners.has(name)) listeners.set(name, new Set());
            listeners.get(name).add(callback);
            openStream();
            return () => listeners.get(name)?.delete(callback);
        },
    };
}

export const api = {
    entities: {
        School: createEntity('School'),
        Salesperson: createEntity('Salesperson'),
        Assignment: createEntity('Assignment'),
        AddedContact: createEntity('AddedContact'),
    },
    auth: {
        me: () => request('GET', '/auth/me'),
    },
    // Tells the UI whether the live connection to the server is up.
    onConnectionChange: (cb) => {
        connectionListeners.add(cb);
        openStream();
        return () => connectionListeners.delete(cb);
    },
};

export default api;
