/** Canonical key for a registration number: uppercase, all whitespace and dashes removed. */
export const regKey = (reg: string) => reg.toUpperCase().replace(/[\s-]+/g, '');
