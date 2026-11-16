import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useCrm } from '@/lib/CrmContext';
import { useToast } from '@/components/Toast';
import { computeHiddenSchools, buildSchoolIdMap } from '@/lib/schoolUtils';
import { useGlobalConfirm } from '@/components/GlobalConfirmDialog';

const MODES = [
    { value: 'auto', label: 'Auto-Assign All', icon: '⚡', desc: 'Distribute all unassigned equally' },
    { value: 'fixed', label: 'Fixed Per Person', icon: '🎯', desc: 'Same number to each salesperson' },
    { value: 'one', label: 'One Salesperson', icon: '👤', desc: 'Assign to a specific person' },
];

export default function AssignModal({ onClose }) {
    const { schools, salespersons, assignments, refetchAssignments, online } = useCrm();
    const { toast } = useToast();
    const { showConfirm } = useGlobalConfirm();
    const [mode, setMode] = useState('auto');
    const [fixedNumber, setFixedNumber] = useState('');
    const [selectedSp, setSelectedSp] = useState('');
    const [oneNumber, setOneNumber] = useState('');
    const [error, setError] = useState('');
    const [progress, setProgress] = useState(null);

    const hiddenSet = computeHiddenSchools(schools);
    const schoolIdMap = buildSchoolIdMap(schools);
    const assignedIds = new Set(assignments.map(a => a.school_record_id));

    const buildUnits = () => {
        const visibleUnassigned = schools.filter(s =>
            !hiddenSet.has(s.id) && !assignedIds.has(s.id)
        );
        const units = [];
        const processedGroupIds = new Set();
        for (const s of visibleUnassigned) {
            if (s.groupId && s.groupType && s.groupType.includes('Same School')) {
                if (processedGroupIds.has(s.groupId)) continue;
                const groupMembers = visibleUnassigned.filter(
                    m => m.groupId === s.groupId && m.groupType && m.groupType.includes('Same School')
                );
                units.push(groupMembers);
                processedGroupIds.add(s.groupId);
            } else {
                units.push([s]);
            }
        }
        return units;
    };

    const units = buildUnits();
    const unassignedSchoolCount = units.reduce((sum, u) => sum + u.length, 0);
    const unassignedUnitCount = units.length;

    const handleExecute = async () => {
        setError('');

        if (salespersons.length === 0) { setError('No salespersons available. Add one first.'); return; }

        let distribution = [];

        if (mode === 'auto') {
            const sortedUnits = [...units];
            for (let i = 0; i < sortedUnits.length; i++) {
                const sp = salespersons[i % salespersons.length];
                if (!distribution.find(d => d.salespersonId === sp.id)) distribution.push({ salespersonId: sp.id, schoolRecordIds: [] });
                const d = distribution.find(d => d.salespersonId === sp.id);
                d.schoolRecordIds.push(...sortedUnits[i].map(s => s.id));
            }
        } else if (mode === 'fixed') {
            const n = parseInt(fixedNumber);
            let idx = 0;
            for (const sp of salespersons) {
                distribution.push({ salespersonId: sp.id, schoolRecordIds: [] });
                for (let i = 0; i < n; i++) {
                    if (idx < units.length) {
                        distribution[distribution.length - 1].schoolRecordIds.push(...units[idx].map(s => s.id));
                        idx++;
                    }
                }
            }
        } else if (mode === 'one') {
            distribution.push({ salespersonId: selectedSp, schoolRecordIds: [] });
            for (let i = 0; i < parseInt(oneNumber) && i < units.length; i++) {
                distribution[0].schoolRecordIds.push(...units[i].map(s => s.id));
            }
        }

        const records = [];
        for (const d of distribution) {
            for (const rid of d.schoolRecordIds) {
                records.push({ school_record_id: rid, salesperson_id: d.salespersonId });
            }
        }

        setProgress({ done: 0, total: records.length });
        const chunkSize = 100;
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);
            await base44.entities.Assignment.bulkCreate(chunk);
            setProgress({ done: Math.min(i + chunkSize, records.length), total: records.length });
        }

        await refetchAssignments();
        toast(`${records.length} schools assigned across ${distribution.length} salespersons.`);
        setProgress(null);
        onClose();
    };

    const handleConfirm = async () => {
        setError('');

        if (salespersons.length === 0) { setError('No salespersons available. Add one first.'); return; }

        let message = '';

        if (mode === 'auto') {
            if (unassignedUnitCount === 0) { setError('There are no unassigned schools available. All schools have already been assigned.'); return; }
            if (unassignedUnitCount < salespersons.length) {
                message = `Not enough unassigned schools to give at least one to each salesperson. Only ${unassignedUnitCount} schools available for ${salespersons.length} salespersons. Proceed anyway?`;
            } else {
                const per = Math.ceil(unassignedUnitCount / salespersons.length);
                message = `This will assign all ${unassignedUnitCount} unassigned schools equally across ${salespersons.length} salespersons (~${per} each). Continue?`;
            }
        } else if (mode === 'fixed') {
            const n = parseInt(fixedNumber);
            if (!n || n <= 0) { setError('Enter a valid number.'); return; }
            const needed = n * salespersons.length;
            if (needed > unassignedUnitCount) {
                setError(`Not enough schools to go around. Assigning ${n} schools to each of ${salespersons.length} salespersons requires ${needed} schools, but only ${unassignedUnitCount} are unassigned. Reduce the number or use Auto-Assign All.`);
                return;
            }
            message = `Assign ${n} schools to each of ${salespersons.length} salespersons?`;
        } else if (mode === 'one') {
            if (!selectedSp) { setError('Select a salesperson.'); return; }
            const n = parseInt(oneNumber);
            if (!n || n <= 0) { setError('Enter a valid number.'); return; }
            if (n > unassignedUnitCount) {
                setError(`Only ${unassignedUnitCount} unassigned schools are available. ${salespersons.find(s => s.id === selectedSp)?.name} can receive a maximum of ${unassignedUnitCount} schools right now.`);
                return;
            }
            message = `Assign ${n} schools to ${salespersons.find(s => s.id === selectedSp)?.name}?`;
        }

        const confirmed = await showConfirm(message, 'Assign', 'Cancel');
        if (confirmed) {
            await handleExecute();
        }
    };

    if (progress) {
        return (
            <ModalShell onClose={onClose} title="Assigning Schools">
                <div className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 border-4 border-muted border-t-primary rounded-full animate-spin" />
                    <p className="text-sm font-medium">Assigning schools... ({progress.done} / {progress.total})</p>
                    <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                    </div>
                </div>
            </ModalShell>
        );
    }

    return (
        <ModalShell onClose={onClose} title="Assign Schools">
            <div className="p-6">
                <div className="mb-4 p-3 rounded-lg bg-primary/10 text-center">
                    <p className="text-sm text-muted-foreground">Unassigned Schools</p>
                    <p className="text-2xl font-bold text-primary">{unassignedSchoolCount}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                    {MODES.map(m => (
                        <button
                            key={m.value}
                            onClick={() => { setMode(m.value); setError(''); }}
                            className={`p-3 rounded-lg border text-center transition-colors ${mode === m.value ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
                        >
                            <div className="text-xl mb-1">{m.icon}</div>
                            <div className="text-xs font-medium">{m.label}</div>
                        </button>
                    ))}
                </div>

                {mode === 'fixed' && (
                    <div className="mb-4">
                        <label className="text-sm font-medium block mb-1">Schools per salesperson</label>
                        <input
                            type="number" min="1" value={fixedNumber}
                            onChange={e => setFixedNumber(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="e.g. 50"
                        />
                    </div>
                )}
                {mode === 'one' && (
                    <>
                        <div className="mb-4">
                            <label className="text-sm font-medium block mb-1">Salesperson</label>
                            <select
                                value={selectedSp}
                                onChange={e => setSelectedSp(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Select...</option>
                                {salespersons.map(sp => (
                                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="mb-4">
                            <label className="text-sm font-medium block mb-1">Number of schools</label>
                            <input
                                type="number" min="1" value={oneNumber}
                                onChange={e => setOneNumber(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                placeholder="e.g. 50"
                            />
                        </div>
                    </>
                )}

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                        {error}
                    </div>
                )}

                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent">Cancel</button>
                    <button
                        onClick={handleConfirm}
                        disabled={!online || salespersons.length === 0}
                        className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >Assign Schools</button>
                </div>
            </div>

        </ModalShell>
    );
}

function ModalShell({ children, onClose, title }) {
    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <div className="bg-card rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-thin" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="font-bold text-lg">{title}</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}