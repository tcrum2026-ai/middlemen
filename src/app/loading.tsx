export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 rounded bg-stone-200" />
        <div className="h-24 rounded-xl bg-stone-100" />
        <div className="h-24 rounded-xl bg-stone-100" />
      </div>
    </div>
  );
}
