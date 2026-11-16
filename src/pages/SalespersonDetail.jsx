import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCrm } from '@/lib/CrmContext';
import { useToast } from '@/components/Toast';
import SchoolCard from '@/components/SchoolCard';
import FilterBar from '@/components/FilterBar';
import { buildSchoolIdMap, getUniqueLGAs, computeHiddenSchools } from '@/lib/schoolUtils';
import { getPopulationCategory } from '@/lib/crmConstants';
import { exportExcel, exportPDF } from '@/lib/exportUtils';

const DEFAULT_FILTERS = {
    search: '', lga: 'all', schoolType: 'all', ownership: 'all',
    populationSize: 'all', assignmentStatus: 'all', interestLevel: 'all',
};

const PAGE_SIZE = 20;

export default function SalespersonDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { schools, salespersons, assignments, online, loading } = useCrm();
    const { toast } = useToast();
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

    const salesperson = salespersons.find(s => s.id === id);
    const spAssignments = assignments.filter(a => a.salesperson_id === id);
    const notContacted = spAssignments.filter(a => (a.interest_level || 'not_contacted') === 'not_contacted').length;
    const hiddenSet = useMemo(() => computeHiddenSchools(schools), [schools]);
    const schoolIdMap = useMemo(() => buildSchoolIdMap(schools), [schools]);

    // Get this salesperson's assigned school record IDs
    const assignedSchoolIds = useMemo(() => {
        return new Set(assignments.filter(a => a.salesperson_id === id).map(a => a.school_record_id));
    }, [assignments, id]);

    // Get the school objects
    const assignedSchools = useMemo(() => {
        return schools.filter(s => assignedSchoolIds.has(s.id));
    }, [schools, assignedSchoolIds]);

    const lgas = useMemo(() => getUniqueLGAs(assignedSchools), [assignedSchools]);

    // Filter
    const filteredSchools = useMemo(() => {
        let result = assignedSchools;
        result = result.filter(s => !hiddenSet.has(s.id));
        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(s => s.school_name?.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q));
        }
        if (filters.lga !== 'all') result = result.filter(s => s.lga === filters.lga);
        if (filters.schoolType !== 'all') result = result.filter(s => s.school_type?.toLowerCase().includes(filters.schoolType));
        if (filters.ownership !== 'all') result = result.filter(s => s.ownership === filters.ownership);
        if (filters.populationSize !== 'all') result = result.filter(s => getPopulationCategory(s.total_population) === filters.populationSize);
        if (filters.interestLevel !== 'all') {
            const interestMap = {};
            for (const a of assignments) { if (a.salesperson_id === id) interestMap[a.school_record_id] = a.interest_level || 'not_contacted'; }
            result = result.filter(s => interestMap[s.id] === filters.interestLevel);
        }
        return result;
    }, [assignedSchools, filters, hiddenSet, assignments, id]);

    useEffect(() => { setDisplayCount(PAGE_SIZE); }, [filters]);

    const visibleSchools = filteredSchools.slice(0, displayCount);
    const allLoaded = displayCount >= filteredSchools.length;

    // Get interest level for a school
    const interestForSchool = (schoolId) => {
        const a = assignments.find(a => a.school_record_id === schoolId && a.salesperson_id === id);
        return a?.interest_level || 'Not Contacted';
    };

    const handleExportExcel = () => {
        const data = filteredSchools.map(s => ({ ...s, interest_level: interestForSchool(s.id) }));
        exportExcel(data, `${salesperson?.name || 'Salesperson'}_Schools`);
        toast('Excel exported.');
    };

    const handleExportPDF = () => {
        const data = filteredSchools.map(s => ({ ...s, interest_level: interestForSchool(s.id) }));
        exportPDF(data, salesperson?.name || 'Salesperson');
        toast('PDF exported.');
    };

    if (!salesperson) {
        if (loading) return (
            <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
            </div>
        );
        return (
            <div className="text-center py-16">
                <p className="text-muted-foreground">Salesperson not found.</p>
                <button onClick={() => navigate('/sales-people')} className="mt-4 px-4 py-2 rounded-lg border border-border hover:bg-accent text-sm">← Back to Sales People</button>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div>
                    <button onClick={() => navigate('/sales-people')} className="text-sm text-muted-foreground hover:text-foreground mb-1">← Back to Sales People</button>
                    <h1 className="text-2xl font-bold">{salesperson.name}</h1>
                    <p className="text-sm text-muted-foreground">{filteredSchools.length} assigned school(s) · {notContacted} not contacted</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExportExcel} disabled={!online} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent text-sm font-medium disabled:opacity-50">
                        📥 Export Excel
                    </button>
                    <button onClick={handleExportPDF} disabled={!online} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-accent text-sm font-medium disabled:opacity-50">
                        📄 Export PDF
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <FilterBar
                filters={filters}
                onChange={setFilters}
                lgas={lgas}
                onReset={() => setFilters(DEFAULT_FILTERS)}
            />

            {/* Result count */}
            <p className="text-sm text-muted-foreground mb-3">
                Showing {Math.min(displayCount, filteredSchools.length)} of {filteredSchools.length} assigned schools
            </p>

            {/* Cards */}
            {filteredSchools.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <p className="text-lg">📋 No schools assigned yet. Use Assign Schools or assign manually from the Schools page.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {visibleSchools.map(school => (
                            <SchoolCard
                                key={school.id}
                                school={school}
                                schoolIdMap={schoolIdMap}
                                showDuplicates={false}
                                isHiddenDuplicate={hiddenSet.has(school.id)}
                                interestMode="dropdown"
                                salespersonId={id}
                            />
                        ))}
                    </div>
                    {!allLoaded && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setDisplayCount(c => c + PAGE_SIZE)}
                                className="px-6 py-2.5 rounded-lg border border-border hover:bg-accent text-sm font-medium"
                            >Load More</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}