import React from 'react';
import { INTEREST_LEVELS, POPULATION_SIZES } from '@/lib/crmConstants';
import { Search, MapPin, Tag, Shield, Users, Target, MessageSquare, RotateCcw } from 'lucide-react';

const OWNERSHIPS = [
    { value: 'all', label: 'All Ownership' },
    { value: 'Private', label: 'Private' },
    { value: 'Public', label: 'Public' },
    { value: 'Missionary', label: 'Missionary' },
];

const ASSIGNMENT_STATUSES = [
    { value: 'all', label: 'All Schools' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'unassigned', label: 'Unassigned' },
];

const SCHOOL_TYPES = [
    { value: 'all', label: 'All Types' },
    { value: 'nursery', label: 'Nursery' },
    { value: 'primary', label: 'Primary' },
    { value: 'secondary', label: 'Secondary' },
    { value: 'vocational', label: 'Vocational' },
    { value: 'special', label: 'Special' },
];

function Select({ value, onChange, options, icon: Icon, label }) {
    return (
        <div className="relative flex-1 min-w-[130px]">
            {Icon && <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />}
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className={`w-full text-sm rounded-lg border border-input bg-card py-2 ${Icon ? 'pl-8' : 'pl-3'} pr-8 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer appearance-none`}
            >
                {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
    );
}

export default function FilterBar({ filters, onChange, lgas, onReset, showInterest = true }) {
    const update = (key, val) => onChange({ ...filters, [key]: val });

    return (
        <div className="bg-card rounded-xl border border-border p-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-[2] min-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        value={filters.search}
                        onChange={e => update('search', e.target.value)}
                        placeholder="Search by school name or address..."
                        className="w-full text-sm rounded-lg border border-input bg-background py-2 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                </div>
                <Select Icon={MapPin} value={filters.lga} onChange={v => update('lga', v)} options={[{ value: 'all', label: 'All Locations' }, ...lgas.map(l => ({ value: l, label: l }))]} />
                <Select Icon={Tag} value={filters.schoolType} onChange={v => update('schoolType', v)} options={SCHOOL_TYPES} />
                <Select Icon={Shield} value={filters.ownership} onChange={v => update('ownership', v)} options={OWNERSHIPS} />
                <Select Icon={Users} value={filters.populationSize} onChange={v => update('populationSize', v)} options={POPULATION_SIZES} />
                <Select Icon={Target} value={filters.assignmentStatus} onChange={v => update('assignmentStatus', v)} options={ASSIGNMENT_STATUSES} />
                {showInterest && (
                    <Select Icon={MessageSquare} value={filters.interestLevel} onChange={v => update('interestLevel', v)} options={[{ value: 'all', label: 'All Interest Levels' }, ...INTEREST_LEVELS.map(il => ({ value: il.value, label: `${il.emoji} ${il.label}` }))]} />
                )}
                <button
                    onClick={onReset}
                    className="flex items-center gap-1.5 text-sm rounded-lg border border-border bg-card py-2 px-3 hover:bg-accent transition-colors font-medium whitespace-nowrap"
                >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
            </div>
        </div>
    );
}