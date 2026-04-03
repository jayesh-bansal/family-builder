export default function TreeLoading() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="h-8 w-36 bg-muted rounded animate-pulse" />
        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
      </header>

      <div className="h-[calc(100vh-8rem)] relative flex items-center justify-center">
        {/* Toolbar skeleton */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <div className="h-9 w-40 bg-muted rounded-lg animate-pulse" />
          <div className="h-9 w-32 bg-muted rounded-lg animate-pulse" />
        </div>

        {/* Center node skeleton */}
        <div className="flex flex-col items-center gap-3">
          <div className="h-20 w-20 bg-muted rounded-full animate-pulse" />
          <div className="h-5 w-28 bg-muted rounded animate-pulse" />
          <p className="text-sm text-secondary mt-2">Loading your family tree...</p>
        </div>
      </div>
    </div>
  );
}
