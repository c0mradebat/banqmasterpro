export default function AppLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading page">
      <div className="h-9 w-48 max-w-full rounded-md bg-muted" />
      <div className="h-24 w-full rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-32 rounded-lg bg-muted" />
        <div className="h-32 rounded-lg bg-muted" />
        <div className="h-32 rounded-lg bg-muted sm:col-span-2 lg:col-span-1" />
      </div>
      <div className="h-64 w-full rounded-lg bg-muted" />
    </div>
  );
}
