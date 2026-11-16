import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrm } from '@/lib/CrmContext';
import { useToast } from '@/components/Toast';
import CopyButton from '@/components/CopyButton';
import AssignModal from '@/components/AssignModal';
import AddSalespersonForm from '@/components/AddSalespersonForm';
import { ArrowLeftRight, RotateCcw, Trash2, ArrowRight } from 'lucide-react';
import { useGlobalConfirm } from '@/components/GlobalConfirmDialog';

export default function SalesPeoplePage() {
    const { salespersons, assignments, deleteSalesperson, deleteAllAssignments, refetchAssignments, online } = useCrm();
    const { toast } = useToast();
    const { showConfirm } = useGlobalConfirm();
    const navigate = useNavigate();
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [resetting, setResetting] = useState(false);

    const handleReset = async () => {
        const confirmed = await showConfirm(
            'This will permanently remove ALL school assignments for ALL salespersons. This cannot be undone. Are you sure?',
            'Yes, Reset All',
            'Cancel'
        );
        if (!confirmed) return;
        setResetting(true);
        try {
            await deleteAllAssignments();
            await refetchAssignments();
            toast('All assignments have been reset.');
        } catch (err) {
            toast('Failed to reset assignments.', 'error');
        } finally {
            setResetting(false);
        }
    };

    const handleDelete = async (sp) => {
        const count = assignments.filter(a => a.salesperson_id === sp.id).length;
        const confirmed = await showConfirm(
            `Are you sure you want to delete ${sp.name}? Their ${count} assigned school(s) will become Unassigned and can be reassigned later. This cannot be undone.`,
            'Delete',
            'Cancel'
        );
        if (!confirmed) return;
        try {
            await deleteSalesperson(sp.id);
            toast(`${sp.name} deleted. ${count} school${count !== 1 ? 's' : ''} ${count !== 1 ? 'are' : 'is'} now unassigned.`);
        } catch (err) {
            toast('Failed to delete salesperson.', 'error');
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
                <div>
                    <h1 className="text-2xl font-bold">Sales People</h1>
                    <p className="text-sm text-muted-foreground">Manage your business development team</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAssignModal(true)}
                        disabled={!online}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium disabled:opacity-50"
                    >
                        <ArrowLeftRight className="w-4 h-4" /> Assign Schools
                    </button>
                    <button
                        onClick={handleReset}
                        disabled={!online || resetting}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 text-sm font-medium disabled:opacity-50"
                    >
                        <RotateCcw className="w-4 h-4" /> {resetting ? 'Resetting...' : 'Reset All'}
                    </button>
                </div>
            </div>

            {/* Inline Add Form */}
            <AddSalespersonForm />

            {/* Salesperson Cards */}
            {salespersons.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                    <p className="text-lg">💼 No salespersons yet. Add one above to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {salespersons.map(sp => (
                        <SalespersonCard
                            key={sp.id}
                            sp={sp}
                            assignments={assignments}
                            onView={() => navigate(`/sales-people/${sp.id}`)}
                            onDelete={() => handleDelete(sp)}
                        />
                    ))}
                </div>
            )}

            {/* Modals */}
            {showAssignModal && <AssignModal onClose={() => setShowAssignModal(false)} />}

        </div>
    );
}

function SalespersonCard({ sp, assignments, onView, onDelete }) {
    const spAssignments = assignments.filter(a => a.salesperson_id === sp.id);
    const count = spAssignments.length;
    const notContacted = spAssignments.filter(a => (a.interest_level || 'not_contacted') === 'not_contacted').length;

    return (
        <div className="bg-card rounded-xl border border-border p-4 card-hover relative">
            <button
                onClick={onDelete}
                className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-muted-foreground hover:text-red-500 transition-colors"
            >
                <Trash2 className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-3 pr-6">
                <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">
                    {sp.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 className="font-bold text-base">{sp.name}</h3>
                    {sp.phone && <p className="text-xs text-muted-foreground flex items-center gap-1">📞 {sp.phone}<CopyButton value={sp.phone} /></p>}
                    {sp.email && <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">✉️ {sp.email}<CopyButton value={sp.email} /></p>}
                </div>
            </div>
            <div className="mb-3 p-2 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">{count} schools assigned</p>
            </div>
            <div className="flex items-center gap-1.5 mb-3 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span>{notContacted} Not Contacted</span>
            </div>
            <button onClick={onView} className="w-full px-3 py-2 rounded-lg border border-border hover:bg-accent text-sm font-medium flex items-center justify-center gap-1">
                View Schools <ArrowRight className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}