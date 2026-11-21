import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Calendar, Filter, Plus } from 'lucide-react';
import AppointmentCard from '../components/appointments/AppointmentCard';
import AppointmentForm from '../components/appointments/AppointmentForm';
import {
  useAppointments,
  useCreateAppointment,
  useDeleteAppointment,
  useUpdateAppointment,
} from '../hooks/useAppointments';
import { getApiErrorMessage, getFamily, getMembers } from '../lib/familyApi';
import type { Appointment, AppointmentInput, AppointmentStatus } from '../types';

export default function AppointmentsPage() {
  const params = useParams<{ fid: string }>();
  const fid = params.fid ?? '';

  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>('');
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const membersQuery = useQuery({
    queryKey: ['family-members', fid],
    queryFn: () => getMembers(fid),
    enabled: Boolean(fid),
  });

  const familyQuery = useQuery({
    queryKey: ['family', fid],
    queryFn: () => getFamily(fid),
    enabled: Boolean(fid),
  });

  const members = (membersQuery.data?.members ?? []).flatMap((m) =>
    m.user ? [{ _id: m.user._id, name: m.user.name }] : []
  );
  const canDelete = familyQuery.data?.role === 'admin';

  const filters = {
    page,
    limit: 20,
    status: statusFilter || undefined,
    assignedTo: assignedTo || undefined,
    upcoming: upcomingOnly || undefined,
  };

  const appointmentsQuery = useAppointments(fid, filters);
  const createMutation = useCreateAppointment(fid);
  const updateMutation = useUpdateAppointment(fid);
  const deleteMutation = useDeleteAppointment(fid);

  const appointments = appointmentsQuery.data?.appointments ?? [];
  const pagination = appointmentsQuery.data?.pagination;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / pagination.limit)) : 1;

  function handleOpenCreate() {
    setEditingAppointment(null);
    setFormOpen(true);
  }

  function handleOpenEdit(appt: Appointment) {
    setEditingAppointment(appt);
    setFormOpen(true);
  }

  function handleSubmit(data: AppointmentInput) {
    if (editingAppointment) {
      updateMutation.mutate(
        { id: editingAppointment._id, data },
        { onSuccess: () => setFormOpen(false) }
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => setFormOpen(false) });
    }
  }

  function handleDelete(appt: Appointment) {
    if (window.confirm(`Delete appointment "${appt.title}"?`)) {
      deleteMutation.mutate(appt._id);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Appointments & Doctor Visits</h1>
          <p className="text-sm text-text-secondary">
            Shared schedule for consultations, diagnostic tests, and follow-ups.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          disabled={!fid}
          className="flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New Appointment</span>
        </button>
      </header>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-card">
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <Filter className="h-4 w-4 text-text-secondary" />
          Status:
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as AppointmentStatus | '');
              setPage(1);
            }}
            className="rounded-lg border border-border/80 bg-surface px-3 py-1.5 text-sm text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:border-primary/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
          >
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-text-secondary">
          Responsible Member:
          <select
            value={assignedTo}
            onChange={(e) => {
              setAssignedTo(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-border/80 bg-surface px-3 py-1.5 text-sm text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:border-primary/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
          >
            <option value="">All family members</option>
            {members.map((m) => (
              <option key={m._id} value={m._id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          aria-pressed={upcomingOnly}
          onClick={() => {
            setUpcomingOnly(!upcomingOnly);
            setPage(1);
          }}
          className={`rounded-pill border px-3 py-1.5 text-sm transition-colors ${
            upcomingOnly
              ? 'border-primary bg-primary/10 text-primary font-medium'
              : 'border-border text-text-secondary hover:bg-background'
          }`}
        >
          Upcoming only
        </button>
      </div>

      {/* Content */}
      {appointmentsQuery.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-card border border-border bg-surface" />
          ))}
        </div>
      ) : appointmentsQuery.isError ? (
        <div className="rounded-card border border-error/30 bg-error/5 p-4 text-sm text-error">
          {getApiErrorMessage(appointmentsQuery.error, 'Could not load appointments.')}
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border bg-surface p-12 text-center">
          <Calendar className="h-10 w-10 text-text-secondary/50" />
          <p className="text-base font-medium text-text-primary">No appointments scheduled</p>
          <p className="text-sm text-text-secondary">
            Schedule hospital visits, consultations, or tests so all family members stay aligned.
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="mt-2 rounded-input bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark"
          >
            + Schedule First Appointment
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {appointments.map((appt) => (
              <AppointmentCard
                key={appt._id}
                appointment={appt}
                onEdit={() => handleOpenEdit(appt)}
                onDelete={() => handleDelete(appt)}
                canDelete={canDelete}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-input border border-border px-3 py-1.5 text-sm text-text-primary disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-text-secondary">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-input border border-border px-3 py-1.5 text-sm text-text-primary disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      <AppointmentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        initialAppointment={editingAppointment}
        members={members}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
