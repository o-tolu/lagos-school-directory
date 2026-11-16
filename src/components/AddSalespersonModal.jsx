import React, { useState } from 'react';
import { useCrm } from '@/lib/CrmContext';
import { useToast } from '@/components/Toast';

export default function AddSalespersonModal({ onClose }) {
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
            onClose();
        } catch (err) {
            setError('Failed to add salesperson. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <h2 className="font-bold text-lg">Add Salesperson</h2>
                    <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-sm font-medium block mb-1">Name *</label>
                        <input
                            type="text" value={name} onChange={e => setName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Full name"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium block mb-1">Phone</label>
                        <input
                            type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Optional"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium block mb-1">Email</label>
                        <input
                            type="email" value={email} onChange={e => setEmail(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="Optional"
                        />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
                <div className="flex gap-2 justify-end px-6 pb-6">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent">Cancel</button>
                    <button type="submit" disabled={!online || saving} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                        {saving ? 'Adding...' : 'Add Salesperson'}
                    </button>
                </div>
            </form>
        </div>
    );
}