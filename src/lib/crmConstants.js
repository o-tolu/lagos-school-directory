// Interest Level definitions — colours, labels, emoji
export const INTEREST_LEVELS = [
    { value: 'not_contacted', label: 'Not Contacted', emoji: '🔘', badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200', dotClass: 'bg-gray-400' },
    { value: 'reached_out', label: 'Reached Out', emoji: '🔵', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200', dotClass: 'bg-blue-500' },
    { value: 'no_response', label: 'No Response', emoji: '⬛', badgeClass: 'bg-gray-800 text-white dark:bg-gray-600 dark:text-gray-100', dotClass: 'bg-gray-700' },
    { value: 'interested', label: 'Interested', emoji: '🟡', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200', dotClass: 'bg-amber-500' },
    { value: 'follow_up', label: 'Follow Up', emoji: '🟠', badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200', dotClass: 'bg-orange-500' },
    { value: 'committed', label: 'Committed', emoji: '🟢', badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200', dotClass: 'bg-green-500' },
    { value: 'not_interested', label: 'Not Interested', emoji: '🔴', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200', dotClass: 'bg-red-500' },
];

export const INTEREST_MAP = Object.fromEntries(INTEREST_LEVELS.map(i => [i.value, i]));

// School Type badge colours
export const SCHOOL_TYPE_BADGES = {
    'nursery': { label: 'Nursery', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' },
    'primary': { label: 'Primary', class: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' },
    'secondary': { label: 'Secondary', class: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200' },
    'vocational': { label: 'Vocational', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' },
    'special': { label: 'Special', class: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200' },
};

export function getSchoolTypeBadge(type) {
    if (!type) return { label: 'Unknown', class: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' };
    const t = type.toLowerCase();
    for (const key of Object.keys(SCHOOL_TYPE_BADGES)) {
        if (t.includes(key)) return SCHOOL_TYPE_BADGES[key];
    }
    return { label: type.charAt(0).toUpperCase() + type.slice(1), class: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' };
}

// Population size categories
export const POPULATION_SIZES = [
    { value: 'all', label: 'All Sizes' },
    { value: 'small', label: 'Small (under 200)' },
    { value: 'medium', label: 'Medium (200–500)' },
    { value: 'large', label: 'Large (500–1000)' },
    { value: 'very_large', label: 'Very Large (1000+)' },
];

export function getPopulationCategory(total) {
    if (!total || total === 0) return 'unknown';
    if (total < 200) return 'small';
    if (total < 500) return 'medium';
    if (total < 1000) return 'large';
    return 'very_large';
}