export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="h-8 w-36 bg-muted rounded animate-pulse" />
        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome section skeleton */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 bg-muted rounded-full animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-64 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-border p-5 flex items-center gap-3"
            >
              <div className="h-12 w-12 bg-muted rounded-xl animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-8 bg-muted rounded animate-pulse" />
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-border p-6 flex flex-col items-center gap-3"
            >
              <div className="h-10 w-10 bg-muted rounded animate-pulse" />
              <div className="h-5 w-20 bg-muted rounded animate-pulse" />
              <div className="h-9 w-24 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
