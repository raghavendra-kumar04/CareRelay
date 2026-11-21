import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import TaskCard from '../components/tasks/TaskCard';
import TaskForm from '../components/tasks/TaskForm';
import { useCreateTask, useDeleteTask, useTaskList, useUpdateTask } from '../hooks/useTasks';
import { getApiErrorMessage, getFamily, getMembers } from '../lib/familyApi';
import type { Task, TaskInput, TaskPriority, TaskStatus, TaskUpdateInput } from '../types';

const PAGE_SIZE = 20;
const SKELETON_COUNT = 6;

const SELECT_CLASS =
  'rounded-input border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';
const BUTTON_PRIMARY =
  'rounded-input bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60';
const BUTTON_SECONDARY =
  'rounded-input border border-border px-4 py-2 text-sm text-text-primary hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50';

export default function TasksPage() {
  const params = useParams<{ fid: string }>();
  const fid = params.fid ?? '';

  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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

  const members = (membersQuery.data?.members ?? []).flatMap((member) =>
    member.user ? [{ _id: member.user._id, name: member.user.name }] : [],
  );
  const canDelete = familyQuery.data?.role === 'admin';

  const filters = {
    page,
    limit: PAGE_SIZE,
    status: status || undefined,
    assignedTo: assignedTo || undefined,
    priority: priority || undefined,
    overdue: overdueOnly || undefined,
  };
  const filtersActive = Boolean(status || assignedTo || priority || overdueOnly);

  const taskList = useTaskList(fid, filters);
  const createTask = useCreateTask(fid);
  const updateTask = useUpdateTask(fid);
  const deleteTask = useDeleteTask(fid);

  const tasks = taskList.data?.tasks ?? [];
  const pagination = taskList.data?.pagination;
  const limit = pagination?.limit ?? PAGE_SIZE;
  const totalPages = pagination ? Math.max(1, Math.ceil(pagination.total / limit)) : 1;
  const isSubmitting = createTask.isPending || updateTask.isPending;

  function closeForm() {
    setFormOpen(false);
    setEditingTask(null);
  }

  function openCreate() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function handleSubmit(input: TaskInput | TaskUpdateInput) {
    if (editingTask) {
      if (Object.keys(input).length === 0) {
        closeForm();
        return;
      }
      updateTask.mutate({ id: editingTask._id, data: input }, { onSuccess: closeForm });
    } else {
      createTask.mutate(input as TaskInput, { onSuccess: closeForm });
    }
  }

  function handleDelete(task: Task) {
    if (!window.confirm('Delete this task? It will be hidden from everyone.')) return;
    deleteTask.mutate(task._id);
  }

  let content;
  if (taskList.isPending) {
    content = (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-card border border-border bg-surface" />
        ))}
      </div>
    );
  } else if (taskList.isError) {
    content = (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-card border border-border bg-surface p-4"
      >
        <p className="text-sm text-error">{getApiErrorMessage(taskList.error, 'Could not load tasks')}</p>
        <button type="button" onClick={() => void taskList.refetch()} className={BUTTON_SECONDARY}>
          Retry
        </button>
      </div>
    );
  } else if (tasks.length === 0) {
    content = (
      <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface p-8 text-center">
        <p className="text-text-secondary">
          {filtersActive
            ? 'No tasks match these filters'
            : 'No tasks yet. Create the first task for your family.'}
        </p>
        <button type="button" onClick={openCreate} className={BUTTON_PRIMARY}>
          + New task
        </button>
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onClick={() => openEdit(task)}
              onEdit={() => openEdit(task)}
              onDelete={() => handleDelete(task)}
              canDelete={canDelete}
            />
          ))}
        </div>

        <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className={BUTTON_SECONDARY}
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            className={BUTTON_SECONDARY}
          >
            Next
          </button>
        </nav>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text-primary">Tasks</h1>
        <button type="button" onClick={openCreate} disabled={!fid} className={BUTTON_PRIMARY}>
          + New task
        </button>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface p-4 shadow-card">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as TaskStatus | '');
              setPage(1);
            }}
            className={SELECT_CLASS}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Assignee
          <select
            value={assignedTo}
            onChange={(e) => {
              setAssignedTo(e.target.value);
              setPage(1);
            }}
            className={SELECT_CLASS}
          >
            <option value="">All</option>
            {members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Priority
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as TaskPriority | '');
              setPage(1);
            }}
            className={SELECT_CLASS}
          >
            <option value="">All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>

        <button
          type="button"
          aria-pressed={overdueOnly}
          onClick={() => {
            setOverdueOnly((current) => !current);
            setPage(1);
          }}
          className={`rounded-pill border px-4 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            overdueOnly ? 'border-error bg-error/10 text-error' : 'border-border text-text-secondary hover:bg-background'
          }`}
        >
          Overdue only
        </button>
      </div>

      {content}

      <TaskForm
        open={formOpen}
        onClose={closeForm}
        initialTask={editingTask}
        members={members}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        canEditStatus
      />
    </div>
  );
}
