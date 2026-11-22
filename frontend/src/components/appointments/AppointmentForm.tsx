import { useEffect, useState } from 'react';
import type { Appointment, AppointmentInput, AppointmentStatus, Patient } from '../../types';

interface MemberOption {
  _id: string;
  name: string;
}

interface AppointmentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AppointmentInput) => void;
  initialAppointment?: Appointment | null;
  members: MemberOption[];
  patients?: Patient[];
  defaultPatientId?: string;
  isSubmitting?: boolean;
}

const INPUT_CLASS =
  'w-full rounded-lg border border-border/80 bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-text-secondary/50 transition-all duration-200 hover:border-primary/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15';

export default function AppointmentForm({
  open,
  onClose,
  onSubmit,
  initialAppointment,
  members,
  patients,
  defaultPatientId,
  isSubmitting,
}: AppointmentFormProps) {
  const [title, setTitle] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [clinic, setClinic] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [patientId, setPatientId] = useState(defaultPatientId || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialAppointment) {
      setTitle(initialAppointment.title);
      setDoctorName(initialAppointment.doctorName || '');
      setClinic(initialAppointment.clinic || '');
      setSpecialty(initialAppointment.specialty || '');
      setPatientId(initialAppointment.patientId || defaultPatientId || '');
      const d = new Date(initialAppointment.dateTime);
      setDate(d.toISOString().split('T')[0]);
      setTime(d.toTimeString().slice(0, 5));
      setLocation(initialAppointment.location || '');
      setAssignedTo(initialAppointment.assignedTo?._id || '');
      setStatus(initialAppointment.status || 'scheduled');
      setNotes(initialAppointment.notes || '');
    } else {
      setTitle('');
      setDoctorName('');
      setClinic('');
      setSpecialty('');
      setPatientId(defaultPatientId || '');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
      setTime('10:00');
      setLocation('');
      setAssignedTo(members[0]?._id || '');
      setStatus('scheduled');
      setNotes('');
    }
  }, [initialAppointment, open, members, defaultPatientId]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date || !time || !assignedTo) return;

    const fullDateTime = new Date(`${date}T${time}:00`);
    const selectedP = (patients || []).find((p) => String(p._id) === String(patientId));

    onSubmit({
      title: title.trim(),
      doctorName: doctorName.trim() || undefined,
      clinic: clinic.trim() || undefined,
      specialty: specialty.trim() || undefined,
      dateTime: fullDateTime.toISOString(),
      location: location.trim() || undefined,
      assignedTo,
      patientId: patientId || undefined,
      patientName: selectedP?.name || undefined,
      status,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-card border border-border bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-lg font-semibold text-text-primary">
            {initialAppointment ? 'Edit Appointment' : 'Schedule New Appointment'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-xl font-bold leading-none"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Appointment Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Cardiology follow-up"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          {patients && patients.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Care Recipient / Patient
              </label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">General Family Visit (No specific patient)</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.relationship ? `(${p.relationship})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Doctor Name
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. K Reddy"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Specialty
              </label>
              <input
                type="text"
                placeholder="e.g. Cardiology"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Hospital / Clinic
              </label>
              <input
                type="text"
                placeholder="e.g. KIMS Guntur"
                value={clinic}
                onChange={(e) => setClinic(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. Main Hospital Road"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Time *
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Assigned Family Member *
              </label>
              <select
                required
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Select member</option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                className={INPUT_CLASS}
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Notes & Preparations
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Bring fasting blood sugar report and ECG"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div className="mt-2 flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-input border border-border px-4 py-2 text-sm text-text-secondary hover:bg-background"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-input bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialAppointment ? 'Save Changes' : 'Schedule Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
