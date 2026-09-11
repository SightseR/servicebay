export function Badge({ tone, children }: { tone: 'amber' | 'moss' | 'rust' | 'muted'; children: React.ReactNode }) {
  const styles = {
    amber: 'border-amber/40 text-amber bg-amber/10',
    moss: 'border-moss/40 text-moss bg-moss/10',
    rust: 'border-rust/40 text-rust bg-rust/10',
    muted: 'border-steel-light text-muted bg-panel-alt',
  }[tone];
  return <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs ${styles}`}>{children}</span>;
}
