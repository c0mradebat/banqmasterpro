export default function LoginLoading() {
  return (
    <div className="mx-auto w-full max-w-sm space-y-6 animate-pulse px-4 py-12" aria-busy="true" aria-label="Loading">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted" />
      <div className="h-10 w-full rounded-md bg-muted" />
      <div className="h-10 w-full rounded-md bg-muted" />
      <div className="h-11 w-full rounded-md bg-muted" />
    </div>
  );
}
