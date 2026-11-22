import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Lock,
  MapPin,
  RotateCcw,
  Stethoscope,
  Trash2,
  XCircle,
} from 'lucide-react';
import type { Appointment, AppointmentStatus } from '../../types';

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange: (status: AppointmentStatus) => void;
  canEdit: boolean;
  canDelete: boolean;
  canChangeStatus: boolean;
}

const STATUS_BADGES: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled: { label: 'Scheduled', className: 'bg-primary/10 text-primary border-primary/20' },
  completed: { label: 'Completed', className: 'bg-success/15 text-success border-success/30 font-semibold' },
  cancelled: { label: 'Cancelled', className: 'bg-error/15 text-error border-error/30' },
  rescheduled: { label: 'Rescheduled', className: 'bg-warning/15 text-warning border-warning/30 font-medium' },
};

function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

export default function AppointmentCard({
  appointment,
  onEdit,
  onDelete,
  onStatusChange,
  canEdit,
  canDelete,
  canChangeStatus,
}: AppointmentCardProps) {
  const badge = STATUS_BADGES[appointment.status] || STATUS_BADGES.scheduled;
  const apptDate = new Date(appointment.dateTime);
  const formattedDate = format(apptDate, 'EEEE, MMM d, yyyy');
  const formattedTime = format(apptDate, 'h:mm a');

  const createdByName =
    typeof appointment.createdBy === 'object' && appointment.createdBy?.name
      ? appointment.createdBy.name
      : 'Family Member';
  const createdByColor =
    typeof appointment.createdBy === 'object' && appointment.createdBy?.avatarColor
      ? appointment.createdBy.avatarColor
      : '#6B7B7A';

  return (
    <article className="flex flex-col justify-between rounded-card border border-border bg-surface p-4 shadow-card transition-all hover:shadow-md">
      <div className="flex flex-col gap-3">
        {/* Title, Specialty, Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-base font-semibold text-text-primary line-clamp-1">
                {appointment.title}
              </h3>
              {appointment.patientName && (
                <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20">
                  {appointment.patientName}
                </span>
              )}
            </div>
            {appointment.specialty && (
              <span className="text-xs font-medium text-text-secondary">
                {appointment.specialty}
              </span>
            )}
          </div>
          <span className={`shrink-0 rounded-pill border px-2.5 py-0.5 text-xs ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        {/* Date, Doctor, Clinic, Location */}
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

        {/* Notes */}
        {appointment.notes && (
          <p className="mt-0.5 rounded-md bg-background/80 p-2 text-xs text-text-secondary line-clamp-2 border border-border/50">
            {appointment.notes}
          </p>
        )}

        {/* Care Coordination Block: Assigned to & Created by */}
        <div className="rounded-lg border border-border/80 bg-background/50 p-2.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary mb-1.5">
            Care Coordination
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Assigned to */}
            <div className="flex items-center gap-2 min-w-0">
              {appointment.assignedTo ? (
                <>
                  <span
                    style={{ backgroundColor: appointment.assignedTo.avatarColor || '#5C8A6E' }}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs"
                    title={`Assigned to ${appointment.assignedTo.name}`}
                  >
                    {initialsOf(appointment.assignedTo.name)}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-text-secondary leading-none">Assigned to</span>
                    <span className="truncate font-medium text-text-primary text-xs mt-0.5">
                      {appointment.assignedTo.name}
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-xs text-text-secondary italic">Unassigned</span>
              )}
            </div>

            {/* Created by */}
            <div className="flex items-center gap-2 min-w-0">
              <span
                style={{ backgroundColor: createdByColor }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs"
                title={`Created by ${createdByName}`}
              >
                {initialsOf(createdByName)}
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-text-secondary leading-none">Created by</span>
                <span className="truncate font-medium text-text-primary text-xs mt-0.5">
                  {createdByName}{' '}
                  {appointment.createdAt && (
                    <span className="text-[10px] font-normal text-text-secondary">
                      • {formatDistanceToNow(new Date(appointment.createdAt), { addSuffix: true })}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick 1-Click Status Controls */}
        <div className="pt-1">
          {appointment.status === 'scheduled' && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={!canChangeStatus}
                onClick={() => onStatusChange('completed')}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-success/90 transition disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Mark Completed</span>
              </button>
              <button
                type="button"
                disabled={!canChangeStatus}
                onClick={() => onStatusChange('rescheduled')}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:border-warning hover:text-warning transition disabled:opacity-50"
                title="Mark as rescheduled"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>Reschedule</span>
              </button>
              <button
                type="button"
                disabled={!canChangeStatus}
                onClick={() => onStatusChange('cancelled')}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs font-medium text-text-secondary hover:border-error hover:text-error transition disabled:opacity-50"
                title="Cancel appointment"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {appointment.status === 'completed' && (
            <div className="flex items-center justify-between rounded-lg bg-success/10 px-3 py-2 text-xs font-medium text-success border border-success/20">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>Consultation completed</span>
              </div>
              {canChangeStatus && (
                <button
                  type="button"
                  onClick={() => onStatusChange('scheduled')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-primary transition"
                  title="Revert back to scheduled"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reopen</span>
                </button>
              )}
            </div>
          )}

          {appointment.status === 'rescheduled' && (
            <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-lg bg-warning/10 p-2 text-xs text-warning border border-warning/20">
              <div className="flex items-center gap-1 font-medium">
                <Clock className="h-3.5 w-3.5" />
                <span>Visit rescheduled</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!canChangeStatus}
                  onClick={() => onStatusChange('completed')}
                  className="rounded-md bg-success px-2 py-1 text-[11px] font-semibold text-white hover:bg-success/90 transition disabled:opacity-50"
                >
                  Mark Completed
                </button>
                <button
                  type="button"
                  disabled={!canChangeStatus}
                  onClick={() => onStatusChange('scheduled')}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-medium text-text-secondary hover:text-text-primary transition disabled:opacity-50"
                >
                  Set Scheduled
                </button>
              </div>
            </div>
          )}

          {appointment.status === 'cancelled' && (
            <div className="flex items-center justify-between rounded-lg bg-error/10 px-3 py-2 text-xs font-medium text-error border border-error/20">
              <div className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4" />
                <span>Appointment cancelled</span>
              </div>
              {canChangeStatus && (
                <button
                  type="button"
                  onClick={() => onStatusChange('scheduled')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-primary transition"
                  title="Restore appointment"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Restore</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer: Confidentiality & Creator Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <div className="text-[11px] text-text-secondary">
          {!canEdit && (
            <span className="flex items-center gap-1 text-text-secondary/70 italic" title="Only the creator or admin can edit details">
              <Lock className="h-3 w-3" />
              <span>Details editable by {createdByName} only</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit</span>
            </button>
          )}

          {canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-error hover:bg-error/10 transition"
            >
              <Trash2 className="h-3 w-3" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
