import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Edit3, MapPin, Activity, Globe, X, Check, UserPlus, Users, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { addPatient, updatePatient, deletePatient, getApiErrorMessage } from '../../lib/familyApi';
import { usePatientStore } from '../../store/patientStore';
import type { Family, Patient } from '../../types';

interface PatientSelectorBarProps {
  family: Family;
  isAdmin?: boolean;
  showDetailsCard?: boolean;
  onPatientChange?: (patient: Patient | null) => void;
}

export default function PatientSelectorBar({
  family,
  isAdmin = true,
  showDetailsCard = true,
  onPatientChange,
}: PatientSelectorBarProps) {
  const queryClient = useQueryClient();
  const { selectedPatientId, selectedPatientByFamily, setSelectedPatientId, getSelectedPatientId } = usePatientStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Normalize patients list with guaranteed unique string IDs
  const patients: Patient[] = (Array.isArray(family.patients) && family.patients.length > 0
    ? family.patients
    : [
        {
          _id: family._id ? `${family._id}-patient-1` : 'patient-1',
          name: family.careRecipient?.name || 'Venkateswara Rao',
          relationship: family.careRecipient?.relationship || 'Father',
          age: family.careRecipient?.age || 72,
          gender: 'Male',
          condition: family.careRecipient?.condition || 'Cardiology recovery, Type 2 Diabetes, Hypertension',
          location: family.careRecipient?.location || 'Guntur, Andhra Pradesh',
          primaryLanguage: family.careRecipient?.primaryLanguage || 'Telugu, English',
          notes: family.careRecipient?.notes || '',
          isPrimary: true,
        },
      ]
  ).map((p, idx) => ({
    ...p,
    _id: p._id ? String(p._id) : `patient-${idx}-${p.name || 'default'}`,
  }));

  const currentFamilyPatientId = selectedPatientByFamily[family._id] ?? selectedPatientId;
  const isAllSelected = currentFamilyPatientId === 'all';
  const activeId = isAllSelected ? null : getSelectedPatientId(family._id, patients[0]?._id);
  const activePatient = isAllSelected
    ? null
    : (patients.find((p) => String(p._id) === String(activeId)) || patients[0]);
  const targetPatient = activePatient || patients[0];

  useEffect(() => {
    if (!isAllSelected && activePatient && (!currentFamilyPatientId || String(currentFamilyPatientId) !== String(activePatient._id))) {
      setSelectedPatientId(family._id, String(activePatient._id));
      if (onPatientChange) onPatientChange(activePatient);
    }
  }, [family._id, activePatient, currentFamilyPatientId, isAllSelected, setSelectedPatientId, onPatientChange]);

  // Form state for Adding
  const [newPatient, setNewPatient] = useState({
    name: '',
    relationship: 'Mother',
    age: '68',
    gender: 'Female' as string,
    condition: '',
    location: activePatient?.location || 'Guntur, Andhra Pradesh',
    primaryLanguage: activePatient?.primaryLanguage || 'Telugu, English',
    notes: '',
  });

  // Form state for Editing
  const [editPatient, setEditPatient] = useState({
    name: '',
    relationship: '',
    age: '',
    gender: 'Other' as string,
    condition: '',
    location: '',
    primaryLanguage: '',
    notes: '',
  });

  // Add Patient Mutation
  const addMutation = useMutation({
    mutationFn: (data: typeof newPatient) =>
      addPatient(family._id, {
        name: data.name,
        relationship: data.relationship,
        age: data.age ? parseInt(data.age, 10) : undefined,
        gender: data.gender,
        condition: data.condition,
        location: data.location,
        primaryLanguage: data.primaryLanguage,
        notes: data.notes,
      }),
    onSuccess: (res) => {
      toast.success(`${res.patient.name} added as a care recipient!`);
      queryClient.invalidateQueries({ queryKey: ['family', family._id] });
      queryClient.invalidateQueries({ queryKey: ['families', 'mine'] });
      setSelectedPatientId(family._id, res.patient._id);
      setIsAddModalOpen(false);
      setNewPatient({
        name: '',
        relationship: 'Mother',
        age: '68',
        gender: 'Female',
        condition: '',
        location: 'Guntur, Andhra Pradesh',
        primaryLanguage: 'Telugu, English',
        notes: '',
      });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to add patient.'));
    },
  });

  // Update Patient Mutation
  const updateMutation = useMutation({
    mutationFn: (data: typeof editPatient) =>
      updatePatient(family._id, targetPatient._id, {
        name: data.name,
        relationship: data.relationship,
        age: data.age ? parseInt(data.age, 10) : undefined,
        gender: data.gender,
        condition: data.condition,
        location: data.location,
        primaryLanguage: data.primaryLanguage,
        notes: data.notes,
      }),
    onSuccess: () => {
      toast.success('Patient details updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['family', family._id] });
      queryClient.invalidateQueries({ queryKey: ['families', 'mine'] });
      setIsEditModalOpen(false);
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to update patient.'));
    },
  });

  // Delete Patient Mutation
  const deleteMutation = useMutation({
    mutationFn: (patientId: string) => deletePatient(family._id, patientId),
    onSuccess: () => {
      toast.success('Care recipient removed from family.');
      queryClient.invalidateQueries({ queryKey: ['family', family._id] });
      queryClient.invalidateQueries({ queryKey: ['families', 'mine'] });
      const remaining = patients.filter((p) => p._id !== targetPatient._id);
      if (remaining.length > 0) {
        setSelectedPatientId(family._id, remaining[0]._id);
      }
      setIsEditModalOpen(false);
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to remove patient.'));
    },
  });

  const handleSelectPatient = (p: Patient | null) => {
    if (!p) {
      setSelectedPatientId(family._id, 'all');
      if (onPatientChange) onPatientChange(null);
    } else {
      setSelectedPatientId(family._id, String(p._id));
      if (onPatientChange) onPatientChange(p);
    }
  };

  return (
    <div className="space-y-3">
      {/* Patient Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-surface border border-border rounded-xl p-2.5 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-text-secondary uppercase tracking-wider shrink-0">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>Care Circle</span>
          </div>

          {/* List of Patient Tabs */}
          <div className="flex items-center gap-1.5">
            {/* All Patients tab */}
            <button
              type="button"
              onClick={() => handleSelectPatient(null)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                isAllSelected
                  ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30'
                  : 'bg-background hover:bg-surface-elevated text-text-primary border border-border'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>All ({patients.length})</span>
            </button>

            {patients.map((p, idx) => {
              const patientId = p._id ? String(p._id) : `patient-tab-${idx}-${p.name}`;
              const isSelected = !isAllSelected && activePatient?._id && String(p._id) === String(activePatient._id);
              return (
                <button
                  key={patientId}
                  type="button"
                  onClick={() => handleSelectPatient(p)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-white shadow-sm ring-2 ring-primary/30'
                      : 'bg-background hover:bg-surface-elevated text-text-primary border border-border'
                  }`}
                >
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                  }`}>
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span>{p.name}</span>
                  {p.relationship && (
                    <span className={`text-[10px] font-normal uppercase px-1.5 py-0.2 rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-surface text-text-secondary border border-border/60'
                    }`}>
                      {p.relationship}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add New Patient Button */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition cursor-pointer shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add Patient</span>
          </button>
        )}
      </div>

      {/* Selected Patient Information Card */}
      {showDetailsCard && activePatient && (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface via-surface to-primary/5 p-4 sm:p-5 shadow-card transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <Heart className="h-6 w-6 text-primary fill-primary/20" />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                    Active Patient: {activePatient.relationship || 'Care Recipient'}
                  </span>
                  {activePatient.age && (
                    <span className="text-[10px] font-semibold text-text-secondary">
                      Age: {activePatient.age}
                    </span>
                  )}
                  {activePatient.gender && (
                    <span className="text-[10px] text-text-secondary">
                      • {activePatient.gender}
                    </span>
                  )}
                </div>

                <h2 className="text-lg sm:text-xl font-black text-text-primary mt-1 tracking-tight">
                  {activePatient.name}
                </h2>

                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                  {activePatient.condition ? (
                    <div className="flex items-center gap-1.5 text-text-primary bg-background/80 border border-border px-2.5 py-1 rounded-md">
                      <Activity className="h-3.5 w-3.5 text-primary" />
                      <span className="font-medium">{activePatient.condition}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-text-secondary italic">No specific condition recorded</span>
                  )}

                  {activePatient.location && (
                    <div className="flex items-center gap-1 text-text-secondary">
                      <MapPin className="h-3.5 w-3.5 text-primary/70" />
                      <span>{activePatient.location}</span>
                    </div>
                  )}

                  {activePatient.primaryLanguage && (
                    <div className="flex items-center gap-1 text-text-secondary hidden md:flex">
                      <Globe className="h-3.5 w-3.5 text-primary/70" />
                      <span>{activePatient.primaryLanguage}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Edit button */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setEditPatient({
                      name: activePatient.name || '',
                      relationship: activePatient.relationship || '',
                      age: activePatient.age ? String(activePatient.age) : '',
                      gender: activePatient.gender || 'Other',
                      condition: activePatient.condition || '',
                      location: activePatient.location || '',
                      primaryLanguage: activePatient.primaryLanguage || '',
                      notes: activePatient.notes || '',
                    });
                    setIsEditModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary shadow-sm hover:border-primary/50 hover:bg-background transition cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5 text-primary" />
                  <span>Edit {activePatient.name.split(' ')[0]}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Overview Card when 'All Patients' is selected */}
      {showDetailsCard && isAllSelected && (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface via-surface to-primary/5 p-4 sm:p-5 shadow-card transition-all">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  Combined Family Overview
                </span>
                <h2 className="text-lg sm:text-xl font-black text-text-primary mt-1 tracking-tight">
                  All {patients.length} Care Recipients
                </h2>
                <p className="text-xs text-text-secondary mt-1">
                  Viewing aggregate snapshot across {patients.map((p) => p.name).join(', ')}.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Patient Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0 duration-150">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-background/80 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Add New Patient</h3>
                  <p className="text-xs text-text-secondary">Track multiple aging parents or family members in one care circle</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newPatient.name.trim()) {
                  toast.error('Patient name is required.');
                  return;
                }
                addMutation.mutate(newPatient);
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Patient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    placeholder="e.g. Lakshmi Rao"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={newPatient.relationship}
                    onChange={(e) => setNewPatient({ ...newPatient, relationship: e.target.value })}
                    placeholder="e.g. Mother, Father"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="150"
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                    placeholder="68"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Gender
                  </label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value as 'Male' | 'Female' | 'Other' })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Primary Tracked Condition(s) / Diagnosis
                </label>
                <input
                  type="text"
                  value={newPatient.condition}
                  onChange={(e) => setNewPatient({ ...newPatient, condition: e.target.value })}
                  placeholder="e.g. Osteoarthritis, Type 2 Diabetes, Mild Hypertension"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Location / City
                  </label>
                  <input
                    type="text"
                    value={newPatient.location}
                    onChange={(e) => setNewPatient({ ...newPatient, location: e.target.value })}
                    placeholder="e.g. Guntur, Andhra Pradesh"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Primary Language
                  </label>
                  <input
                    type="text"
                    value={newPatient.primaryLanguage}
                    onChange={(e) => setNewPatient({ ...newPatient, primaryLanguage: e.target.value })}
                    placeholder="e.g. Telugu, English"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg px-3.5 py-2 text-xs font-semibold text-text-secondary hover:bg-background transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-dark transition disabled:opacity-50 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{addMutation.isPending ? 'Adding Patient...' : 'Add Patient to Care Circle'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-0 duration-150">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-background/80 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Edit3 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Edit Patient Details</h3>
                  <p className="text-xs text-text-secondary">Update health condition and personal information</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editPatient.name.trim()) {
                  toast.error('Patient name is required.');
                  return;
                }
                updateMutation.mutate(editPatient);
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Patient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPatient.name}
                    onChange={(e) => setEditPatient({ ...editPatient, name: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={editPatient.relationship}
                    onChange={(e) => setEditPatient({ ...editPatient, relationship: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="150"
                    value={editPatient.age}
                    onChange={(e) => setEditPatient({ ...editPatient, age: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Gender
                  </label>
                  <select
                    value={editPatient.gender}
                    onChange={(e) => setEditPatient({ ...editPatient, gender: e.target.value as 'Male' | 'Female' | 'Other' })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Primary Tracked Condition(s)
                </label>
                <input
                  type="text"
                  value={editPatient.condition}
                  onChange={(e) => setEditPatient({ ...editPatient, condition: e.target.value })}
                  placeholder="e.g. Cardiology recovery, Type 2 Diabetes"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Location / City
                  </label>
                  <input
                    type="text"
                    value={editPatient.location}
                    onChange={(e) => setEditPatient({ ...editPatient, location: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Primary Language
                  </label>
                  <input
                    type="text"
                    value={editPatient.primaryLanguage}
                    onChange={(e) => setEditPatient({ ...editPatient, primaryLanguage: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Emergency Notes / Allergies
                </label>
                <textarea
                  rows={2}
                  value={editPatient.notes}
                  onChange={(e) => setEditPatient({ ...editPatient, notes: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                {patients.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to remove ${targetPatient.name}?`)) {
                        deleteMutation.mutate(targetPatient._id);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs text-danger hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove Patient</span>
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="rounded-lg px-3.5 py-2 text-xs font-semibold text-text-secondary hover:bg-background transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-dark transition disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
