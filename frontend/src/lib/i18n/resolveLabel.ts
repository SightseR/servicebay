/**
 * Every admin-authored name (section/field/option labels, stored label snapshots) is an
 * EN/IT pair with English required and Italian optional. This is the single place that
 * decides which one to show: Italian when active and present, English otherwise.
 */
export function resolveLabel(lang: string, en: string, it?: string | null): string {
  return lang === 'it' && it ? it : en;
}
