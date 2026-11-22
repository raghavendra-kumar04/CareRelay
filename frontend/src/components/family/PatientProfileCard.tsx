import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Edit3, MapPin, Activity, Globe, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { updateCareRecipient, getApiErrorMessage } from '../../lib/familyApi';
import type { Family } from '../../types';

interface PatientProfileCardProps {
  family: Family;
  isAdmin?: boolean;
}

export default function PatientProfileCard({ family, isAdmin = true }: PatientProfileCardProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const recipient = family.careRecipient || {
    name: 'Venkateswara Rao',
    age: 72,
    condition: 'Cardiology recovery, Type 2 Diabetes, Hypertension',
    location: 'Guntur, Andhra Pradesh',
    primaryLanguage: 'Telugu, English',
    notes: '',
  };

  const [formData, setFormData] = useState({
    name: recipient.name || '',
    age: recipient.age ? String(recipient.age) : '72',
    condition: recipient.condition || '',
    location: recipient.location || '',
    primaryLanguage: recipient.primaryLanguage || '',
    notes: recipient.notes || '',
  });

  const mutation = useMutation({
    mutationFn: (data: typeof formData) =>
      updateCareRecipient(family._id, {
        name: data.name,
        age: data.age ? parseInt(data.age, 10) : undefined,
        condition: data.condition,
        location: data.location,
        primaryLanguage: data.primaryLanguage,
        notes: data.notes,
      }),
    onSuccess: () => {
      toast.success('Patient profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['family', family._id] });
      queryClient.invalidateQueries({ queryKey: ['families', 'mine'] });
      setIsEditing(false);
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Failed to update patient profile.'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Patient name is required.');
      return;
    }
    mutation.mutate(formData);
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface via-surface to-primary/5 p-4 sm:p-5 shadow-card transition-all hover:border-primary/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Patient Overview */}
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-sm">
              <Heart className="h-6 w-6 text-primary fill-primary/20" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  Care Recipient (Patient)
                </span>
                {recipient.age && (
                  <span className="text-[10px] font-semibold text-text-secondary">
                    Age: {recipient.age}
                  </span>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-black text-text-primary mt-1 tracking-tight">
                {recipient.name}
              </h2>

              {/* Conditions / Medical Tags */}
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                {recipient.condition && (
                  <div className="flex items-center gap-1.5 text-text-primary bg-background/80 border border-border px-2.5 py-1 rounded-md">
                    <Activity className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium">{recipient.condition}</span>
                  </div>
                )}

                {recipient.location && (
                  <div className="flex items-center gap-1 text-text-secondary">
                    <MapPin className="h-3.5 w-3.5 text-primary/70" />
                    <span>{recipient.location}</span>
                  </div>
                )}

                {recipient.primaryLanguage && (
                  <div className="flex items-center gap-1 text-text-secondary hidden md:flex">
                    <Globe className="h-3.5 w-3.5 text-primary/70" />
                    <span>{recipient.primaryLanguage}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    name: recipient.name || '',
                    age: recipient.age ? String(recipient.age) : '',
                    condition: recipient.condition || '',
                    location: recipient.location || '',
                    primaryLanguage: recipient.primaryLanguage || '',
                    notes: recipient.notes || '',
                  });
                  setIsEditing(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-primary shadow-sm hover:border-primary/50 hover:bg-background transition cursor-pointer"
              >
                <Edit3 className="h-3.5 w-3.5 text-primary" />
                <span>Edit Patient</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit Patient Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border bg-background/80 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Heart className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Edit Patient Profile</h3>
                  <p className="text-xs text-text-secondary">Configure care recipient details and tracked health conditions</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-lg p-1.5 text-text-secondary hover:bg-surface hover:text-text-primary transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Patient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Venkateswara Rao"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="150"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="72"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Primary Medical Condition(s) / Diagnosis
                </label>
                <input
                  type="text"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  placeholder="e.g. Cardiology recovery, Type 2 Diabetes, Hypertension"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[10px] text-text-secondary mt-1">
                  Displayed on the Dashboard and Clinical Doctor Visit Sheet for physician context.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Location / City
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Guntur, Andhra Pradesh"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-text-primary mb-1">
                    Primary Language(s)
                  </label>
                  <input
                    type="text"
                    value={formData.primaryLanguage}
                    onChange={(e) => setFormData({ ...formData, primaryLanguage: e.target.value })}
                    placeholder="e.g. Telugu, English"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Emergency Notes / Allergies (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Allergic to Sulfa drugs, Mobility assistance needed..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg px-3.5 py-2 text-xs font-semibold text-text-secondary hover:bg-background transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-dark transition disabled:opacity-50 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{mutation.isPending ? 'Saving...' : 'Save Patient Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
