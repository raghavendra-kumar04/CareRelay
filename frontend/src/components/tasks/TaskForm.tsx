import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { format } from 'date-fns';
import type { Patient, Task, TaskCategory, TaskInput, TaskPriority, TaskStatus, TaskUpdateInput } from '../../types';

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  initialTask?: Task | null;
  members: { _id: string; name: string }[];
  patients?: Patient[];
  defaultPatientId?: string;
  isSubmitting: boolean;
  onSubmit: (input: TaskInput | TaskUpdateInput) => void;
  canEditStatus?: boolean;
}

interface FormState {
  title: string;
  description: string;
  category: TaskCategory;
  priority: TaskPriority;
  assignedTo: string;
  patientId: string;
  dueDate: string;
  status: TaskStatus;
  completionNote: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 1000;
const COMPLETION_NOTE_MIN = 5;

const CATEGORY_OPTIONS: { value: TaskCategory; label: string }[] = [
  { value: 'appointment', label: 'Appointment' },
  { value: 'medication', label: 'Medication' },
  { value: 'document', label: 'Document' },
  { value: 'transport', label: 'Transport' },
  { value: 'communication', label: 'Communication' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
];

const INPUT_CLASS =
  'w-full rounded-lg border border-border/80 bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-text-secondary/50 transition-all duration-200 hover:border-primary/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15';
const LABEL_CLASS = 'flex flex-col gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-secondary';

function toDateInputValue(iso: string): string {
  return format(new Date(iso), 'yyyy-MM-dd');
}

function toIsoOrNull(dateValue: string): string | null {
  return dateValue ? new Date(`${dateValue}T00:00:00`).toISOString() : null;
}

function toFormState(task: Task | null | undefined, defaultPatientId?: string): FormState {
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    category: task?.category ?? 'other',
    priority: task?.priority ?? 'medium',
    assignedTo: task?.assignedTo?._id ?? '',
    patientId: task?.patientId ?? defaultPatientId ?? '',
    dueDate: task?.dueDate ? toDateInputValue(task.dueDate) : '',
    status: task?.status ?? 'pending',
    completionNote: task?.completionNote ?? '',
  };
}

export default function TaskForm({
  open,
  onClose,
  initialTask,
  members,
  patients,
  defaultPatientId,
  isSubmitting,
  onSubmit,
  canEditStatus = true,
}: TaskFormProps) {
  const isEdit = Boolean(initialTask);
  const [form, setForm] = useState<FormState>(() => toFormState(initialTask, defaultPatientId));
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (open) {
      setForm(toFormState(initialTask, defaultPatientId));
      setErrors({});
    }
  }, [open, initialTask, defaultPatientId]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // Status and completion note are only editable on existing tasks.
  const statusEditable = isEdit && canEditStatus;
  const showCompletionNote = statusEditable && form.status === 'completed';
  const isCompletingNow = Boolean(initialTask) && initialTask?.status !== 'completed' && form.status === 'completed';

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    const title = form.title.trim();
    if (!title) next.title = 'Title is required';
    else if (title.length > TITLE_MAX) next.title = `Title must be ${TITLE_MAX} characters or fewer`;

    if (form.description.trim().length > DESCRIPTION_MAX) {
      next.description = `Description must be ${DESCRIPTION_MAX} characters or fewer`;
    }

    if (!form.assignedTo) next.assignedTo = 'Choose a family member to assign this task to';

