import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit2,
  Lock,
  Play,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import type { Task, TaskPriority, TaskStatus } from '../../types';

interface TaskCardProps {
  task: Task;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange: (status: TaskStatus, completionNote?: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  canChangeStatus: boolean;
}

const PRIORITY_CLASSES: Record<TaskPriority, string> = {
  low: 'border border-border text-text-secondary',
  medium: 'bg-primary/10 text-primary border border-primary/20',
  high: 'bg-warning/15 text-warning border border-warning/30 font-medium',
  urgent: 'bg-error/15 text-error border border-error/30 font-semibold',
};

const CATEGORY_LABELS: Record<string, string> = {
  appointment: 'Appointment',
  medication: 'Medication',
  document: 'Medical Record',
  transport: 'Transport',
  communication: 'Family Sync',
  other: 'Care Task',
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

export default function TaskCard({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  canEdit,
  canDelete,
  canChangeStatus,
}: TaskCardProps) {
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [completionNote, setCompletionNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const dueLabel = task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No due date';
  const createdByName =
    typeof task.createdBy === 'object' && task.createdBy?.name
      ? task.createdBy.name
      : 'Family Member';
  const createdByColor =
    typeof task.createdBy === 'object' && task.createdBy?.avatarColor
      ? task.createdBy.avatarColor
      : '#6B7B7A';

  const handleStartTask = () => {
    onStatusChange('in-progress');
  };

  const handleRevertToPending = () => {
    onStatusChange('pending');
  };

  const handleReopen = () => {
    onStatusChange('in-progress');
  };

  const handleConfirmCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    const note = completionNote.trim();
    if (note.length < 5) {
      setNoteError('Please enter at least 5 characters explaining what was completed.');
      return;
    }
    setNoteError('');
    setCompleteModalOpen(false);
    onStatusChange('completed', note);
  };

  return (
    <article className="flex flex-col justify-between rounded-card border border-border bg-surface p-4 shadow-card hover:shadow-md transition">
      <div className="flex flex-col gap-3">
        {/* Header: Title, Category, Priority */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-text-secondary tracking-wide uppercase">
              {CATEGORY_LABELS[task.category] || 'Care Task'}
            </span>
            <h3 className="text-base font-semibold text-text-primary mt-0.5 line-clamp-2">
              {task.title}
            </h3>
          </div>
          <span className={`shrink-0 rounded-pill px-2.5 py-0.5 text-xs capitalize ${PRIORITY_CLASSES[task.priority]}`}>
            {task.priority}
          </span>
        </div>

        {task.description && (
          <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Overdue alert */}
        {task.isOverdue && (
          <div className="flex items-center gap-1.5 rounded-pill bg-error/10 px-2.5 py-1 text-xs font-medium text-error border border-error/20 w-fit">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Overdue (was due {dueLabel})</span>
          </div>
        )}

        {/* Transparency Section: Mention who created & who is assigned */}
        <div className="flex flex-col gap-2 rounded-card bg-background/80 p-3 border border-border/60 text-xs">
          {/* Assigned To */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-text-secondary text-[11px] font-medium">Assigned to:</span>
            {task.assignedTo ? (
              <div className="flex items-center gap-1.5">
                <span
                  style={{ backgroundColor: task.assignedTo.avatarColor || '#5C8A6E' }}
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-xs"
                >
                  {initialsOf(task.assignedTo.name)}
                </span>
                <span className="font-semibold text-text-primary">{task.assignedTo.name}</span>
              </div>
            ) : (
              <span className="text-text-secondary italic">Unassigned</span>
            )}
          </div>

          {/* Created By */}
          <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-1.5">
            <span className="text-text-secondary text-[11px]">Created by:</span>
            <div className="flex items-center gap-1.5">
              <span
                style={{ backgroundColor: createdByColor }}
                className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
              >
                {initialsOf(createdByName)}
              </span>
              <span className="text-text-secondary font-medium">{createdByName}</span>
              {task.createdAt && (
                <span className="text-[10px] text-text-secondary/70">
                  • {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Due date info (if not overdue) */}
        {!task.isOverdue && (
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Clock className="h-3.5 w-3.5 text-text-secondary/70" />
            <span>Due {dueLabel}</span>
          </div>
        )}

        {/* Completed note display */}
        {task.status === 'completed' && task.completionNote && (
          <div className="rounded-card bg-success/5 border border-success/20 p-2.5 text-xs">
            <span className="font-semibold text-success block mb-0.5">Completion Note:</span>
            <p className="text-text-primary italic">"{task.completionNote}"</p>
          </div>
        )}
      </div>

      {/* Footer: Quick Status Actions & Creator Permissions */}
      <div className="mt-4 border-t border-border pt-3 flex flex-col gap-2.5">
        {/* Quick Status Stepper */}
        <div className="flex items-center justify-between gap-2">
          {/* Status Label */}
          <div className="flex items-center gap-1.5">
            {task.status === 'completed' ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span>Completed</span>
              </span>
            ) : task.status === 'in-progress' ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span>In Progress</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary">
                <span className="h-2 w-2 rounded-full bg-text-secondary/60" />
                <span>Pending</span>
              </span>
            )}
          </div>

          {/* Quick Action Buttons */}
          {canChangeStatus && (
            <div className="flex items-center gap-1.5">
              {task.status === 'pending' && (
                <button
                  type="button"
                  onClick={handleStartTask}
                  className="flex items-center gap-1 rounded-pill bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition"
                  title="Move status to In Progress with 1 click"
                >
                  <Play className="h-3 w-3 fill-current" />
                  <span>Start Task</span>
                </button>
              )}

              {task.status === 'in-progress' && (
                <>
                  <button
                    type="button"
                    onClick={handleRevertToPending}
                    className="rounded-pill border border-border px-2 py-1 text-[11px] text-text-secondary hover:bg-background"
                    title="Move back to Pending"
                  >
                    <RotateCcw className="h-3 w-3 inline mr-0.5" />
                    <span>Pending</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCompletionNote('');
                      setNoteError('');
                      setCompleteModalOpen(true);
                    }}
                    className="flex items-center gap-1 rounded-pill bg-success px-3 py-1 text-xs font-semibold text-white hover:bg-success/90 transition shadow-xs"
                    title="Mark task as completed"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Complete</span>
                  </button>
                </>
              )}

              {task.status === 'completed' && canEdit && (
                <button
                  type="button"
                  onClick={handleReopen}
                  className="rounded-pill border border-border px-2 py-1 text-[11px] text-text-secondary hover:bg-background"
                  title="Reopen task to In Progress"
                >
                  <RotateCcw className="h-3 w-3 inline mr-0.5" />
                  <span>Reopen</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Edit & Delete Controls (Restricted to Creator & Admin only) */}
        <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
          {canEdit ? (
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="flex items-center gap-1 text-primary hover:text-primary-dark font-medium"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit Details</span>
                </button>
              )}
              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex items-center gap-1 text-error hover:underline"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-text-secondary/70">
              <Lock className="h-3 w-3" />
              <span>Details editable by {createdByName} only</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Completion Note Modal */}
      {completeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-card border border-border bg-surface p-5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-success font-semibold text-sm mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span>Complete Task</span>
            </div>
            <h4 className="text-sm font-bold text-text-primary line-clamp-1">{task.title}</h4>
            <p className="text-xs text-text-secondary mt-1">
              Add a brief completion note for your family (min. 5 characters).
            </p>

            <form onSubmit={handleConfirmCompletion} className="mt-3 flex flex-col gap-3">
              <div>
                <textarea
                  rows={3}
                  required
                  autoFocus
                  placeholder="e.g. Picked up 2 vials from MedPlus pharmacy."
                  value={completionNote}
                  onChange={(e) => {
                    setCompletionNote(e.target.value);
                    if (noteError) setNoteError('');
                  }}
                  className="w-full rounded-lg border border-border/80 bg-surface p-3 text-xs text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-text-secondary/50 transition-all duration-200 hover:border-primary/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
                {noteError && <p className="text-[11px] text-error mt-0.5">{noteError}</p>}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCompleteModalOpen(false)}
                  className="rounded-input border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-background"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-input bg-success px-4 py-1.5 text-xs font-semibold text-white hover:bg-success/90 shadow-sm"
                >
                  Save & Complete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </article>
  );
}
