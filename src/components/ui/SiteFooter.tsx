export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[var(--card-border)] bg-[var(--bg-warm)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-center sm:flex-row sm:text-left">
        <p className="text-xs font-semibold tracking-wide text-[var(--text-secondary)]">
          NIAT CBC • Community Building Championship
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Build connections. Earn points. Rise together. © {year}
        </p>
      </div>
    </footer>
  );
}