    if (isCompletingNow && form.completionNote.trim().length < COMPLETION_NOTE_MIN) {
      next.completionNote = `Completion note must be at least ${COMPLETION_NOTE_MIN} characters`;
    }
    return next;
  }

  function buildCreatePayload(): TaskInput {
    const description = form.description.trim();
    const selectedP = (patients || []).find((p) => String(p._id) === String(form.patientId));
    const input: TaskInput = {
      title: form.title.trim(),
      category: form.category,
      priority: form.priority,
      assignedTo: form.assignedTo,
      patientId: form.patientId || undefined,
      patientName: selectedP?.name || undefined,
      dueDate: toIsoOrNull(form.dueDate),
    };
    if (description) input.description = description;
    return input;
  }

  function buildUpdatePayload(task: Task): TaskUpdateInput {
    const update: TaskUpdateInput = {};
    const title = form.title.trim();
    const description = form.description.trim();

    if (title !== task.title) update.title = title;
    if (description !== (task.description ?? '')) update.description = description;
    if (form.category !== task.category) update.category = form.category;
    if (form.priority !== task.priority) update.priority = form.priority;
    if (form.assignedTo !== (task.assignedTo?._id ?? '')) update.assignedTo = form.assignedTo;

    if (form.patientId !== (task.patientId ?? '')) {
      const selectedP = (patients || []).find((p) => String(p._id) === String(form.patientId));
      update.patientId = form.patientId || undefined;
      update.patientName = selectedP?.name || undefined;
    }

    const initialDate = task.dueDate ? toDateInputValue(task.dueDate) : '';
    if (form.dueDate !== initialDate) update.dueDate = toIsoOrNull(form.dueDate);

    if (statusEditable && form.status !== task.status) {
      update.status = form.status;
    }
    if (isCompletingNow) {
      update.completionNote = form.completionNote.trim();
    }
    return update;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (initialTask) {
      onSubmit(buildUpdatePayload(initialTask));
    } else {
      onSubmit(buildCreatePayload());
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-card bg-surface p-6 shadow-card"
      >
        <h2 id="task-form-title" className="mb-4 text-lg font-semibold text-text-primary">
          {isEdit ? 'Edit task' : 'New task'}
        </h2>

        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className={LABEL_CLASS} htmlFor="task-title">
            Title
            <input
              id="task-title"
              type="text"
              maxLength={TITLE_MAX}
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              aria-invalid={Boolean(errors.title)}
              className={`${INPUT_CLASS} ${errors.title ? 'border-error' : ''}`}
            />
            {errors.title && <span className="text-sm text-error">{errors.title}</span>}
          </label>

          <label className={LABEL_CLASS} htmlFor="task-description">
            Description
            <textarea
              id="task-description"
              rows={3}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              aria-invalid={Boolean(errors.description)}
              className={`${INPUT_CLASS} ${errors.description ? 'border-error' : ''}`}
            />
            {errors.description && <span className="text-sm text-error">{errors.description}</span>}
          </label>

          {patients && patients.length > 0 && (
            <label className={LABEL_CLASS} htmlFor="task-patient">
              Care Recipient / Patient
              <select
                id="task-patient"
                value={form.patientId}
                onChange={(e) => updateField('patientId', e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">General Family Task (No specific patient)</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.relationship ? `(${p.relationship})` : ''}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={LABEL_CLASS} htmlFor="task-category">
              Category
              <select
                id="task-category"
                value={form.category}
                onChange={(e) => updateField('category', e.target.value as TaskCategory)}
                className={INPUT_CLASS}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={LABEL_CLASS} htmlFor="task-priority">
              Priority
              <select
                id="task-priority"
                value={form.priority}
                onChange={(e) => updateField('priority', e.target.value as TaskPriority)}
                className={INPUT_CLASS}
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={LABEL_CLASS} htmlFor="task-assignee">
              Assignee
              <select
                id="task-assignee"
                value={form.assignedTo}
                onChange={(e) => updateField('assignedTo', e.target.value)}
                aria-invalid={Boolean(errors.assignedTo)}
                className={`${INPUT_CLASS} ${errors.assignedTo ? 'border-error' : ''}`}
              >
                <option value="">Select a member</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name}
                  </option>
                ))}
              </select>
              {errors.assignedTo && <span className="text-sm text-error">{errors.assignedTo}</span>}
            </label>

            <label className={LABEL_CLASS} htmlFor="task-due-date">
              Due date
              <input
                id="task-due-date"
                type="date"
                value={form.dueDate}
                onChange={(e) => updateField('dueDate', e.target.value)}
                className={INPUT_CLASS}
              />
            </label>
          </div>

          {statusEditable && (
            <label className={LABEL_CLASS} htmlFor="task-status">
              Status
              <select
                id="task-status"
                value={form.status}
                onChange={(e) => updateField('status', e.target.value as TaskStatus)}
                className={INPUT_CLASS}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {showCompletionNote && (
            <label className={LABEL_CLASS} htmlFor="task-completion-note">
              Completion note
              <textarea
                id="task-completion-note"
                rows={3}
                value={form.completionNote}
                onChange={(e) => updateField('completionNote', e.target.value)}
                aria-invalid={Boolean(errors.completionNote)}
                className={`${INPUT_CLASS} ${errors.completionNote ? 'border-error' : ''}`}
              />
              {errors.completionNote && (
                <span className="text-sm text-error">{errors.completionNote}</span>
              )}
            </label>
          )}

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-input border border-border px-4 py-2 text-sm text-text-primary hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-input bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
