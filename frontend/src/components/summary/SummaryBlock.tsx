import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Check, Copy, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AiSummary, SummaryItem } from '../../types/summary';
import { useSummaryDetail } from '../../hooks/useSummaries';

interface SummaryBlockProps {
  summary: AiSummary;
  fid: string;
}

function buildWhatsAppDigest(summary: AiSummary): string {
  const pStart = format(new Date(summary.periodStart), 'd MMM yyyy');
  const pEnd = format(new Date(summary.periodEnd), 'd MMM yyyy');

  const lines: string[] = [
    `🩺 *CareRelay — Family Care Update*`,
    `📅 *Period:* ${pStart} – ${pEnd}`,
    `────────────────────`,
  ];

  if (summary.content.recentlyCompleted.length > 0) {
    lines.push(``);
    lines.push(`✅ *Recently Completed:*`);
    summary.content.recentlyCompleted.forEach((i) => lines.push(`• ${i.text}`));
  }

  if (summary.content.pending.length > 0) {
    lines.push(``);
    lines.push(`⏳ *Pending Responsibilities:*`);
    summary.content.pending.forEach((i) => lines.push(`• ${i.text}`));
  }

  if (summary.content.overdue.length > 0) {
    lines.push(``);
    lines.push(`⚠️ *Needs Attention / Overdue:*`);
    summary.content.overdue.forEach((i) => lines.push(`• ${i.text}`));
  }

  if (summary.content.upcomingAppointments.length > 0) {
    lines.push(``);
    lines.push(`🏥 *Upcoming Medical Appointments:*`);
    summary.content.upcomingAppointments.forEach((i) => lines.push(`• ${i.text}`));
  }

  if (summary.content.suggestedAdminActions.length > 0) {
    lines.push(``);
    lines.push(`📋 *Suggested Coordination Actions:*`);
    summary.content.suggestedAdminActions.forEach((i) => lines.push(`• ${i.text}`));
  }

  lines.push(``);
  lines.push(`────────────────────`);
  lines.push(`_Shared via CareRelay — Family Care Hub_`);

  return lines.join('\n');
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
  const [copied, setCopied] = useState(false);
  const detail = useSummaryDetail(fid, drawerOpen ? summary._id : null);

  const handleCopyWhatsApp = async () => {
    try {
      const text = buildWhatsAppDigest(summary);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Care update copied for WhatsApp!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleOpenWhatsApp = () => {
    const text = buildWhatsAppDigest(summary);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      {/* WhatsApp Share & Export Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-primary/20 bg-primary/[0.04] p-3.5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366]/15 text-[#25D366]">
            <Share2 className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-text-primary">WhatsApp Family Digest</p>
            <p className="text-[11px] text-text-secondary">Share this structured update with family WhatsApp groups</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-input border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-background transition shadow-sm"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-text-secondary" />}
            <span>{copied ? 'Copied!' : 'Copy WhatsApp Text'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="inline-flex items-center gap-1.5 rounded-input bg-[#25D366] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#20ba5a] transition shadow-sm"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Open in WhatsApp</span>
          </button>
        </div>
      </div>

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
