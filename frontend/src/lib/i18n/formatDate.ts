/** Locale-aware date formatting so dates read naturally in whichever language is active. */
export function formatDate(lang: string, iso: string, opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }): string {
  return new Intl.DateTimeFormat(lang === 'it' ? 'it-IT' : 'en-GB', opts).format(new Date(iso));
}
