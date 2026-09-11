/** The wordmark itself is the reg-plate motif: a bordered monospace chip, doubling as the app's "plate". */
export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'text-xl px-3 py-1.5' : size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';
  return (
    <div className={`plate ${cls} border-amber/40 text-amber`}>
      SERVICE<span className="text-ink">BAY</span>
    </div>
  );
}
