import { describe, expect, it } from 'vitest';
import enUS from './content.en-US.json';
import { buildContent, content, fallbackLocale, format, locale, resolveLocale } from './content';

const available = ['en-US', 'es', 'fr-CA'];

function leafPaths(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => leafPaths(child, prefix ? `${prefix}.${key}` : key));
}

describe('resolveLocale', () => {
  it('picks an exact match', () => {
    expect(resolveLocale(['fr-CA'], available)).toBe('fr-CA');
  });

  it('matches case-insensitively', () => {
    expect(resolveLocale(['EN-us'], available)).toBe('en-US');
  });

  it('falls back to a locale with the same language', () => {
    expect(resolveLocale(['en-GB'], available)).toBe('en-US');
    expect(resolveLocale(['es-MX'], available)).toBe('es');
    expect(resolveLocale(['fr-FR'], available)).toBe('fr-CA');
  });

  it('follows the order of the user preferences', () => {
    expect(resolveLocale(['de', 'es-MX', 'en-US'], available)).toBe('es');
  });

  it('falls back to en-US when nothing matches', () => {
    expect(resolveLocale(['de', 'ja'], available)).toBe(fallbackLocale);
    expect(resolveLocale([], available)).toBe(fallbackLocale);
  });
});

describe('format', () => {
  it('fills placeholders, including repeated ones', () => {
    expect(format('{a} and {b} and {a}', { a: 1, b: 'two' })).toBe('1 and two and 1');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(format('Hello {name}', {})).toBe('Hello {name}');
  });
});

describe('buildContent', () => {
  const spanish = { balance: { heading: 'Saldo' }, transactionList: { columns: { date: 'Fecha' } } };

  it('uses the translation when one exists', () => {
    expect(buildContent(['es'], { 'en-US': enUS, es: spanish }).content.balance.heading).toBe('Saldo');
  });

  it('fills in missing keys from en-US, including nested ones', () => {
    const { content: merged } = buildContent(['es'], { es: spanish });
    expect(merged.transactionList.columns.date).toBe('Fecha');
    expect(merged.transactionList.columns.amount).toBe(enUS.transactionList.columns.amount);
    expect(merged.login.heading).toBe(enUS.login.heading);
  });

  it('uses en-US content for unsupported languages', () => {
    const result = buildContent(['de'], { 'en-US': enUS, es: spanish });
    expect(result.locale).toBe('en-US');
    expect(result.content).toEqual(enUS);
  });

  it('does not mutate the en-US catalog', () => {
    buildContent(['es'], { es: spanish });
    expect(enUS.balance.heading).toBe('Balance');
  });
});

describe('content catalogs', () => {
  const catalogs = import.meta.glob<Record<string, unknown>>('./content.*.json', { eager: true, import: 'default' });

  it('includes an en-US catalog', () => {
    expect(Object.keys(catalogs)).toContain('./content.en-US.json');
  });

  it.each(Object.entries(catalogs))('%s only uses known keys and non-empty strings', (_file, catalog) => {
    const known = new Set(leafPaths(enUS));
    for (const path of leafPaths(catalog)) expect(known).toContain(path);
    for (const path of leafPaths(catalog)) {
      const text = path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], catalog);
      expect(typeof text === 'string' && text.trim().length > 0).toBe(true);
    }
  });
});

describe('active content', () => {
  it('resolves to en-US under the test environment', () => {
    expect(locale).toBe('en-US');
    expect(content).toEqual(enUS);
  });
});
