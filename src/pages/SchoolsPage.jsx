import React, { useMemo, useState, useEffect } from 'react';
import { useCrm } from '@/lib/CrmContext';
import SchoolCard from '@/components/SchoolCard';
import FilterBar from '@/components/FilterBar';
import AddSchoolModal from '@/components/AddSchoolModal';
import AssignModal from '@/components/AssignModal';
import { computeHiddenSchools, buildSchoolIdMap, getUniqueLGAs } from '@/lib/schoolUtils';
import { getPopulationCategory } from '@/lib/crmConstants';
import { Eye, Plus, ArrowLeftRight } from 'lucide-react';

const DEFAULT_FILTERS = {
    search: '', lga: 'all', schoolType: 'all', ownership: 'all',
    populationSize: 'all', assignmentStatus: 'all', interestLevel: 'all',
};

const PAGE_SIZE = 20;

export default function SchoolsPage() {
    const { schools, salespersons, assignments, online } = useCrm();
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
    const [showDuplicates, setShowDuplicates] = useState(false);
    const [showAddSchool, setShowAddSchool] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [editSchool, setEditSchool] = useState(null);

    const hiddenSet = useMemo(() => computeHiddenSchools(schools), [schools]);
    const schoolIdMap = useMemo(() => buildSchoolIdMap(schools), [schools]);
    const lgas = useMemo(() => getUniqueLGAs(schools), [schools]);
    const assignedIds = useMemo(() => new Set(assignments.map(a => a.school_record_id)), [assignments]);
    const interestMap = useMemo(() => {
        const m = {};
        for (const a of assignments) m[a.school_record_id] = a.interest_level || 'not_contacted';
        return m;
    }, [assignments]);

    useEffect(() => {
        const handler = (e) => { setEditSchool(e.detail); setShowAddSchool(true); };
        window.addEventListener('edit-school', handler);
        return () => window.removeEventListener('edit-school', handler);
    }, []);

    const filteredSchools = useMemo(() => {
        let result = schools;

        if (!showDuplicates) {
            result = result.filter(s => !hiddenSet.has(s.id));
        }

        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(s =>
                s.school_name?.toLowerCase().includes(q) ||
                s.address?.toLowerCase().includes(q)
            );
        }
        if (filters.lga !== 'all') result = result.filter(s => s.lga === filters.lga);
        if (filters.schoolType !== 'all') result = result.filter(s => s.school_type?.toLowerCase().includes(filters.schoolType));
        if (filters.ownership !== 'all') result = result.filter(s => s.ownership === filters.ownership);
        if (filters.populationSize !== 'all') result = result.filter(s => getPopulationCategory(s.total_population) === filters.populationSize);
        if (filters.assignmentStatus === 'assigned') result = result.filter(s => assignedIds.has(s.id));
        else if (filters.assignmentStatus === 'unassigned') result = result.filter(s => !assignedIds.has(s.id));
        if (filters.interestLevel !== 'all') result = result.filter(s => interestMap[s.id] === filters.interestLevel);

        return result;
    }, [schools, filters, showDuplicates, hiddenSet, assignedIds, interestMap]);

    useEffect(() => { setDisplayCount(PAGE_SIZE); }, [filters]);

    const visibleSchools = filteredSchools.slice(0, displayCount);
    const allLoaded = displayCount >= filteredSchools.length;

    let emptyMessage = null;
    if (filteredSchools.length === 0) {
        if (filters.assignmentStatus === 'unassigned' && assignedIds.size === schools.length && schools.length > 0) {
            emptyMessage = '⏳ All schools are currently assigned. Great work!';
        } else {
            emptyMessage = '🔍 No schools found. Try adjusting your filters.';
        }
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-4">
                <h1 className="text-2xl font-bold">Schools</h1>
                <p className="text-sm text-muted-foreground">Browse, filter and assign private schools across Lagos State</p>
            </div>

            {/* Filter Bar */}
            <FilterBar
                filters={filters}
                onChange={setFilters}
                lgas={lgas}
                onReset={() => setFilters(DEFAULT_FILTERS)}
                showInterest={false}
            />

            {/* Actions + count */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <p className="text-sm text-muted-foreground">
                    {emptyMessage ? '' : `Showing ${Math.min(displayCount, filteredSchools.length)} of ${filteredSchools.length} schools`}
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowDuplicates(!showDuplicates)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent text-sm font-medium"
                    >
                        <Eye className="w-4 h-4" /> {showDuplicates ? 'Hide' : 'Show'} Duplicates
                    </button>
                    <button
                        onClick={() => { setEditSchool(null); setShowAddSchool(true); }}
                        disabled={!online}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium disabled:opacity-50"
                    >
                        <Plus className="w-4 h-4" /> Add School
                    </button>
                    <button
                        onClick={() => setShowAssignModal(true)}
                        disabled={!online}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium disabled:opacity-50"
                    >
                        <ArrowLeftRight className="w-4 h-4" /> Assign Schools
                    </button>
                </div>
            </div>

            {/* Card Grid */}
            {emptyMessage ? (
                <div className="text-center py-16 text-muted-foreground">
                    <p className="text-lg">{emptyMessage}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {visibleSchools.map(school => (
                            <SchoolCard
                                key={school.id}
                                school={school}
                                schoolIdMap={schoolIdMap}
                                showDuplicates={showDuplicates}
                                isHiddenDuplicate={hiddenSet.has(school.id)}
                            />
                        ))}
                    </div>

                    <div className="mt-6 text-center">
                        {!allLoaded ? (
                            <button
                                onClick={() => setDisplayCount(c => c + PAGE_SIZE)}
                                className="px-6 py-2.5 rounded-lg border border-border hover:bg-accent text-sm font-medium"
                            >
                                Load More
                            </button>
                        ) : (
                            <p className="text-sm text-muted-foreground">All {filteredSchools.length} schools loaded</p>
                        )}
                    </div>
                </>
            )}

            {/* Modals */}
            {showAddSchool && (
                <AddSchoolModal onClose={() => { setShowAddSchool(false); setEditSchool(null); }} editSchool={editSchool} />
            )}
            {showAssignModal && <AssignModal onClose={() => setShowAssignModal(false)} />}
        </div>
    );
}