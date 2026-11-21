import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import { useSnapshot } from '../hooks/useSnapshot';
import { getMyFamilies } from '../lib/familyApi';
import type { SnapshotActivity, SnapshotAppointment, SnapshotOverdueTask } from '../types';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

export default function DashboardPage() {
  const { data: myFamiliesData, isLoading: familiesLoading } = useQuery({
    queryKey: ['families', 'mine'],
    queryFn: getMyFamilies,
  });

  const families = myFamiliesData?.families ?? [];
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');

  useEffect(() => {
    if (families.length > 0 && !selectedFamilyId) {
      const stored = localStorage.getItem('activeFamilyId');
      const matched = families.find((f) => f.family._id === stored);
      const activeId = matched ? matched.family._id : families[0].family._id;
      setSelectedFamilyId(activeId);
      localStorage.setItem('activeFamilyId', activeId);
    }
  }, [families, selectedFamilyId]);

  const activeFamily = families.find((f) => f.family._id === selectedFamilyId);
  const snapshotQuery = useSnapshot(selectedFamilyId);
  const snapshot = snapshotQuery.data;

  const counts = snapshot?.counts ?? { completed: 0, pending: 0, overdue: 0 };
  const upcomingAppointments = snapshot?.upcomingAppointments ?? [];
  const overdueTasks = snapshot?.overdueTasks ?? [];
  const recentActivities = snapshot?.recentActivities ?? [];

  if (familiesLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6 animate-pulse">
        <div className="h-10 w-64 rounded bg-surface border border-border" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-28 rounded-card border border-border bg-surface" />
          <div className="h-28 rounded-card border border-border bg-surface" />
          <div className="h-28 rounded-card border border-border bg-surface" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 rounded-card border border-border bg-surface" />
          <div className="h-64 rounded-card border border-border bg-surface" />
        </div>
      </div>
    );
  }

  if (families.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Welcome to CareRelay</h1>
        <p className="text-text-secondary max-w-md">
          Care doesn't stop when families live apart. Create a shared care hub or ask your family coordinator for an invite link.
        </p>
        <Link
          to="/settings"
          className="mt-2 rounded-input bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-dark shadow-sm"
        >
          Create Family Workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
      {/* Header: Family context & 10-Second tagline */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary">
              {activeFamily?.family.name || 'Family Care Hub'}
            </h1>
            {families.length > 1 && (
              <select
                value={selectedFamilyId}
                onChange={(e) => {
                  setSelectedFamilyId(e.target.value);
                  localStorage.setItem('activeFamilyId', e.target.value);
                }}
                className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-secondary"
              >
                {families.map((f) => (
                  <option key={f.family._id} value={f.family._id}>
                    {f.family.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="text-xs font-medium text-primary mt-0.5">
            Care doesn't stop when families live apart.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void snapshotQuery.refetch()}
            className="flex items-center gap-1.5 rounded-pill border border-border px-3 py-1.5 text-xs text-text-secondary hover:bg-surface"
            title="Refresh snapshot"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${snapshotQuery.isFetching ? 'animate-spin' : ''}`} />
            <span>Updated {snapshot?.generatedAt ? format(new Date(snapshot.generatedAt), 'h:mm a') : 'just now'}</span>
          </button>

          <Link
            to="/summary"
            className="flex items-center gap-1.5 rounded-pill bg-primary px-3.5 py-1.5 text-xs font-medium text-white hover:bg-primary-dark shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Care Summary</span>
          </Link>
        </div>
      </div>

      {/* Snapshot Counters: The 10-Second Status */}
      <section aria-label="Care Snapshot Counters" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Completed */}
        <Link
          to={`/families/${selectedFamilyId}/tasks?status=completed`}
          className="flex items-center justify-between rounded-card border border-border bg-surface p-4 shadow-card hover:border-success/40 transition-colors"
        >
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
              Completed Tasks
            </span>
            <div className="mt-1 text-3xl font-bold text-success">{counts.completed}</div>
            <p className="text-xs text-text-secondary mt-1">Activities finished by family</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </Link>

        {/* Pending */}
        <Link
          to={`/families/${selectedFamilyId}/tasks?status=pending`}
          className="flex items-center justify-between rounded-card border border-border bg-surface p-4 shadow-card hover:border-primary/40 transition-colors"
        >
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
              Pending / In Progress
            </span>
            <div className="mt-1 text-3xl font-bold text-text-primary">{counts.pending}</div>
            <p className="text-xs text-text-secondary mt-1">Actions assigned to members</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Clock className="h-6 w-6" />
          </div>
        </Link>

        {/* Overdue */}
        <Link
          to={`/families/${selectedFamilyId}/tasks?overdue=true`}
          className={`flex items-center justify-between rounded-card border p-4 shadow-card transition-colors ${
            counts.overdue > 0
              ? 'border-error/40 bg-error/5 hover:border-error'
              : 'border-border bg-surface'
          }`}
        >
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
              Needs Attention
            </span>
            <div className={`mt-1 text-3xl font-bold ${counts.overdue > 0 ? 'text-error' : 'text-text-secondary'}`}>
              {counts.overdue}
            </div>
            <p className="text-xs text-text-secondary mt-1">
              {counts.overdue > 0 ? 'Overdue activities requiring action' : 'All responsibilities on time'}
            </p>
          </div>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              counts.overdue > 0 ? 'bg-error/15 text-error' : 'bg-surface text-text-secondary'
            }`}
          >
            <AlertTriangle className="h-6 w-6" />
          </div>
        </Link>
      </section>

      {/* Main Grid: Outstanding Responsibilities & Upcoming Appointments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Outstanding Responsibilities */}
        <section className="flex flex-col rounded-card border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-text-primary">
                Outstanding Responsibilities
              </h2>
              {overdueTasks.length > 0 && (
                <span className="rounded-pill bg-error/10 px-2 py-0.5 text-xs font-medium text-error">
                  {overdueTasks.length} Overdue
                </span>
              )}
            </div>
            <Link
              to={`/families/${selectedFamilyId}/tasks`}
              className="text-xs font-medium text-primary hover:text-primary-dark flex items-center gap-1"
            >
              <span>All Tasks</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {overdueTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-text-primary">All caught up!</p>
              <p className="text-xs text-text-secondary">
                No overdue tasks. All scheduled responsibilities are on track.
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {overdueTasks.slice(0, 5).map((task: SnapshotOverdueTask) => (
                <div key={task._id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-error">
                        {task.dueDate ? `Due ${format(new Date(task.dueDate), 'MMM d')}` : 'Overdue'}
                      </span>
                      <span className="text-xs text-text-secondary">•</span>
                      <span className="text-xs capitalize text-text-secondary">{task.priority} priority</span>
                    </div>
                  </div>

                  {task.assignedTo && (
                    <div className="flex items-center gap-1.5 shrink-0" title={`Assigned to ${task.assignedTo.name}`}>
                      <span
                        style={{ backgroundColor: task.assignedTo.avatarColor || '#5C8A6E' }}
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white"
                      >
                        {initialsOf(task.assignedTo.name)}
                      </span>
                      <span className="text-xs font-medium text-text-secondary hidden sm:inline">
                        {task.assignedTo.name}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right: Upcoming Appointments */}
        <section className="flex flex-col rounded-card border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-text-primary">
                Upcoming Appointments
              </h2>
              <span className="text-xs text-text-secondary">Next 7 Days</span>
            </div>
            <Link
              to={`/families/${selectedFamilyId}/appointments`}
              className="text-xs font-medium text-primary hover:text-primary-dark flex items-center gap-1"
            >
              <span>Schedule</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Calendar className="h-8 w-8 text-text-secondary/40" />
              <p className="text-sm font-medium text-text-primary">No appointments this week</p>
              <p className="text-xs text-text-secondary">
                Keep the whole family updated on doctor visits and hospital follow-ups.
              </p>
              <Link
                to={`/families/${selectedFamilyId}/appointments`}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3 w-3" />
                <span>Schedule an appointment</span>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {upcomingAppointments.slice(0, 5).map((appt: SnapshotAppointment) => {
                const apptDate = new Date(appt.dateTime);
                return (
                  <div key={appt._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {appt.title}
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {format(apptDate, 'EEE, MMM d')} at {format(apptDate, 'h:mm a')}
                        {appt.doctorName ? ` • Dr. ${appt.doctorName}` : ''}
                      </p>
                    </div>

                    {appt.assignedTo && (
                      <div className="flex items-center gap-1.5 shrink-0" title={`Accompanied by ${appt.assignedTo.name}`}>
                        <span
                          style={{ backgroundColor: appt.assignedTo.avatarColor || '#5C8A6E' }}
                          className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white"
                        >
                          {initialsOf(appt.assignedTo.name)}
                        </span>
                        <span className="text-xs font-medium text-text-secondary hidden sm:inline">
                          {appt.assignedTo.name}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Bottom Section: Recent Activity Stream & AI Summary Action Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities (2 cols) */}
        <section className="lg:col-span-2 flex flex-col rounded-card border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <h2 className="text-base font-semibold text-text-primary">
              Recent Family Care Activity
            </h2>
            <Link
              to="/timeline"
              className="text-xs font-medium text-primary hover:text-primary-dark flex items-center gap-1"
            >
              <span>Full Timeline</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentActivities.length === 0 ? (
            <p className="text-xs text-text-secondary py-4 text-center">
              No recent activity recorded yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {recentActivities.slice(0, 6).map((act: SnapshotActivity) => (
                <div key={act._id} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {initialsOf(act.actorName)}
                    </span>
                    <span className="truncate text-text-primary">
                      <strong className="font-medium">{act.actorName}</strong>{' '}
                      <span className="text-text-secondary">{act.action}</span>{' '}
                      <span className="font-medium text-text-primary">"{act.entityTitle}"</span>
                    </span>
                  </div>
                  <span className="shrink-0 text-text-secondary">
                    {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* AI Care Briefing Card (1 col) */}
        <div className="flex flex-col justify-between rounded-card border border-primary/20 bg-primary/5 p-5 shadow-card">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <Sparkles className="h-4 w-4" />
              <span>AI Family Care Briefing</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Gemini synthesises recorded tasks, appointments, and activities into a structured, plain-language family update.
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-primary/10">
            <Link
              to="/summary"
              className="flex w-full items-center justify-center gap-2 rounded-input bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary-dark shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Generate 7-Day Update</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
