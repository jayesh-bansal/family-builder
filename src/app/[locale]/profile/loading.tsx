export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="h-8 w-36 bg-muted rounded animate-pulse" />
        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-border p-6 space-y-6">
          {/* Avatar + header */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-muted rounded-full animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* Form fields */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted rounded-lg animate-pulse" />
            </div>
          ))}

          <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
        </div>
      </main>
    </div>
  );
}
