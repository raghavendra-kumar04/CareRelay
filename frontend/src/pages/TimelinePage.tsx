import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocketStore } from '../store/socketStore';
import { getApiErrorMessage, getMembers, getMyFamilies } from '../lib/familyApi';
import { activityKeys, useActivities } from '../hooks/useActivities';
import type { ActivityListResult } from '../hooks/useActivities';
import ActivityItem from '../components/timeline/ActivityItem';
import type { ActivityEntityType, ActivityFilters, ActivityItemData } from '../types';

const PAGE_SIZE = 20;
const NEW_HIGHLIGHT_MS = 4000;

type EntityFilter = 'all' | ActivityEntityType;

function toStartIso(date: string): string | undefined {
  if (!date) return undefined;
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function toEndIso(date: string): string | undefined {
  if (!date) return undefined;
  const d = new Date(`${date}T23:59:59.999`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function matchesFilters(activity: ActivityItemData, filters: ActivityFilters): boolean {
  if (filters.entityType && activity.entityType !== filters.entityType) return false;
  if (filters.actorId && activity.actorId !== filters.actorId) return false;
  const created = Date.parse(activity.createdAt);
  if (Number.isNaN(created)) return false;
  if (filters.startDate && created < Date.parse(filters.startDate)) return false;
  if (filters.endDate && created > Date.parse(filters.endDate)) return false;
  return true;
}

const inputClass =
  'rounded-lg border border-border/80 bg-surface px-3 py-2 text-sm text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:border-primary/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/15';

const buttonClass =
  'rounded-input border border-border bg-surface px-3 py-2 text-sm text-text-primary hover:bg-background disabled:cursor-not-allowed disabled:opacity-50';

function TimelinePage() {
  const queryClient = useQueryClient();
  const socket = useSocketStore((s) => s.socket);

  const familiesQuery = useQuery({
    queryKey: ['families', 'mine'],
    queryFn: getMyFamilies,
  });
  const families = familiesQuery.data?.families ?? [];
  const storedFid = localStorage.getItem('activeFamilyId');
  const matched = families.find((f) => f.family._id === storedFid);
  const fid = matched ? matched.family._id : families[0]?.family._id ?? '';

  const membersQuery = useQuery({
    queryKey: ['family-members', fid],
    queryFn: () => getMembers(fid),
    enabled: Boolean(fid),
  });

  const [entityType, setEntityType] = useState<EntityFilter>('all');
  const [actorId, setActorId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [newIds, setNewIds] = useState<Set<string>>(() => new Set());
  const highlightTimers = useRef<number[]>([]);

  const filters = useMemo<ActivityFilters>(
    () => ({
      entityType: entityType === 'all' ? undefined : entityType,
      actorId: actorId === 'all' ? undefined : actorId,
      startDate: toStartIso(startDate),
      endDate: toEndIso(endDate),
      page,
      limit: PAGE_SIZE,
    }),
    [entityType, actorId, startDate, endDate, page],
  );

  const activitiesQuery = useActivities(fid, filters);

  // Realtime: prepend matching new activity on page 1; otherwise refresh the list.
  useEffect(() => {
    if (!socket || !fid) return;

    const handleNew = (payload: { activity: ActivityItemData }) => {
      const activity = payload.activity;
      if (activity.familyId !== fid) return;

      if ((filters.page ?? 1) !== 1) {
        void queryClient.invalidateQueries({ queryKey: activityKeys.all(fid) });
        return;
      }

      if (!matchesFilters(activity, filters)) return;

      queryClient.setQueryData<ActivityListResult>(activityKeys.list(fid, filters), (old) => {
        if (!old) return old;
        if (old.items.some((i) => i._id === activity._id)) return old;
        return {
          items: [activity, ...old.items].slice(0, filters.limit ?? PAGE_SIZE),
          pagination: { ...old.pagination, total: old.pagination.total + 1 },
        };
      });

      setNewIds((prev) => new Set(prev).add(activity._id));
      const timer = window.setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          next.delete(activity._id);
          return next;
        });
      }, NEW_HIGHLIGHT_MS);
      highlightTimers.current.push(timer);
    };

    socket.on('activity:new', handleNew);
    return () => {
      socket.off('activity:new', handleNew);
    };
  }, [socket, fid, filters, queryClient]);

  useEffect(() => {
    const timers = highlightTimers.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  if (familiesQuery.isPending) {
    return <p className="text-sm text-text-secondary">Loading…</p>;
  }

  if (!fid) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-text-primary">Timeline</h1>
        <p className="text-sm text-text-secondary">
          Join or create a family to see the timeline.{' '}
          <Link to="/settings" className="font-medium text-primary hover:text-primary-dark">
            Go to settings
          </Link>
        </p>
      </div>
    );
  }

  const memberOptions = (membersQuery.data?.members ?? []).flatMap((m) =>
    m.user ? [{ id: m.user._id, name: m.user.name }] : [],
  );

  const hasActiveFilters =
    entityType !== 'all' || actorId !== 'all' || startDate !== '' || endDate !== '';

  const pagination = activitiesQuery.data?.pagination;
  const items = activitiesQuery.data?.items ?? [];
  const limit = pagination?.limit ?? PAGE_SIZE;
  const total = pagination?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const resetPage = () => setPage(1);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text-primary">Timeline</h1>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="timeline-entity-type" className="text-xs font-medium text-text-secondary">
            Type
          </label>
          <select
            id="timeline-entity-type"
            className={inputClass}
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value as EntityFilter);
              resetPage();
            }}
          >
            <option value="all">All types</option>
            <option value="task">Tasks</option>
            <option value="appointment">Appointments</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="timeline-actor" className="text-xs font-medium text-text-secondary">
            Member
          </label>
          <select
            id="timeline-actor"
            className={inputClass}
            value={actorId}
            onChange={(e) => {
              setActorId(e.target.value);
              resetPage();
            }}
          >
            <option value="all">All members</option>
            {memberOptions.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="timeline-start" className="text-xs font-medium text-text-secondary">
            From
          </label>
          <input
            id="timeline-start"
            type="date"
            className={inputClass}
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => {
              setStartDate(e.target.value);
              resetPage();
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="timeline-end" className="text-xs font-medium text-text-secondary">
            To
          </label>
          <input
            id="timeline-end"
            type="date"
            className={inputClass}
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => {
              setEndDate(e.target.value);
              resetPage();
            }}
          />
        </div>
      </div>

      {activitiesQuery.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="animate-pulse rounded-card bg-surface h-20 border border-border" />
          ))}
        </div>
      ) : activitiesQuery.isError ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-error">
            {getApiErrorMessage(activitiesQuery.error, 'Could not load activity')}
          </p>
          <button type="button" className={buttonClass} onClick={() => void activitiesQuery.refetch()}>
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {hasActiveFilters
            ? 'No activity matches these filters'
            : 'No activity yet. Actions on tasks and appointments will appear here.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((activity) => (
            <ActivityItem key={activity._id} activity={activity} isNew={newIds.has(activity._id)} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          className={buttonClass}
          disabled={page <= 1 || activitiesQuery.isPending}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <span className="text-sm text-text-secondary">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className={buttonClass}
          disabled={page >= totalPages || activitiesQuery.isPending}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default TimelinePage;
