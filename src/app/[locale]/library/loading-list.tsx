/** Placeholder while a library list streams in. */
export function LoadingList() {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      <div className="h-11 w-40 rounded-md bg-surface-sunk" />
      <div className="h-20 rounded-lg bg-surface-sunk" />
      <div className="h-20 rounded-lg bg-surface-sunk" />
    </div>
  );
}
