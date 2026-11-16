// School data processing utilities

// Normalize LGA: strip "LGA" suffix, standardise hyphenation, trim
export function normalizeLGA(lga) {
    if (!lga) return '';
    let result = lga.trim();
    // Strip " LGA" suffix (case-insensitive)
    result = result.replace(/\s*LGA\s*$/i, '').trim();
    // Standardise: strip extra spaces around hyphens
    result = result.replace(/\s*-\s*/g, '-');
    return result;
}

// Parse phone numbers: split by comma, trim, dedup, remove blanks, max 4
export function parsePhoneNumbers(phoneStr) {
    if (!phoneStr || typeof phoneStr !== 'string') return [];
    const parts = phoneStr.split(',').map(p => p.trim()).filter(p => p.length > 0);
    // Remove exact duplicates (case-sensitive)
    const unique = [...new Set(parts)];
    return unique.slice(0, 4);
}

// Parse linked school IDs: split by comma, trim, parse to numbers
export function parseLinkedSchoolIds(str) {
    if (!str || typeof str !== 'string') return [];
    return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

// Convert zero population to null
export function normalizePopulation(val) {
    if (val === 0 || val === '0' || val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
}

// Process a raw school record from the database into a normalized form
export function processSchool(raw) {
    return {
        ...raw,
        lga: normalizeLGA(raw.lga),
        phoneNumbers: parsePhoneNumbers(raw.phone_number),
        linkedSchoolIds: parseLinkedSchoolIds(raw.linked_school_ids),
        boys_population: normalizePopulation(raw.boys_population),
        girls_population: normalizePopulation(raw.girls_population),
        total_population: normalizePopulation(raw.total_population),
        groupId: raw.group_id || null,
        groupType: raw.group_type || null,
        recommendedAction: raw.recommended_action || null,
        isManual: raw.is_manual === true,
        phoneOverrides: Array.isArray(raw.phone_overrides) ? raw.phone_overrides : [],
        emailOverride: raw.email_override ?? null,
    };
}

// Determine which schools should be hidden (Duplicate Listing — not lowest ID in group)
export function computeHiddenSchools(schools) {
    const hidden = new Set();
    const duplicateGroups = {};
    for (const s of schools) {
        if (s.groupType && s.groupType.includes('Duplicate') && s.groupId) {
            if (!duplicateGroups[s.groupId]) duplicateGroups[s.groupId] = [];
            duplicateGroups[s.groupId].push(s);
        }
    }
    for (const groupId of Object.keys(duplicateGroups)) {
        const group = duplicateGroups[groupId];
        // Sort by numeric school_id ascending — lowest is primary
        group.sort((a, b) => {
            const aId = parseInt(a.school_id) || 0;
            const bId = parseInt(b.school_id) || 0;
            return aId - bId;
        });
        // Hide all except the first (lowest ID)
        for (let i = 1; i < group.length; i++) {
            hidden.add(group[i].id);
        }
    }
    return hidden;
}

// Get all unique LGAs from schools, sorted A-Z
export function getUniqueLGAs(schools) {
    const set = new Set();
    for (const s of schools) {
        if (s.lga) set.add(s.lga);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
}

// Get all unique school types
export function getUniqueSchoolTypes(schools) {
    const set = new Set();
    for (const s of schools) {
        if (s.school_type) set.add(s.school_type);
    }
    return [...set].sort();
}

// Build a lookup map: school_id (string) -> school object
export function buildSchoolIdMap(schools) {
    const map = {};
    for (const s of schools) {
        if (s.school_id) map[String(s.school_id)] = s;
    }
    return map;
}

// Build a lookup map: entity _id -> school object
export function buildSchoolRecordMap(schools) {
    const map = {};
    for (const s of schools) {
        if (s.id) map[s.id] = s;
    }
    return map;
}

// Find linked school names for "Same School - Different Levels" groups
export function getLinkedSchoolNames(school, schools, schoolIdMap) {
    if (!school.linkedSchoolIds || school.linkedSchoolIds.length === 0) return [];
    const names = [];
    for (const id of school.linkedSchoolIds) {
        const linked = schoolIdMap[String(id)];
        if (linked && linked.id !== school.id) {
            names.push(linked.school_name);
        }
    }
    return names;
}