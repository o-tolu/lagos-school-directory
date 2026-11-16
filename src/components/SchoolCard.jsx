import React, { useState, useRef, useEffect } from 'react';
import { useCrm } from '@/lib/CrmContext';
import { useToast } from '@/components/Toast';
import CopyButton from '@/components/CopyButton';
import { useGlobalConfirm } from '@/components/GlobalConfirmDialog';
import { INTEREST_LEVELS, INTEREST_MAP, getSchoolTypeBadge } from '@/lib/crmConstants';
import { MoreVertical, Plus, Pencil, Trash2, Link2, AlertTriangle, MapPin, Phone, Mail, Globe, Users, Check, RotateCcw } from 'lucide-react';

export default function SchoolCard({
    school,
    schoolIdMap,
    showDuplicates,
    isHiddenDuplicate,
    interestMode = 'badge',
    salespersonId,
}) {
    const {
        salespersons, assignments, getAssignmentForSchool, getAddedContactsForSchool,
        createAssignments, updateAssignment, createAddedContact, deleteAddedContact,
        deleteSchool, updateSchool, online,
    } = useCrm();
    const { toast } = useToast();
    const { showConfirm } = useGlobalConfirm();

    const [menuOpen, setMenuOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [editingPhones, setEditingPhones] = useState(false);
    const [editingEmail, setEditingEmail] = useState(false);
    const [phoneInputs, setPhoneInputs] = useState([]);
    const [emailInput, setEmailInput] = useState('');
    const [editError, setEditError] = useState('');
    const [savedMessage, setSavedMessage] = useState(false);
    const menuRef = useRef(null);

    // Look up assignment — use salespersonId if provided (salesperson detail view)
    const assignment = salespersonId
        ? assignments.find(a => a.school_record_id === school.id && a.salesperson_id === salespersonId)
        : getAssignmentForSchool(school.id);
    const assignedSalesperson = assignment ? salespersons.find(s => s.id === assignment.salesperson_id) : null;
    const isAssigned = !!assignment;

    const addedPhones = getAddedContactsForSchool(school.id, 'phone');
    const addedEmails = getAddedContactsForSchool(school.id, 'email');

    const hasPhoneOverride = Array.isArray(school.phoneOverrides) && school.phoneOverrides.length > 0;
    const hasEmailOverride = school.emailOverride != null && school.emailOverride !== '';
    const displayedPhones = hasPhoneOverride ? school.phoneOverrides : (school.phoneNumbers || []);
    const displayedEmails = hasEmailOverride
        ? [school.emailOverride]
        : (school.email ? school.email.split(/\s+or\s+|,/).map(e => e.trim()).filter(Boolean) : []);

    const website = school.website && school.website !== 'None' ? school.website : null;

    const isLinkedCampus = school.groupType && school.groupType.includes('Same School');
    const linkedNames = [];
    const linkedRecordIds = [];
    if (isLinkedCampus && school.linkedSchoolIds) {
        for (const id of school.linkedSchoolIds) {
            const linked = schoolIdMap[String(id)];
            if (linked) {
                linkedRecordIds.push(linked.id);
                if (linked.id !== school.id) linkedNames.push(linked.school_name);
            }
        }
    }

    const typeBadge = getSchoolTypeBadge(school.school_type);

    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    // Close all dropdowns when a global confirm modal opens
    useEffect(() => {
        const close = () => { setMenuOpen(false); setAssignOpen(false); };
        window.addEventListener('close-all-dropdowns', close);
        return () => window.removeEventListener('close-all-dropdowns', close);
    }, []);

    // Cancel inline edit when another card enters edit mode or opens its menu
    useEffect(() => {
        const handler = (e) => {
            if (e.detail.schoolId !== school.id) {
                setEditingPhones(false);
                setEditingEmail(false);
            }
        };
        window.addEventListener('card-edit-mode-change', handler);
        return () => window.removeEventListener('card-edit-mode-change', handler);
    }, [school.id]);

    // ---- Assignment ----
    const doAssign = async (spId, schoolIds) => {
        await createAssignments(schoolIds.map(id => ({ school_record_id: id, salesperson_id: spId })));
        const sp = salespersons.find(s => s.id === spId);
        toast(`Assigned to ${sp.name}${schoolIds.length > 1 ? ` (${schoolIds.length} schools)` : ''}.`);
    };

    const handleSelectSalesperson = async (spId) => {
        setAssignOpen(false);
        if (isLinkedCampus && linkedRecordIds.length > 0) {
            const sp = salespersons.find(s => s.id === spId);
            const confirmed = await showConfirm(
                `"${school.school_name}" is linked to "${linkedNames[0] || 'linked school'}". Assign both to ${sp.name}?`,
                'Yes, assign both',
                'No, just this one'
            );
            if (confirmed) {
                await doAssign(spId, [school.id, ...linkedRecordIds]);
            } else {
                await doAssign(spId, [school.id]);
            }
        } else {
            await doAssign(spId, [school.id]);
        }
    };

    // ---- Interest Level ----
    const handleInterestChange = async (newLevel) => {
        // Only show sync prompt for "Same School" groups, and only if the linked
        // school is also assigned to the SAME salesperson (salesperson detail view)
        if (isLinkedCampus && linkedRecordIds.length > 0 && salespersonId) {
            const otherLinkedIds = linkedRecordIds.filter(id => id !== school.id);
            const linkedAssignment = assignments.find(
                a => otherLinkedIds.includes(a.school_record_id) && a.salesperson_id === salespersonId
            );
            if (linkedAssignment) {
                const confirmed = await showConfirm(
                    `"${school.school_name}" is linked to "${linkedNames[0] || 'linked school'}". Apply "${INTEREST_MAP[newLevel]?.label}" to both schools?`,
                    'Yes, apply to both',
                    'No, just this one'
                );
                if (confirmed) {
                    const allIds = [school.id, ...linkedRecordIds];
                    for (const rid of allIds) {
                        const a = assignments.find(x => x.school_record_id === rid && x.salesperson_id === salespersonId)
                            || getAssignmentForSchool(rid);
                        if (a) await updateAssignment(a.id, { interest_level: newLevel });
                    }
                    toast(`Interest level updated for ${allIds.length} linked schools.`);
                } else {
                    if (assignment) await updateAssignment(assignment.id, { interest_level: newLevel });
                }
                return;
            }
        }
        // Not a linked campus with same-salesperson assignment — just save normally
        if (assignment) await updateAssignment(assignment.id, { interest_level: newLevel });
    };

    // ---- Restore original contacts ----
    const handleRestorePhones = async () => {
        const confirmed = await showConfirm(
            'Restore original scraped phone numbers? Your edits will be cleared.',
            'Yes, restore',
            'Cancel'
        );
        if (confirmed) {
            await updateSchool(school.id, { phone_overrides: [] });
            toast('Original phone numbers restored.');
        }
    };

    const handleRestoreEmail = async () => {
        const confirmed = await showConfirm(
            'Restore original scraped email? Your edit will be cleared.',
            'Yes, restore',
            'Cancel'
        );
        if (confirmed) {
            await updateSchool(school.id, { email_override: null });
            toast('Original email restored.');
        }
    };

    // ---- Inline edit: phones ----
    const enterEditPhones = () => {
        setMenuOpen(false);
        window.dispatchEvent(new CustomEvent('card-edit-mode-change', { detail: { schoolId: school.id } }));
        setEditError('');
        setPhoneInputs(displayedPhones.length > 0 ? [...displayedPhones] : ['']);
        setEditingPhones(true);
    };

    const handleSavePhones = async () => {
        const cleaned = phoneInputs.map(p => p.trim()).filter(p => p.length > 0);
        if (cleaned.length === 0) {
            setEditError('At least one phone number is required.');
            return;
        }
        await updateSchool(school.id, { phone_overrides: cleaned });
        setEditingPhones(false);
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 1500);
    };

    // ---- Inline edit: email ----
    const enterEditEmail = () => {
        setMenuOpen(false);
        window.dispatchEvent(new CustomEvent('card-edit-mode-change', { detail: { schoolId: school.id } }));
        setEditError('');
        setEmailInput(hasEmailOverride ? school.emailOverride : (school.email || ''));
        setEditingEmail(true);
    };

    const handleSaveEmail = async () => {
        const cleaned = emailInput.trim();
        if (cleaned && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
            setEditError('Please enter a valid email address.');
            return;
        }
        await updateSchool(school.id, { email_override: cleaned || null });
        setEditingEmail(false);
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 1500);
    };

    const handleDeleteContact = async (contact) => {
        const confirmed = await showConfirm(
            `Remove this added ${contact.contact_type}?`,
            'Yes, remove',
            'Cancel'
        );
        if (confirmed) {
            await deleteAddedContact(contact.id);
            toast('Contact removed.');
        }
    };

    const handleDeleteSchool = async () => {
        const confirmed = await showConfirm(
            'Delete this school? This cannot be undone.',
            'Yes, delete',
            'Cancel'
        );
        if (confirmed) {
            await deleteSchool(school.id);
            toast('School deleted.');
        }
    };

    // ---- Render helpers ----
    const AddedContactRow = ({ contact, icon: Icon, hrefPrefix }) => (
        <div className="flex items-center gap-1.5 text-sm group">
            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 flex items-center gap-1 whitespace-nowrap">
                <Pencil className="w-2.5 h-2.5" /> Added
            </span>
            <span className="text-muted-foreground text-xs">|</span>
            <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <a href={`${hrefPrefix}:${contact.value}`} className="text-primary hover:underline truncate">{contact.value}</a>
            <CopyButton value={contact.value} />
            <button
                onClick={() => handleDeleteContact(contact)}
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition-opacity flex-shrink-0"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );

    const ScrapedContactRow = ({ value, icon: Icon, hrefPrefix }) => (
        <div className="flex items-center gap-1.5 text-sm">
            <Icon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <a href={`${hrefPrefix}:${value}`} className="text-primary hover:underline truncate">{value}</a>
            <CopyButton value={value} />
        </div>
    );

    return (
        <div className={`bg-card rounded-xl border border-border p-4 card-hover relative ${isHiddenDuplicate ? 'ring-2 ring-red-300 dark:ring-red-700' : ''}`}>
            {/* Three-dot menu */}
            <div className="absolute top-3 right-3" ref={menuRef}>
                <button
                    onClick={() => {
                        if (!menuOpen) {
                            window.dispatchEvent(new CustomEvent('card-edit-mode-change', { detail: { schoolId: school.id } }));
                        }
                        setMenuOpen(!menuOpen);
                    }}
                    className="p-1 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
                >
                    <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-20">
                        {!school.isManual && (
                            <>
                                <button onClick={enterEditPhones} className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-accent transition-colors">
                                    <Pencil className="w-3.5 h-3.5" /> Edit Phone Numbers
                                </button>
                                {hasPhoneOverride && (
                                    <button onClick={() => { setMenuOpen(false); handleRestorePhones(); }} className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-accent transition-colors">
                                        <RotateCcw className="w-3.5 h-3.5" /> Restore Original Phones
                                    </button>
                                )}
                                <button onClick={enterEditEmail} className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-accent transition-colors">
                                    <Pencil className="w-3.5 h-3.5" /> Edit Email
                                </button>
                                {hasEmailOverride && (
                                    <button onClick={() => { setMenuOpen(false); handleRestoreEmail(); }} className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-accent transition-colors">
                                        <RotateCcw className="w-3.5 h-3.5" /> Restore Original Email
                                    </button>
                                )}
                            </>
                        )}
                        {school.isManual && (
                            <>
                                <button onClick={() => { setMenuOpen(false); window.dispatchEvent(new CustomEvent('edit-school', { detail: school })); }} className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm hover:bg-accent transition-colors">
                                    <Pencil className="w-3.5 h-3.5" /> Edit School
                                </button>
                                <button onClick={() => { setMenuOpen(false); handleDeleteSchool(); }} className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" /> Delete School
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* School Name */}
            <h3 className="font-bold text-base text-card-foreground pr-6 mb-1.5">{school.school_name}</h3>

            {/* Badge row: Type + Ownership + Manual (same line) */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadge.class}`}>{typeBadge.label}</span>
                {school.ownership && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">{school.ownership}</span>}
                {school.isManual && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200 flex items-center gap-1">
                        <Pencil className="w-2.5 h-2.5" /> Manual
                    </span>
                )}
            </div>

            {/* Group badges (linked campus, duplicate) */}
            <div className="flex flex-wrap gap-1.5 mb-2">
                {isLinkedCampus && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 flex items-center gap-1">
                        <Link2 className="w-3 h-3" /> Linked Campus
                    </span>
                )}
                {isHiddenDuplicate && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Possible Duplicate
                    </span>
                )}
            </div>

            {/* Linked campus info */}
            {isLinkedCampus && linkedNames.length > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Linked with: {linkedNames.join(', ')}
                </p>
            )}

            {/* Location */}
            {school.lga && <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /> {school.lga}</p>}
            {school.address && <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /> {school.address}</p>}

            {/* Added phones */}
            {addedPhones.map(c => <AddedContactRow key={c.id} contact={c} icon={Phone} hrefPrefix="tel" />)}

            {/* Phone display / inline edit */}
            {editingPhones ? (
                <div className="space-y-2 mt-2">
                    {phoneInputs.map((phone, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                            <input
                                type="tel"
                                value={phone}
                                onChange={e => setPhoneInputs(prev => prev.map((p, i) => i === idx ? e.target.value : p))}
                                onKeyDown={e => { if (e.key === 'Enter') handleSavePhones(); if (e.key === 'Escape') setEditingPhones(false); }}
                                placeholder="Enter phone number"
                                className="flex-1 px-2 py-1 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                autoFocus={idx === 0}
                            />
                            <button
                                onClick={() => setPhoneInputs(prev => prev.length === 1 ? [''] : prev.filter((_, i) => i !== idx))}
                                className="p-1 text-red-500 hover:text-red-600 flex-shrink-0"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => setPhoneInputs(prev => [...prev, ''])}
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add another number
                    </button>
                    <div className="flex items-center gap-2">
                        <button onClick={handleSavePhones} className="px-3 py-1 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90">Save</button>
                        <button onClick={() => setEditingPhones(false)} className="px-3 py-1 text-sm rounded-lg border border-border hover:bg-accent">Cancel</button>
                    </div>
                    {editError && <p className="text-xs text-red-600">{editError}</p>}
                </div>
            ) : (
                <>
                    {displayedPhones.length > 0 && hasPhoneOverride && (
                        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 dark:bg-amber-900 dark:text-amber-300 w-fit" title="Original data was edited. Click ⋮ to restore.">
                            <Pencil className="w-2.5 h-2.5" /> Edited
                        </span>
                    )}
                    {displayedPhones.map((phone, i) => <ScrapedContactRow key={i} value={phone} icon={Phone} hrefPrefix="tel" />)}
                </>
            )}

            {/* Added emails */}
            {addedEmails.map(c => <AddedContactRow key={c.id} contact={c} icon={Mail} hrefPrefix="mailto" />)}

            {/* Email display / inline edit */}
            {editingEmail ? (
                <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <input
                            type="email"
                            value={emailInput}
                            onChange={e => setEmailInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEmail(); if (e.key === 'Escape') setEditingEmail(false); }}
                            placeholder="Enter email address"
                            className="flex-1 px-2 py-1 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            autoFocus
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={handleSaveEmail} className="px-3 py-1 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90">Save</button>
                        <button onClick={() => setEditingEmail(false)} className="px-3 py-1 text-sm rounded-lg border border-border hover:bg-accent">Cancel</button>
                    </div>
                    {editError && <p className="text-xs text-red-600">{editError}</p>}
                </div>
            ) : (
                <>
                    {displayedEmails.length > 0 && hasEmailOverride && (
                        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 dark:bg-amber-900 dark:text-amber-300 w-fit" title="Original data was edited. Click ⋮ to restore.">
                            <Pencil className="w-2.5 h-2.5" /> Edited
                        </span>
                    )}
                    {displayedEmails.map((email, i) => <ScrapedContactRow key={i} value={email} icon={Mail} hrefPrefix="mailto" />)}
                </>
            )}

            {/* Saved indicator */}
            {savedMessage && (
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                    <Check className="w-3.5 h-3.5" /> Saved
                </p>
            )}

            {/* Website */}
            {website && (
                <div className="flex items-center gap-1.5 text-sm">
                    <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{website}</a>
                    <CopyButton value={website} />
                </div>
            )}

            {/* Student Data */}
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {school.total_population ?? 'N/A'} students</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                <span>👦 Boys: {school.boys_population ?? 'N/A'}</span>
                <span>👧 Girls: {school.girls_population ?? 'N/A'}</span>
            </div>

            {/* Footer: Assignment + Interest */}
            <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-2">
                {isAssigned ? (
                    <>
                        {/* Assigned pill + plain name */}
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" /> Assigned
                        </span>
                        <span className="text-sm font-medium">{assignedSalesperson?.name}</span>

                        {/* Interest level: badge (read-only) on Schools page, dropdown in salesperson view */}
                        {interestMode === 'badge' && assignment.interest_level && (
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ml-auto ${INTEREST_MAP[assignment.interest_level]?.badgeClass || ''}`}>
                                {INTEREST_MAP[assignment.interest_level]?.emoji} {INTEREST_MAP[assignment.interest_level]?.label}
                            </span>
                        )}
                        {interestMode === 'dropdown' && (
                            <select
                                value={assignment.interest_level || 'not_contacted'}
                                onChange={e => handleInterestChange(e.target.value)}
                                className="text-xs px-2 py-1 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring ml-auto"
                            >
                                {INTEREST_LEVELS.map(il => (
                                    <option key={il.value} value={il.value}>{il.emoji} {il.label}</option>
                                ))}
                            </select>
                        )}
                    </>
                ) : (
                    <>
                        {/* Unassigned pill */}
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 font-medium">
                            Unassigned
                        </span>
                        {/* Assign button — only on Schools page (badge mode) */}
                        {interestMode === 'badge' && (
                            <div className="relative ml-auto">
                                <button
                                    onClick={() => setAssignOpen(!assignOpen)}
                                    disabled={!online}
                                    className="text-xs px-3 py-1 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                                >
                                    Assign
                                </button>
                                {assignOpen && (
                                    <div className="absolute bottom-full right-0 mb-1 w-48 bg-popover border border-border rounded-lg shadow-lg py-1 z-20 max-h-60 overflow-y-auto scrollbar-thin">
                                        {salespersons.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No salespersons yet</p>}
                                        {salespersons.map(sp => (
                                            <button
                                                key={sp.id}
                                                onClick={() => handleSelectSalesperson(sp.id)}
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                                            >{sp.name}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

        </div>
    );
}