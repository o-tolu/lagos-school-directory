// Single place describing every entity the API exposes. Add a table here to expose a new one.
// Column types: text | int | bool | uuid | textarray

export const ENTITIES = {
    School: {
        table: 'schools',
        columns: {
            school_id: 'text', school_name: 'text', lga: 'text', school_type: 'text', ownership: 'text',
            address: 'text', phone_number: 'text', email: 'text', website: 'text', head_teacher: 'text',
            boys_population: 'int', girls_population: 'int', total_population: 'int', profile_url: 'text',
            group_id: 'text', group_type: 'text', recommended_action: 'text', linked_school_ids: 'text',
            is_manual: 'bool', phone_overrides: 'textarray', email_override: 'text',
        },
        required: ['school_name'],
        defaultOrder: `(CASE WHEN school_id ~ '^[0-9]+$' THEN school_id::bigint END) ASC NULLS LAST, created_date ASC`,
        allowDeleteMany: false,
        cascades: [
            { entity: 'Assignment', fk: 'school_record_id' },
            { entity: 'AddedContact', fk: 'school_record_id' },
        ],
    },
    Salesperson: {
        table: 'salespersons',
        columns: { name: 'text', phone: 'text', email: 'text' },
        required: ['name'],
        defaultOrder: 'created_date ASC',
        allowDeleteMany: false,
        cascades: [{ entity: 'Assignment', fk: 'salesperson_id' }],
    },
    Assignment: {
        table: 'assignments',
        columns: { school_record_id: 'uuid', salesperson_id: 'uuid', interest_level: 'text' },
        required: ['school_record_id', 'salesperson_id'],
        defaultOrder: 'created_date ASC',
        allowDeleteMany: true,
        // Bulk inserts silently skip schools that are already assigned.
        conflictDoNothing: true,
    },
    AddedContact: {
        table: 'added_contacts',
        columns: { school_record_id: 'uuid', contact_type: 'text', value: 'text' },
        required: ['school_record_id', 'contact_type', 'value'],
        defaultOrder: 'created_date ASC',
        allowDeleteMany: true,
    },
};

export const SYSTEM_COLUMNS = ['id', 'created_date', 'updated_date'];

export class ValidationError extends Error {
    constructor(message) { super(message); this.name = 'ValidationError'; }
}

export function coerce(type, value, name) {
    if (value === undefined) return undefined;
    if (value === null) return type === 'textarray' ? [] : type === 'bool' ? false : null;
    switch (type) {
        case 'int': {
            if (value === '') return null;
            const n = Number(value);
            if (!Number.isFinite(n)) throw new ValidationError(`${name} must be a number`);
            return Math.round(n);
        }
        case 'bool': return value === true || value === 'true';
        case 'textarray':
            if (!Array.isArray(value)) throw new ValidationError(`${name} must be an array`);
            return value.map(String);
        default: return String(value);
    }
}
