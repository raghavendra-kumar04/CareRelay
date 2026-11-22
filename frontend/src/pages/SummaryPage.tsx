import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Bot, FileText } from 'lucide-react';
import { getFamily, getMyFamilies } from '../lib/familyApi';
import { useGenerateSummary, useSummaryList } from '../hooks/useSummaries';
import SummaryBlock from '../components/summary/SummaryBlock';
import CareAssistantChat from '../components/summary/CareAssistantChat';
import PatientSelectorBar from '../components/family/PatientSelectorBar';
import { useFamilyStore } from '../store/familyStore';
import { usePatientStore } from '../store/patientStore';
import type { AiSummary, SummaryStatus } from '../types/summary';

function failureMessage(code: string | null): string {
  switch (code) {
    case 'AI_NOT_CONFIGURED':
      return 'AI summaries are not set up for this environment yet.';
    case 'AI_UNSAFE_CONTENT':
      return 'The generated text was rejected by our safety checks. Try again later.';
    case 'AI_MALFORMED_RESPONSE':
    case 'AI_GENERATION_FAILED':
      return 'The update could not be generated. Please try again.';
    default:
      return 'Something went wrong while generating the update. Please try again.';
  }
}

const STATUS_PILL: Record<SummaryStatus, string> = {
  ready: 'bg-success/10 text-success',
  generating: 'bg-warning/10 text-warning',
  failed: 'bg-error/10 text-error',
};

const STATUS_LABEL: Record<SummaryStatus, string> = {
  ready: 'Ready',
  generating: 'Generating',
  failed: 'Failed',
};

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-4 w-4 animate-spin rounded-pill border-2 border-white border-t-transparent"
    />
  );
}

function SummaryState({ summary, fid }: { summary: AiSummary; fid: string }) {
  if (summary.status === 'failed') {
    return (
      <div className="rounded-card border border-error bg-surface p-5 text-sm text-error">
        <p className="font-semibold">The last update could not be generated</p>
        <p className="mt-1">{failureMessage(summary.errorCode)}</p>
      </div>
    );
  }
  if (summary.status === 'generating') {
    return (
      <div className="rounded-card bg-surface p-5 text-sm text-text-secondary shadow-card">
        Generating…
      </div>
    );
  }
  return <SummaryBlock summary={summary} fid={fid} />;
}

