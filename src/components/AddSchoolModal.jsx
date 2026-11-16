import React, { useState, useEffect } from 'react';
import { useCrm } from '@/lib/CrmContext';
import { useToast } from '@/components/Toast';

const SCHOOL_TYPE_OPTIONS = [
    { value: '', label: 'Select type' },
    { value: 'nursery/primary', label: 'Nursery/Primary' },
    { value: 'nursery', label: 'Nursery' },
    { value: 'primary', label: 'Primary' },
    { value: 'secondary', label: 'Secondary' },
    { value: 'vocational', label: 'Vocational' },
    { value: 'special', label: 'Special' },
];

export default function AddSchoolModal({ onClose, editSchool }) {
    const { createSchool, updateSchool, online } = useCrm();
    const { toast } = useToast();
    const isEdit = !!editSchool;

    const [form, setForm] = useState({
        school_name: '', address: '', phone_number: '', lga: '',
        school_type: '', email: '', website: '',
        boys_population: '', girls_population: '',
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editSchool) {
            setForm({
                school_name: editSchool.school_name || '',
                address: editSchool.address || '',
                phone_number: editSchool.phone_number || '',
                lga: editSchool.lga || '',
                school_type: editSchool.school_type || '',
                email: editSchool.email || '',
                website: editSchool.website || '',
                boys_population: editSchool.boys_population ?? '',
                girls_population: editSchool.girls_population ?? '',
            });
        }
    }, [editSchool]);

    const totalPop = (Number(form.boys_population) || 0) + (Number(form.girls_population) || 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = {};
        if (!form.school_name.trim()) errs.school_name = 'School name is required';
        if (!form.address.trim()) errs.address = 'Address is required';
        if (!form.phone_number.trim()) errs.phone_number = 'At least one phone number is required';
        if (!form.school_type) errs.school_type = 'Please select a school type.';
        setErrors(errs);
        if (Object.keys(errs).length > 0) return;

        setSaving(true);
        try {
            const data = {
                ...form,
                school_name: form.school_name.trim(),
                address: form.address.trim(),
                phone_number: form.phone_number.trim(),
                lga: form.lga.trim() || null,
                school_type: form.school_type || null,
                email: form.email.trim() || null,
                website: form.website.trim() || null,
                boys_population: form.boys_population ? Number(form.boys_population) : null,
                girls_population: form.girls_population ? Number(form.girls_population) : null,
                total_population: totalPop || null,
                is_manual: true,
            };

            if (isEdit) {
                await updateSchool(editSchool.id, data);
                toast('School updated.');
            } else {
                data.school_id = `MANUAL-${Date.now()}`;
                data.ownership = 'Private';
                await createSchool(data);
                toast('School added.');
            }
            onClose();
        } catch (err) {
            setErrors({ submit: 'Failed to save school. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-thin" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
                    <h2 className="font-bold text-lg">{isEdit ? 'Edit School' : 'Add School'}</h2>
                    <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>
                <div className="p-6 space-y-4">
                    <Field label="School Name *" error={errors.school_name}>
                        <input type="text" value={form.school_name} onChange={e => setForm({ ...form, school_name: e.target.value })}
                            className="input-base" autoFocus />
                    </Field>
                    <Field label="Address *" error={errors.address}>
                        <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                            className="input-base" />
                    </Field>
                    <Field label="Phone Number *" error={errors.phone_number}>
                        <input type="text" value={form.phone_number} onChange={e => setForm({ ...form, phone_number: e.target.value })}
                            className="input-base" placeholder="e.g. 08012345678" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="LGA / Location">
                            <input type="text" value={form.lga} onChange={e => setForm({ ...form, lga: e.target.value })} className="input-base" />
                        </Field>
                        <Field label="School Type *" error={errors.school_type}>
                            <select value={form.school_type} onChange={e => setForm({ ...form, school_type: e.target.value })} className="input-base">
                                {SCHOOL_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Email">
                            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-base" />
                        </Field>
                        <Field label="Website">
                            <input type="text" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} className="input-base" />
                        </Field>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Boys Population">
                            <input type="number" value={form.boys_population} onChange={e => setForm({ ...form, boys_population: e.target.value })} className="input-base" />
                        </Field>
                        <Field label="Girls Population">
                            <input type="number" value={form.girls_population} onChange={e => setForm({ ...form, girls_population: e.target.value })} className="input-base" />
                        </Field>
                        <Field label="Total">
                            <input type="text" value={totalPop || ''} readOnly className="input-base bg-muted cursor-not-allowed" />
                        </Field>
                    </div>
                    {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}
                </div>
                <div className="flex gap-2 justify-end px-6 pb-6 sticky bottom-0 bg-card">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-accent">Cancel</button>
                    <button type="submit" disabled={!online || saving} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50">
                        {saving ? 'Saving...' : isEdit ? 'Update School' : 'Add School'}
                    </button>
                </div>
                <style>{`.input-base { width: 100%; padding: 0.5rem 0.75rem; font-size: 0.875rem; border-radius: 0.5rem; border: 1px solid hsl(var(--input)); background: hsl(var(--background)); outline: none; } .input-base:focus { box-shadow: 0 0 0 2px hsl(var(--ring)); }`}</style>
            </form>
        </div>
    );
}

function Field({ label, error, children }) {
    return (
        <div>
            <label className="text-sm font-medium block mb-1">{label}</label>
            {children}
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
    );
}