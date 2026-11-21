import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { AiSummary, SummaryItem } from '../../types/summary';
import { useSummaryDetail } from '../../hooks/useSummaries';

interface SummaryBlockProps {
  summary: AiSummary;
  fid: string;
}

const SECTIONS: {
  key: keyof AiSummary['content'];
  title: string;
  headingClass: string;
}[] = [
  { key: 'recentlyCompleted', title: 'Recently completed', headingClass: 'text-text-primary' },
  { key: 'pending', title: 'Pending', headingClass: 'text-text-primary' },
  { key: 'overdue', title: 'Overdue', headingClass: 'text-error' },
  { key: 'upcomingAppointments', title: 'Upcoming appointments', headingClass: 'text-text-primary' },
  { key: 'suggestedAdminActions', title: 'Suggested administrative actions', headingClass: 'text-text-primary' },
];

function ItemList({ items }: { items: SummaryItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-text-secondary">Nothing to report</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={index} className="flex items-start justify-between gap-3 text-sm text-text-primary">
          <span>{item.text}</span>
          <span className="shrink-0 rounded-pill bg-background px-2 py-0.5 text-xs text-text-secondary">
            {item.sourceIds.length} {item.sourceIds.length === 1 ? 'source' : 'sources'}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function SummaryBlock({ summary, fid }: SummaryBlockProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const detail = useSummaryDetail(fid, drawerOpen ? summary._id : null);

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-card bg-surface p-5 shadow-card">
        {SECTIONS.map((section) => (
          <section key={section.key} className="space-y-2">
            <h3 className={`text-sm font-semibold ${section.headingClass}`}>{section.title}</h3>
            <ItemList items={summary.content[section.key]} />
          </section>
        ))}
      </div>

      <div className="rounded-card border border-warning bg-surface p-4 text-sm text-text-secondary">
        {summary.disclaimer}
      </div>

      <div>
        <button
          type="button"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((open) => !open)}
          className="rounded-input border border-border bg-surface px-3 py-1.5 text-sm text-text-primary hover:bg-background"
        >
          View source records
        </button>

        {drawerOpen && (
          <div className="mt-3 rounded-card border border-border bg-surface p-4">
            {detail.isLoading && <p className="text-sm text-text-secondary">Loading source records…</p>}
            {detail.isError && (
              <p className="text-sm text-error">Could not load the source records.</p>
            )}
            {detail.data && detail.data.sourceActivities.length === 0 && (
              <p className="text-sm text-text-secondary">No source records found.</p>
            )}
            {detail.data && detail.data.sourceActivities.length > 0 && (
              <ul className="space-y-3">
                {detail.data.sourceActivities.map((activity) => (
                  <li key={activity._id} className="text-sm text-text-primary">
                    <span className="font-bold">{activity.actorName}</span> {activity.action}{' '}
                    {activity.entityTitle}
                    <span className="block text-xs text-text-secondary">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
