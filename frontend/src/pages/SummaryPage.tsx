import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { getMyFamilies } from '../lib/familyApi';
import { useGenerateSummary, useSummaryList } from '../hooks/useSummaries';
import SummaryBlock from '../components/summary/SummaryBlock';
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
  const familiesQuery = useQuery({
    queryKey: ['families', 'mine'],
    queryFn: getMyFamilies,
  });
  const families = familiesQuery.data?.families ?? [];
  const storedFid = localStorage.getItem('activeFamilyId');
  const matched = families.find((f) => f.family._id === storedFid);
  const fid = matched ? matched.family._id : families[0]?.family._id ?? '';

  const generate = useGenerateSummary(fid);
  const latestQuery = useSummaryList(fid, 1);

  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState<AiSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pageQuery = useSummaryList(fid, page);

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
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-text-primary">Family updates</h1>
        <button
          type="button"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="inline-flex items-center gap-2 rounded-input bg-primary px-4 py-2 text-white hover:bg-primary-dark disabled:opacity-60"
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
          <h2 className="text-lg font-semibold text-text-primary">History</h2>
          {history.length === 0 && !pageQuery.isPending && (
            <p className="text-sm text-text-secondary">No earlier updates.</p>
          )}
          <ul className="space-y-2">
            {history.map((s) => (
              <li
                key={s._id}
                className="flex items-center justify-between gap-3 rounded-card bg-surface p-3 shadow-card"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm text-text-primary">
                    {format(new Date(s.periodStart), 'PP')} to {format(new Date(s.periodEnd), 'PP')}
                  </p>
                  <span className={`inline-block rounded-pill px-2 py-0.5 text-xs ${STATUS_PILL[s.status]}`}>
                    {STATUS_LABEL[s.status]}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(s._id)}
                  className="shrink-0 rounded-input border border-border px-3 py-1 text-sm text-text-primary hover:bg-background"
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
              className="rounded-input border border-border bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-background disabled:opacity-60"
            >
              Load more
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
