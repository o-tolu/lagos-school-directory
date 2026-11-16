import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/api/client';
import { processSchool } from '@/lib/schoolUtils';

const CrmContext = createContext(null);

export function CrmProvider({ children }) {
    const [schools, setSchools] = useState([]);
    const [salespersons, setSalespersons] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [addedContacts, setAddedContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [networkOnline, setOnline] = useState(navigator.onLine);
    const [serverUp, setServerUp] = useState(true);
    // 'online' drives the connection dot and offline banner: browser has network AND the live connection to the server is up
    const online = networkOnline && serverUp;

    // Use a ref for assignments so async operations can read the latest without stale closures
    const assignmentsRef = useRef([]);
    assignmentsRef.current = assignments;

    // ---- Load Schools (one-time, large dataset) ----
    const loadSchools = useCallback(async () => {
        try {
            const rawSchools = await api.entities.School.list(null, 6000);
            const processed = rawSchools.map(processSchool);
            // Sort by numeric school_id ascending (Excel file order); manual schools (no school_id) at end
            processed.sort((a, b) => {
                const aId = parseInt(a.school_id);
                const bId = parseInt(b.school_id);
                if (isNaN(aId) && isNaN(bId)) return 0;
                if (isNaN(aId)) return 1;
                if (isNaN(bId)) return -1;
                return aId - bId;
            });
            return processed;
        } catch (err) {
            console.error('Failed to load schools:', err);
            return [];
        }
    }, []);

    // ---- Load Salespersons ----
    const loadSalespersons = useCallback(async () => {
        try {
            return await api.entities.Salesperson.list('-created_date', 200);
        } catch (err) {
            console.error('Failed to load salespersons:', err);
            return [];
        }
    }, []);

    // ---- Load Assignments ----
    const loadAssignments = useCallback(async () => {
        try {
            return await api.entities.Assignment.list('-created_date', 6000);
        } catch (err) {
            console.error('Failed to load assignments:', err);
            return [];
        }
    }, []);

    // ---- Load Added Contacts ----
    const loadAddedContacts = useCallback(async () => {
        try {
            return await api.entities.AddedContact.list('-created_date', 2000);
        } catch (err) {
            console.error('Failed to load added contacts:', err);
            return [];
        }
    }, []);

    // ---- Initial Load ----
    useEffect(() => {
        (async () => {
            setLoading(true);
            const [s, sp, a, ac] = await Promise.all([
                loadSchools(),
                loadSalespersons(),
                loadAssignments(),
                loadAddedContacts(),
            ]);
            setSchools(s);
            setSalespersons(sp);
            setAssignments(a);
            setAddedContacts(ac);
            setLoading(false);
        })();
    }, [loadSchools, loadSalespersons, loadAssignments, loadAddedContacts]);

    // ---- Real-time subscriptions (server pushes every change to all open tabs/devices) ----
    useEffect(() => {
        // 'reload' = too many rows changed (or the connection was re-established): refetch everything for that entity.
        const sync = (setter, loader, mapRecord = (x) => x) => (event) => {
            if (event.type === 'reload') { loader().then(setter); return; }
            setter(prev => {
                if (event.type === 'create') return prev.some(x => x.id === event.data.id) ? prev : [...prev, mapRecord(event.data)];
                if (event.type === 'update') return prev.map(x => x.id === event.data.id ? mapRecord(event.data) : x);
                if (event.type === 'delete') return prev.filter(x => x.id !== event.data.id);
                return prev;
            });
        };

        const unsubs = [
            api.entities.Salesperson.subscribe(sync(setSalespersons, loadSalespersons)),
            api.entities.Assignment.subscribe(sync(setAssignments, loadAssignments)),
            api.entities.AddedContact.subscribe(sync(setAddedContacts, loadAddedContacts)),
            api.entities.School.subscribe(sync(setSchools, loadSchools, processSchool)),
            api.onConnectionChange(setServerUp),
        ];
        return () => unsubs.forEach(u => u());
    }, [loadSchools, loadSalespersons, loadAssignments, loadAddedContacts]);

    // ---- Online/Offline detection ----
    useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, []);

    // ---- Salesperson CRUD ----
    const createSalesperson = useCallback(async (data) => {
        return await api.entities.Salesperson.create(data);
    }, []);

    const deleteSalesperson = useCallback(async (id) => {
        // 1. Delete all assignments for this salesperson
        await api.entities.Assignment.deleteMany({ salesperson_id: id });
        // 2. Delete the salesperson
        await api.entities.Salesperson.delete(id);
        // 3. Re-fetch assignments
        const fresh = await loadAssignments();
        setAssignments(fresh);
    }, [loadAssignments]);

    // ---- Assignment CRUD ----
    const createAssignments = useCallback(async (records) => {
        // Chunk to avoid row limits — batches of 100
        const chunkSize = 100;
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);
            await api.entities.Assignment.bulkCreate(chunk);
        }
        // Re-fetch after all chunks complete
        const fresh = await loadAssignments();
        setAssignments(fresh);
    }, [loadAssignments]);

    const updateAssignment = useCallback(async (id, data) => {
        await api.entities.Assignment.update(id, data);
        // Real-time subscription will update state
    }, []);

    const deleteAllAssignments = useCallback(async () => {
        await api.entities.Assignment.deleteMany({});
        // Immediately set in-memory cache to empty
        setAssignments([]);
    }, []);

    const refetchAssignments = useCallback(async () => {
        const fresh = await loadAssignments();
        setAssignments(fresh);
    }, [loadAssignments]);

    // ---- School CRUD (manual schools) ----
    const createSchool = useCallback(async (data) => {
        const record = await api.entities.School.create(data);
        const processed = processSchool(record);
        setSchools(prev => prev.some(s => s.id === processed.id) ? prev : [...prev, processed]);
        return processed;
    }, []);

    const updateSchool = useCallback(async (id, data) => {
        const record = await api.entities.School.update(id, data);
        const processed = processSchool(record);
        setSchools(prev => prev.map(s => s.id === id ? processed : s));
        return processed;
    }, []);

    const deleteSchool = useCallback(async (id) => {
        // Delete assignments for this school
        await api.entities.Assignment.deleteMany({ school_record_id: id });
        // Delete added contacts for this school
        await api.entities.AddedContact.deleteMany({ school_record_id: id });
        // Delete the school
        await api.entities.School.delete(id);
        // Update local state
        setSchools(prev => prev.filter(s => s.id !== id));
        const fresh = await loadAssignments();
        setAssignments(fresh);
    }, [loadAssignments]);

    // ---- AddedContact CRUD ----
    const createAddedContact = useCallback(async (data) => {
        return await api.entities.AddedContact.create(data);
    }, []);

    const deleteAddedContact = useCallback(async (id) => {
        await api.entities.AddedContact.delete(id);
    }, []);

    // ---- Helper: get assignment for a school ----
    const getAssignmentForSchool = useCallback((schoolRecordId) => {
        return assignmentsRef.current.find(a => a.school_record_id === schoolRecordId);
    }, []);

    // ---- Helper: get added contacts for a school ----
    const getAddedContactsForSchool = useCallback((schoolRecordId, type) => {
        return addedContacts.filter(c => c.school_record_id === schoolRecordId && (!type || c.contact_type === type));
    }, [addedContacts]);

    // ---- Helper: count schools assigned to a salesperson ----
    const getSchoolCountForSalesperson = useCallback((salespersonId) => {
        return assignmentsRef.current.filter(a => a.salesperson_id === salespersonId).length;
    }, []);

    // ---- Helper: get pipeline breakdown for a salesperson ----
    const getPipelineForSalesperson = useCallback((salespersonId) => {
        const counts = {
            not_contacted: 0, reached_out: 0, no_response: 0,
            interested: 0, follow_up: 0, committed: 0, not_interested: 0,
        };
        for (const a of assignmentsRef.current) {
            if (a.salesperson_id === salespersonId) {
                const level = a.interest_level || 'not_contacted';
                if (counts[level] !== undefined) counts[level]++;
            }
        }
        return counts;
    }, []);

    const value = {
        schools, setSchools,
        salespersons, setSalespersons,
        assignments, setAssignments,
        addedContacts, setAddedContacts,
        loading, online,
        createSalesperson, deleteSalesperson,
        createAssignments, updateAssignment, deleteAllAssignments, refetchAssignments,
        createSchool, updateSchool, deleteSchool,
        createAddedContact, deleteAddedContact,
        getAssignmentForSchool, getAddedContactsForSchool,
        getSchoolCountForSalesperson, getPipelineForSalesperson,
    };

    return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm() {
    const ctx = useContext(CrmContext);
    if (!ctx) throw new Error('useCrm must be used within CrmProvider');
    return ctx;
}