export function Alert({ tone = 'error', children }: { tone?: 'error' | 'info'; children: React.ReactNode }) {
  const styles = tone === 'error' ? 'border-rust/40 bg-rust/10 text-rust' : 'border-amber/40 bg-amber/10 text-amber';
  return <div className={`rounded border px-3 py-2 text-sm ${styles}`}>{children}</div>;
}
