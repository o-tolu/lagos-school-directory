import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrm } from '@/lib/CrmContext';
import { useToast } from '@/components/Toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import AssignModal from '@/components/AssignModal';
import AddSalespersonModal from '@/components/AddSalespersonModal';
import { School, CheckCircle, Hourglass, Users, Briefcase, Clock, UserPlus, ArrowLeftRight } from 'lucide-react';

const TYPE_COLORS = {
    'Nursery/Primary': '#1976d2',
    'Nursery': '#42a5f5',
    'Primary': '#43a047',
    'Secondary': '#fb8c00',
    'Vocational': '#8e24aa',
    'Technical': '#5e35b1',
    'Special': '#757575',
    'Other': '#9e9e9e',
};

function categorizeType(type) {
    if (!type) return 'Other';
    const t = type.toLowerCase();
    if (t.includes('nursery') && t.includes('primary')) return 'Nursery/Primary';
    if (t.includes('nursery')) return 'Nursery';
    if (t.includes('primary')) return 'Primary';
    if (t.includes('secondary')) return 'Secondary';
    if (t.includes('vocational')) return 'Vocational';
    if (t.includes('technical')) return 'Technical';
    if (t.includes('special')) return 'Special';
    return 'Other';
}

function StatCard({ icon: Icon, label, value, color }) {
    return (
        <div className="bg-card rounded-xl border border-border p-4 card-hover">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                </div>
                <div className="text-muted-foreground">
                    <Icon className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { schools, salespersons, assignments, online } = useCrm();
    const navigate = useNavigate();
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showAddSpModal, setShowAddSpModal] = useState(false);

    useEffect(() => { setLastUpdated(new Date()); }, [schools.length, salespersons.length, assignments.length]);

    const stats = useMemo(() => {
        const assignedIds = new Set(assignments.map(a => a.school_record_id));
        const totalStudents = schools.reduce((sum, s) => sum + (s.total_population || 0), 0);
        return {
            total: schools.length,
            assigned: assignedIds.size,
            unassigned: schools.length - assignedIds.size,
            totalStudents,
            salesPeople: salespersons.length,
        };
    }, [schools, assignments, salespersons]);

    const typeData = useMemo(() => {
        const counts = {};
        for (const s of schools) {
            const cat = categorizeType(s.school_type);
            counts[cat] = (counts[cat] || 0) + 1;
        }
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [schools]);

    const lgaData = useMemo(() => {
        const counts = {};
        for (const s of schools) {
            if (s.lga) counts[s.lga] = (counts[s.lga] || 0) + 1;
        }
        return Object.entries(counts).map(([lga, count]) => ({ lga, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    }, [schools]);

    if (schools.length === 0) {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-xl skeleton" />)}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="h-72 rounded-xl skeleton" />
                    <div className="h-72 rounded-xl skeleton" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Overview of schools, assignments and your sales team</p>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Last updated {lastUpdated.toLocaleTimeString()}</span>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard icon={School} label="Total Schools" value={stats.total.toLocaleString()} color="text-primary" />
                <StatCard icon={CheckCircle} label="Assigned Schools" value={stats.assigned.toLocaleString()} color="text-primary" />
                <StatCard icon={Hourglass} label="Unassigned Schools" value={stats.unassigned.toLocaleString()} color="text-orange-500" />
                <StatCard icon={Users} label="Total Students" value={stats.totalStudents.toLocaleString()} color="text-foreground" />
                <StatCard icon={Briefcase} label="Sales People" value={stats.salesPeople} color="text-amber-700" />
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-xl border border-border p-4">
                <h2 className="font-bold text-base mb-3">Quick Actions</h2>
                <div className="flex flex-wrap gap-3">
                    <button onClick={() => navigate('/schools')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-accent text-sm font-medium">
                        <School className="w-4 h-4" /> Go to Schools
                    </button>
                    <button onClick={() => setShowAddSpModal(true)} disabled={!online} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-accent text-sm font-medium disabled:opacity-50">
                        <UserPlus className="w-4 h-4" /> Add Salesperson
                    </button>
                    <button onClick={() => setShowAssignModal(true)} disabled={!online} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium disabled:opacity-50">
                        <ArrowLeftRight className="w-4 h-4" /> Assign Schools
                    </button>
                </div>
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-card rounded-xl border border-border p-4">
                    <h2 className="font-bold text-base mb-4">Schools by Type</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={typeData}
                                cx="50%" cy="50%"
                                innerRadius={60} outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                                label={(entry) => {
                                    if (entry.percent < 0.03) return null;
                                    return (
                                        <text x={entry.x} y={entry.y} fill="white" textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight={600}>
                                            {(entry.percent * 100).toFixed(0)}%
                                        </text>
                                    );
                                }}
                                labelLine={false}
                            >
                                {typeData.map((entry, i) => (
                                    <Cell key={i} fill={TYPE_COLORS[entry.name] || '#757575'} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                            />
                            <Legend
                                formatter={(value, entry) => {
                                    const total = typeData.reduce((sum, d) => sum + d.value, 0);
                                    const percent = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
                                    return `${value} (${entry.payload.value.toLocaleString()} - ${percent}%)`;
                                }}
                                wrapperStyle={{ fontSize: '12px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-card rounded-xl border border-border p-4">
                    <h2 className="font-bold text-base mb-4">Top 10 LGAs by School Count</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={lgaData} layout="vertical" margin={{ left: 10, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} stroke="hsl(var(--border))" />
                            <YAxis type="category" dataKey="lga" width={90} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} stroke="hsl(var(--border))" />
                            <Tooltip
                                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                                cursor={{ fill: 'hsl(var(--accent))' }}
                            />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {showAssignModal && <AssignModal onClose={() => setShowAssignModal(false)} />}
            {showAddSpModal && <AddSalespersonModal onClose={() => setShowAddSpModal(false)} />}
        </div>
    );
}