export default function SummaryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'chat' ? 'chat' : 'report';
  const initialQuery = searchParams.get('q') || '';

  const { activeFamilyId } = useFamilyStore();
  const { selectedPatientId, getSelectedPatientId } = usePatientStore();

  const familiesQuery = useQuery({
    queryKey: ['families', 'mine'],
    queryFn: getMyFamilies,
  });
  const families = familiesQuery.data?.families ?? [];
  const fid = (activeFamilyId && families.some((f) => f.family._id === activeFamilyId))
    ? activeFamilyId
    : (families[0]?.family._id ?? '');

  const familyQuery = useQuery({
    queryKey: ['family', fid],
    queryFn: () => getFamily(fid),
    enabled: Boolean(fid),
  });
  const family = familyQuery.data?.family;
  const isAdmin = familyQuery.data?.role === 'admin';

  const activePatientId = getSelectedPatientId(
    fid,
    family?.patients?.[0]?._id ? String(family.patients[0]._id) : undefined
  );
  const patientFilter = selectedPatientId === 'all' ? undefined : (activePatientId || undefined);
  const activePatient = family?.patients?.find((p) => String(p._id) === String(patientFilter));

  const generate = useGenerateSummary(fid);
  const latestQuery = useSummaryList(fid, 1, patientFilter);

  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState<AiSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pageQuery = useSummaryList(fid, page, patientFilter);

  const handleTabChange = (tab: 'report' | 'chat') => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'chat') {
      next.set('tab', 'chat');
    } else {
      next.delete('tab');
      next.delete('q');
    }
    setSearchParams(next);
  };

  if (familiesQuery.isPending) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 w-48 animate-pulse rounded-input bg-border" />
        <div className="h-40 animate-pulse rounded-card bg-border" />
      </div>
    );
  }

  if (!fid) {
    return (
      <div className="p-6 text-sm text-text-secondary">
        <p>Join or create a family to generate updates</p>
        <Link to="/settings" className="text-primary underline">
          Go to settings
        </Link>
      </div>
    );
  }

  const latest = latestQuery.data?.summaries[0];

  const pageItems = pageQuery.isPlaceholderData ? [] : (pageQuery.data?.summaries ?? []);
  const combined = [...loaded, ...pageItems];
  const unique = combined.filter((s, i) => combined.findIndex((x) => x._id === s._id) === i);
  const pool = latest ? [latest, ...unique] : unique;
  const history = unique.filter((s) => s._id !== latest?._id);
  const selected = selectedId ? (pool.find((s) => s._id === selectedId) ?? null) : null;

  const pagination = pageQuery.data?.pagination;
  const hasMore = pagination ? pagination.page * pagination.limit < pagination.total : false;

  const handleLoadMore = () => {
    setLoaded(unique);
    setPage((p) => p + 1);
  };

  let leftContent: ReactNode;
  if (selected) {
    leftContent = (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Selected update</h2>
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="text-sm text-primary hover:underline"
          >
            Back to latest
          </button>
        </div>
        <SummaryState summary={selected} fid={fid} />
      </div>
    );
  } else if (latestQuery.isPending) {
    leftContent = (
      <div className="space-y-3">
        <div className="h-6 w-40 animate-pulse rounded-input bg-border" />
        <div className="h-64 animate-pulse rounded-card bg-border" />
      </div>
    );
  } else if (!latest) {
    leftContent = (
      <div className="rounded-card bg-surface p-5 text-sm text-text-secondary shadow-card">
        No updates yet. Generate the first family update.
      </div>
    );
  } else {
    leftContent = <SummaryState summary={latest} fid={fid} />;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
      {family && (
        <PatientSelectorBar
          family={family}
          isAdmin={isAdmin}
          showDetailsCard={false}
        />
      )}

      {/* Tab Switcher & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Family Care Summary</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Weekly executive digest and AI-powered coordinator assistant
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => handleTabChange('report')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${activeTab === 'report'
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Care Report</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('chat')}
            className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${activeTab === 'chat'
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>Care Assistant Chat</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold ${activeTab === 'chat' ? 'bg-white/25 text-white' : 'bg-primary/10 text-primary'
                }`}
            >
              AI
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'chat' ? (
        <CareAssistantChat
          fid={fid}
          initialQuery={initialQuery}
          patientId={patientFilter}
          patientName={activePatient?.name}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Executive Care Digest</h2>
              <p className="text-xs text-text-secondary">
                Consolidated 7-day progress, upcoming appointments, and recommended admin follow-ups
              </p>
            </div>
            <button
              type="button"
              onClick={() => generate.mutate({ patientId: patientFilter, patientName: activePatient?.name })}
              disabled={generate.isPending}
              className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary-dark disabled:opacity-60 transition shadow-sm"
            >
              {generate.isPending ? (
                <>
                  <Spinner />
                  Generating update…
                </>
              ) : (
                'Generate Family Update'
              )}
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">{leftContent}</div>

            <aside className="space-y-3">
              <h2 className="text-base font-semibold text-text-primary">History</h2>
              {history.length === 0 && !pageQuery.isPending && (
                <p className="text-xs text-text-secondary">No earlier updates recorded.</p>
              )}
              <ul className="space-y-2">
                {history.map((s) => (
                  <li
                    key={s._id}
                    className="flex items-center justify-between gap-3 rounded-card bg-surface p-3 shadow-card border border-border"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-xs font-medium text-text-primary">
                        {format(new Date(s.periodStart), 'PP')} to {format(new Date(s.periodEnd), 'PP')}
                      </p>
                      <span className={`inline-block rounded-pill px-2 py-0.5 text-[10px] font-semibold ${STATUS_PILL[s.status]}`}>
                        {STATUS_LABEL[s.status]}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s._id)}
                      className="shrink-0 rounded-input border border-border px-2.5 py-1 text-xs text-text-primary hover:bg-background"
                    >
                      View
                    </button>
                  </li>
                ))}
              </ul>
              {hasMore && (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={pageQuery.isFetching}
                  className="rounded-input border border-border bg-surface px-3 py-1.5 text-xs text-text-primary hover:bg-background disabled:opacity-60"
                >
                  Load more
                </button>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
