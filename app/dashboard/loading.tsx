/** Skeleton shown while a dashboard page's data resolves. */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Loading">
      <div className="mb-6">
        <div className="h-7 w-56 rounded-lg bg-ink-800" />
        <div className="mt-2 h-4 w-96 max-w-full rounded bg-ink-850" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-4">
            <div className="h-3 w-20 rounded bg-ink-800" />
            <div className="mt-3 h-7 w-16 rounded bg-ink-800" />
          </div>
        ))}
      </div>
      <div className="card mt-5 !p-0">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b border-ink-800 px-5 py-4 last:border-0">
            <div className="h-9 w-9 shrink-0 rounded-full bg-ink-800" />
            <div className="min-w-0 flex-1">
              <div className="h-3.5 w-40 rounded bg-ink-800" />
              <div className="mt-2 h-3 w-64 max-w-full rounded bg-ink-850" />
            </div>
            <div className="h-5 w-12 rounded-full bg-ink-850" />
          </div>
        ))}
      </div>
    </div>
  );
}
