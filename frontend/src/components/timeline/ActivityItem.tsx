import { format, formatDistanceToNow } from 'date-fns';
import type { ActivityItemData } from '../../types';

interface ActivityItemProps {
  activity: ActivityItemData;
  isNew?: boolean;
}

const AVATAR_COLORS = ['#5C8A6E', '#D4830A', '#2E7D52', '#6B7B7A', '#C0392B'];

const ACTION_VERBS: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  reassigned: 'reassigned',
  status_changed: 'changed the status of',
  completed: 'completed',
  note_added: 'added a note to',
  deleted: 'deleted',
};

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

function pickAvatarColor(actorId: string): string {
  let hash = 0;
  for (let i = 0; i < actorId.length; i += 1) {
    hash = (hash * 31 + actorId.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function ActivityItem({ activity, isNew = false }: ActivityItemProps) {
  const verb = ACTION_VERBS[activity.action] ?? 'updated';
  const createdAt = new Date(activity.createdAt);
  const entityBadgeClass =
    activity.entityType === 'appointment'
      ? 'border-warning/30 bg-warning/10 text-warning font-medium'
      : 'border-primary/30 bg-primary/10 text-primary font-medium';

  const assignedByName =
    typeof activity.assignedBy === 'object' && activity.assignedBy?.name
      ? activity.assignedBy.name
      : activity.action === 'created'
        ? activity.actorName
        : null;

  const assignedByColor =
    typeof activity.assignedBy === 'object' && activity.assignedBy?.avatarColor
      ? activity.assignedBy.avatarColor
      : '#5C8A6E';

  const assignedToName =
    typeof activity.assignedTo === 'object' && activity.assignedTo?.name
      ? activity.assignedTo.name
      : null;

  const assignedToColor =
    typeof activity.assignedTo === 'object' && activity.assignedTo?.avatarColor
      ? activity.assignedTo.avatarColor
      : '#D4830A';

  const completionNote =
    typeof activity.meta?.completionNote === 'string'
      ? activity.meta.completionNote
      : null;

  return (
    <div
      className={`flex gap-3 rounded-card bg-surface border border-border p-4 shadow-card transition-all${
        isNew ? ' ring-2 ring-primary/40' : ''
      }`}
    >
      {/* Actor Avatar */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-xs"
        style={{ backgroundColor: pickAvatarColor(activity.actorId) }}
        aria-hidden="true"
      >
        {getInitials(activity.actorName)}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Main Activity Narrative */}
        <p className="text-sm text-text-primary leading-snug">
          <span className="font-semibold text-text-primary">{activity.actorName}</span>{' '}
          <span className="text-text-secondary">{verb}</span>{' '}
          <span className="font-semibold text-text-primary">"{activity.entityTitle}"</span>
        </p>

        {/* Completion note if present */}
        {completionNote && (
          <p className="rounded-md border border-success/20 bg-success/5 px-2.5 py-1 text-xs italic text-success">
            "{completionNote}"
          </p>
        )}

        {/* Assignment Transparency: Assigned by whom & Assigned to whom */}
        {(assignedByName || assignedToName) && (
          <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
            {assignedByName && (
              <span
                className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background/80 px-2 py-0.5 text-[11px] text-text-secondary shadow-2xs"
                title={`Assigned by ${assignedByName}`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
                  Assigned by:
                </span>
                <span
                  style={{ backgroundColor: assignedByColor }}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                >
                  {getInitials(assignedByName)}
                </span>
                <span className="font-medium text-text-primary">{assignedByName}</span>
              </span>
            )}

            {assignedToName && (
              <span
                className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] text-primary shadow-2xs"
                title={`Assigned to ${assignedToName}`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Assigned to:
                </span>
                <span
                  style={{ backgroundColor: assignedToColor }}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                >
                  {getInitials(assignedToName)}
                </span>
                <span className="font-semibold text-text-primary">{assignedToName}</span>
              </span>
            )}
          </div>
        )}

        {/* Meta / Timestamp Footer */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary pt-0.5">
          <span
            className={`rounded-pill border px-2 py-0.5 text-[11px] uppercase tracking-wider font-semibold ${entityBadgeClass}`}
          >
            {activity.entityType}
          </span>
          {activity.patientName && (
            <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              Patient: {activity.patientName}
            </span>
          )}
          <span className="text-text-secondary/50">•</span>
          <time dateTime={activity.createdAt} title={format(createdAt, 'PPp')} className="text-xs text-text-secondary">
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </time>
        </div>
      </div>
    </div>
  );
}

export default ActivityItem;
