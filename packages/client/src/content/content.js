import enUS from './content.en-US.json';

export const fallbackLocale = 'en-US';

// Every content.<locale>.json file is picked up automatically
const modules = import.meta.glob('./content.*.json', { eager: true, import: 'default' });

const catalogs = Object.fromEntries(
  Object.entries(modules).map(([path, catalog]) => [/content\.(.+)\.json$/.exec(path)?.[1] ?? path, catalog]),
);

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function merge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) return override ?? base;
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) result[key] = merge(base[key], value);
  }
  return result;
}

export function resolveLocale(requested, available) {
  const language = (tag) => tag.split('-')[0]?.toLowerCase();
  for (const tag of requested) {
    const exact = available.find((locale) => locale.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;
    const sameLanguage = available.find((locale) => language(locale) === language(tag));
    if (sameLanguage) return sameLanguage;
  }
  return fallbackLocale;
}

export function format(template, values) {
  return template.replace(/\{(\w+)\}/g, (placeholder, name) => String(values[name] ?? placeholder));
}

export function buildContent(requested, available = catalogs) {
  const locale = resolveLocale(requested, Object.keys(available));
  return { locale, content: merge(enUS, available[locale]) };
}

const { locale, content } = buildContent(globalThis.navigator?.languages ?? []);

export { content, locale };
