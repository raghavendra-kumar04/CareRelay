import { format } from 'date-fns';
import { Calendar, MapPin, Stethoscope } from 'lucide-react';
import type { Appointment, AppointmentStatus } from '../../types';

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit?: () => void;
  onDelete?: () => void;
  canDelete: boolean;
}

const STATUS_BADGES: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-primary/10 text-primary border-primary/20' },
  completed: { label: 'Completed', className: 'bg-success/10 text-success border-success/20' },
  cancelled: { label: 'Cancelled', className: 'bg-error/10 text-error border-error/20' },
  rescheduled: { label: 'Rescheduled', className: 'bg-warning/10 text-warning border-warning/20' },
};

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

export default function AppointmentCard({
  appointment,
  onEdit,
  onDelete,
  canDelete,
}: AppointmentCardProps) {
  const badge = STATUS_BADGES[appointment.status] || STATUS_BADGES.scheduled;
  const apptDate = new Date(appointment.dateTime);
  const formattedDate = format(apptDate, 'EEEE, MMM d, yyyy');
  const formattedTime = format(apptDate, 'h:mm a');

  return (
    <article className="flex flex-col justify-between rounded-card border border-border bg-surface p-4 shadow-card transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-text-primary line-clamp-1">
              {appointment.title}
            </h3>
            {appointment.specialty && (
              <span className="text-xs font-medium text-text-secondary">
                {appointment.specialty}
              </span>
            )}
          </div>
          <span className={`shrink-0 rounded-pill border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 text-sm text-text-secondary">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-primary" />
            <span className="font-medium text-text-primary">{formattedDate}</span>
            <span className="text-xs text-text-secondary">at {formattedTime}</span>
          </div>

          {(appointment.doctorName || appointment.clinic) && (
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 shrink-0 text-text-secondary" />
              <span className="truncate">
                {appointment.doctorName ? `Dr. ${appointment.doctorName}` : ''}
                {appointment.doctorName && appointment.clinic ? ' • ' : ''}
                {appointment.clinic || ''}
              </span>
            </div>
          )}

          {appointment.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-text-secondary" />
              <span className="truncate">{appointment.location}</span>
            </div>
          )}
        </div>

        {appointment.notes && (
          <p className="mt-1 rounded bg-background p-2 text-xs text-text-secondary line-clamp-2">
            {appointment.notes}
          </p>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-2">
          {appointment.assignedTo ? (
            <>
              <span
                style={{ backgroundColor: appointment.assignedTo.avatarColor || '#5C8A6E' }}
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white"
              >
                {initialsOf(appointment.assignedTo.name)}
              </span>
              <span className="text-xs text-text-secondary">
                {appointment.assignedTo.name}
              </span>
            </>
          ) : (
            <span className="text-xs text-text-secondary">Unassigned</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="text-xs font-medium text-primary hover:text-primary-dark"
            >
              Edit
            </button>
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-xs font-medium text-error hover:underline"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
