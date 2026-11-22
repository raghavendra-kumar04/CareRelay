import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  MessageSquare,
  Plus,
  Printer,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import DoctorVisitSheetModal from '../components/appointments/DoctorVisitSheetModal';
import PatientSelectorBar from '../components/family/PatientSelectorBar';
import { useSnapshot } from '../hooks/useSnapshot';
import { useSummaryList } from '../hooks/useSummaries';
import { getFamily, getMyFamilies } from '../lib/familyApi';
import { useFamilyStore } from '../store/familyStore';
import { usePatientStore } from '../store/patientStore';
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
  const { activeFamilyId, setActiveFamilyId } = useFamilyStore();
  const { selectedPatientId, setSelectedPatientId, getSelectedPatientId } = usePatientStore();

  const [familyDropdownOpen, setFamilyDropdownOpen] = useState(false);
  const [doctorSheetOpen, setDoctorSheetOpen] = useState(false);
  const familyDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!familyDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (familyDropdownRef.current && !familyDropdownRef.current.contains(e.target as Node)) {
        setFamilyDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFamilyDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [familyDropdownOpen]);

  useEffect(() => {
    if (families.length > 0) {
      if (!activeFamilyId || !families.some((f) => f.family._id === activeFamilyId)) {
        const stored = localStorage.getItem('activeFamilyId');
        const matched = families.find((f) => f.family._id === stored);
        const resolvedId = matched ? matched.family._id : families[0].family._id;
        setActiveFamilyId(resolvedId);
      }
    }
  }, [families, activeFamilyId, setActiveFamilyId]);

  const selectedFamilyId = activeFamilyId && families.some((f) => f.family._id === activeFamilyId)
    ? activeFamilyId
    : families[0]?.family._id ?? '';

  const activeFamily = families.find((f) => f.family._id === selectedFamilyId) || families[0];

  const familyQuery = useQuery({
    queryKey: ['family', selectedFamilyId],
    queryFn: () => getFamily(selectedFamilyId),
    enabled: Boolean(selectedFamilyId),
  });

  const currentFamily = familyQuery.data?.family || activeFamily?.family;
  const isFamilyAdmin = familyQuery.data?.role === 'admin' || activeFamily?.role === 'admin';

  // Active patient scoping
  const activePatientId = selectedPatientId === 'all'
    ? 'all'
    : getSelectedPatientId(
      selectedFamilyId,
      currentFamily?.patients?.[0]?._id ? String(currentFamily.patients[0]._id) : undefined
    );

  const snapshotQuery = useSnapshot(selectedFamilyId, activePatientId);
  const snapshot = snapshotQuery.data;
  const latestSummaryQuery = useSummaryList(
    selectedFamilyId,
    1,
    activePatientId === 'all' ? undefined : (activePatientId || undefined)
  );
  const latestSummary = latestSummaryQuery.data?.summaries?.[0];

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
        <img src="/logo.png" alt="CareRelay" className="h-28 w-auto object-contain mb-2" />
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
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              {activeFamily?.family.name || 'Family Care Hub'}
            </h1>

            {families.length > 1 && (
              <div className="relative" ref={familyDropdownRef}>
                <button
                  type="button"
                  onClick={() => setFamilyDropdownOpen((open) => !open)}
                  aria-expanded={familyDropdownOpen}
                  aria-haspopup="listbox"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary shadow-sm hover:border-primary/50 hover:bg-background transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span className="font-semibold text-text-primary">{activeFamily?.family.name}</span>
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                    {activeFamily?.role || 'Member'}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-text-secondary transition-transform duration-200 ${familyDropdownOpen ? 'rotate-180 text-primary' : ''
                      }`}
                  />
                </button>

                {familyDropdownOpen && (
                  <div
                    role="listbox"
                    className="absolute left-0 mt-2 w-64 rounded-card border border-border bg-surface p-1.5 shadow-lg z-50 animate-in fade-in-0 duration-150"
                  >
                    <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                      Switch Family Hub
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {families.map((f) => {
                        const isSelected = f.family._id === selectedFamilyId;
                        return (
                          <button
                            key={f.family._id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => {
                              setActiveFamilyId(f.family._id);
                              setFamilyDropdownOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs transition-colors text-left ${isSelected
                              ? 'bg-primary/10 font-semibold text-primary'
                              : 'text-text-primary hover:bg-background hover:text-primary'
                              }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                {f.family.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="truncate">{f.family.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-text-secondary uppercase">
                                {f.role}
                              </span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="my-1 border-t border-border" />
                    <Link
                      to="/settings"
                      onClick={() => setFamilyDropdownOpen(false)}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-text-secondary hover:bg-background hover:text-text-primary transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Create or join another family</span>
                    </Link>
                  </div>
                )}
              </div>
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
        </div>
      </div>

      {/* Patient Profile & Condition Tracker (Multi-Patient Selection) */}
      {currentFamily && (
        <PatientSelectorBar
          family={currentFamily}
          isAdmin={isFamilyAdmin}
          onPatientChange={(p) => setSelectedPatientId(selectedFamilyId, p ? String(p._id) : 'all')}
        />
      )}

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
          className={`flex items-center justify-between rounded-card border p-4 shadow-card transition-colors ${counts.overdue > 0
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
            className={`flex h-12 w-12 items-center justify-center rounded-full ${counts.overdue > 0 ? 'bg-error/15 text-error' : 'bg-surface text-text-secondary'
              }`}
          >
            <AlertTriangle className="h-6 w-6" />
          </div>
        </Link>
      </section>

      {/* Quick Access Care Summary & Assistant Card */}
      <section aria-label="Family Care Summary & Quick Assistant" className="rounded-card border border-border bg-gradient-to-r from-surface via-surface to-primary/[0.04] p-5 shadow-card hover:border-primary/30 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-text-primary">Family Care Summary</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Quick Access
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {latestSummary
                  ? `Weekly progress period: ${format(new Date(latestSummary.periodStart), 'MMM d')} – ${format(new Date(latestSummary.periodEnd), 'MMM d, yyyy')}`
                  : 'AI-generated executive digest and 24/7 care coordination assistant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/summary"
              className="inline-flex items-center gap-1.5 rounded-input border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-background hover:border-primary/40 transition shadow-sm"
            >
              <FileText className="h-3.5 w-3.5 text-primary" />
              <span>Full Report</span>
            </Link>
            <Link
              to="/summary?tab=chat"
              className="inline-flex items-center gap-1.5 rounded-input bg-primary px-3.5 py-1.5 text-xs font-medium text-white hover:bg-primary-dark transition shadow-sm"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Ask Assistant</span>
            </Link>
          </div>
        </div>

        {/* Quick Insights Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/60 bg-background/50 p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              Recently Completed
            </span>
            <div className="mt-1 text-sm font-semibold text-text-primary">
              {latestSummary?.content?.recentlyCompleted?.length || counts.completed} items recorded
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5 truncate">
              {latestSummary?.content?.recentlyCompleted?.[0]?.text || 'Tasks verified by family members'}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/50 p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              Active Responsibilities
            </span>
            <div className="mt-1 text-sm font-semibold text-text-primary">
              {counts.pending} pending ({counts.overdue} overdue)
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5 truncate">
              {overdueTasks[0]?.title ? `Urgent: ${overdueTasks[0].title}` : 'All responsibilities on track'}
            </p>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/50 p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              Upcoming Medical Care
            </span>
            <div className="mt-1 text-sm font-semibold text-text-primary">
              {upcomingAppointments.length} appointment(s) this week
            </div>
            <p className="text-[11px] text-text-secondary mt-0.5 truncate">
              {upcomingAppointments[0]
                ? `${upcomingAppointments[0].title} on ${format(new Date(upcomingAppointments[0].dateTime), 'EEE, MMM d')}`
                : 'No doctor visits scheduled'}
            </p>
          </div>
        </div>

        {/* Interactive Query Chips */}
        <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-medium text-text-secondary flex items-center gap-1 shrink-0">
            <Bot className="h-3 w-3 text-primary" />
            Quick Assistant questions:
          </span>
          <Link
            to="/summary?tab=chat&q=What+tasks+are+overdue"
            className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-primary hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition"
          >
            "What tasks are overdue?"
          </Link>
          <Link
            to="/summary?tab=chat&q=Upcoming+doctor+appointments"
            className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-primary hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition"
          >
            "Upcoming doctor visits"
          </Link>
          <Link
            to="/summary?tab=chat&q=What+medications+need+refills"
            className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-primary hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition"
          >
            "Medications & refills"
          </Link>
          <Link
            to="/summary?tab=chat&q=Who+is+assigned+to+pending+tasks"
            className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-primary hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition"
          >
            "Who is assigned to what?"
          </Link>
        </div>
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDoctorSheetOpen(true)}
                className="text-xs font-medium text-text-secondary hover:text-text-primary flex items-center gap-1 border border-border rounded px-2 py-0.5 hover:bg-background transition"
                title="Print Doctor Visit One-Pager"
              >
                <Printer className="h-3 w-3 text-primary" />
                <span>One-Pager</span>
              </button>
              <Link
                to={`/families/${selectedFamilyId}/appointments`}
                className="text-xs font-medium text-primary hover:text-primary-dark flex items-center gap-1"
              >
                <span>Schedule</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
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

      {/* Bottom Section: Recent Family Activity Stream */}
      <section className="flex flex-col rounded-card border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-text-primary">
              Recent Family Care Activity
            </h2>
            <span className="text-xs text-text-secondary">Chronological updates</span>
          </div>
          <Link
            to="/timeline"
            className="text-xs font-medium text-primary hover:text-primary-dark flex items-center gap-1"
          >
            <span>Full Timeline</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {recentActivities.length === 0 ? (
          <p className="text-xs text-text-secondary py-6 text-center">
            No recent activity recorded yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentActivities.slice(0, 6).map((act: SnapshotActivity) => (
              <div
                key={act._id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/50 p-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                    {initialsOf(act.actorName)}
                  </span>
                  <span className="truncate text-text-primary">
                    <strong className="font-medium">{act.actorName}</strong>{' '}
                    <span className="text-text-secondary">{act.action}</span>{' '}
                    <span className="font-medium text-text-primary">"{act.entityTitle}"</span>
                  </span>
                </div>
                <span className="shrink-0 text-[11px] text-text-secondary">
                  {formatDistanceToNow(new Date(act.createdAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      {selectedFamilyId && (
        <DoctorVisitSheetModal
          fid={selectedFamilyId}
          isOpen={doctorSheetOpen}
          onClose={() => setDoctorSheetOpen(false)}
        />
      )}
    </div>
  );
}
