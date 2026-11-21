import { useSocketStore } from '../../store/socketStore';

export default function RealTimeIndicator() {
  const isConnected = useSocketStore((s) => s.isConnected);

  if (isConnected) {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-1.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
        </span>
        <span className="text-text-secondary text-xs">Live</span>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className="flex items-center gap-1.5">
      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-warning" />
      <span className="text-warning text-xs">Reconnecting…</span>
    </div>
  );
}
