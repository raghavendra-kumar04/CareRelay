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
    activity.entityType === 'appointment' ? 'text-warning' : 'text-primary';

  return (
    <div
      className={`flex gap-3 rounded-card bg-surface border border-border p-4 shadow-card${
        isNew ? ' ring-2 ring-primary/30' : ''
      }`}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundColor: pickAvatarColor(activity.actorId) }}
        aria-hidden="true"
      >
        {getInitials(activity.actorName)}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm text-text-primary">
          <span className="font-semibold">{activity.actorName}</span> {verb}{' '}
          <span className="font-medium">{activity.entityTitle}</span>
        </p>

        <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
          <span
            className={`rounded-pill bg-background border border-border px-2 py-0.5 text-xs capitalize ${entityBadgeClass}`}
          >
            {activity.entityType}
          </span>
          <time dateTime={activity.createdAt} title={format(createdAt, 'PPp')}>
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </time>
        </div>
      </div>
    </div>
  );
}

export default ActivityItem;
