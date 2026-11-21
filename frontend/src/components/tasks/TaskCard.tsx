import { format } from 'date-fns';
import type { Task, TaskPriority, TaskStatus } from '../../types';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  canDelete: boolean;
}

const PRIORITY_CLASSES: Record<TaskPriority, string> = {
  low: 'border border-border text-text-secondary',
  medium: 'bg-primary/10 text-primary',
  high: 'bg-warning/10 text-warning',
  urgent: 'bg-error/10 text-error',
};

const STATUS_META: Record<TaskStatus, { label: string; dot: string; text: string }> = {
  pending: { label: 'Pending', dot: 'bg-text-secondary', text: 'text-text-secondary' },
  'in-progress': { label: 'In progress', dot: 'bg-primary', text: 'text-primary' },
  completed: { label: 'Completed', dot: 'bg-success', text: 'text-success' },
};

const FOCUS_RING = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';

function initialsOf(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return letters || '?';
}

export default function TaskCard({ task, onClick, onEdit, onDelete, canDelete }: TaskCardProps) {
  const status = STATUS_META[task.status];
  const dueLabel = task.dueDate ? format(new Date(task.dueDate), 'PP') : 'No due date';

  return (
    <article className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onClick}
          className={`min-w-0 rounded-input text-left text-base font-medium text-text-primary hover:text-primary ${FOCUS_RING}`}
        >
          {task.title}
        </button>
        <span
          className={`shrink-0 rounded-pill px-2 py-0.5 text-xs capitalize ${PRIORITY_CLASSES[task.priority]}`}
        >
          {task.priority}
        </span>
      </div>

      {task.isOverdue && (
        <div>
          <span className="rounded-pill border border-error px-2 py-0.5 text-xs font-medium text-error">
            Overdue
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-secondary">
        <span className="flex items-center gap-2">
          {task.assignedTo ? (
            <>
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: task.assignedTo.avatarColor }}
              >
                {initialsOf(task.assignedTo.name)}
              </span>
              <span>{task.assignedTo.name}</span>
            </>
          ) : (
            <span>Unassigned</span>
          )}
        </span>
        <span>{dueLabel}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className={`flex items-center gap-1.5 text-sm ${status.text}`}>
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${status.dot}`} />
          {status.label}
        </span>

        <div className="flex gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className={`rounded-input border border-border px-3 py-1 text-sm text-text-primary hover:bg-background ${FOCUS_RING}`}
            >
              Edit
            </button>
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className={`rounded-input border border-error px-3 py-1 text-sm text-error hover:bg-error/10 ${FOCUS_RING}`}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
