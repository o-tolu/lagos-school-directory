import React, { useState } from 'react';
import { useCrm } from '@/lib/CrmContext';
import { useToast } from '@/components/Toast';
import { UserPlus } from 'lucide-react';

export default function AddSalespersonForm() {
    const { createSalesperson, online } = useCrm();
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!name.trim()) { setError('Name is required.'); return; }
        setSaving(true);
        try {
            await createSalesperson({ name: name.trim(), phone: phone.trim() || null, email: email.trim() || null });
            toast('Salesperson added.');
            setName(''); setPhone(''); setEmail('');
        } catch (err) {
            setError('Failed to add salesperson. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
            <h2 className="font-bold text-base mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Add Salesperson
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                    <label className="text-xs text-muted-foreground font-medium block mb-1">Name *</label>
                    <input
                        type="text" value={name} onChange={e => setName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                        placeholder="Full name"
                    />
                </div>
                <div className="flex-1 min-w-[160px]">
                    <label className="text-xs text-muted-foreground font-medium block mb-1">Phone (optional)</label>
                    <input
                        type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                        placeholder="Optional"
                    />
                </div>
                <div className="flex-1 min-w-[180px]">
                    <label className="text-xs text-muted-foreground font-medium block mb-1">Email (optional)</label>
                    <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                        placeholder="Optional"
                    />
                </div>
                <button type="submit" disabled={!online || saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm font-medium disabled:opacity-50 flex items-center gap-2 whitespace-nowrap">
                    <UserPlus className="w-4 h-4" /> {saving ? 'Adding...' : 'Add Salesperson'}
                </button>
                {error && <p className="text-sm text-red-600 w-full">{error}</p>}
            </form>
        </div>
    );
}