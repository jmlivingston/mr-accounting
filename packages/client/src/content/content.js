import enUS from './content.en-US.json';

export const fallbackLocale = 'en-US';

/** @typedef {typeof enUS} Content */

/**
 * @template T
 * @typedef {{ [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }} DeepPartial
 */

/** @typedef {Record<string, DeepPartial<Content>>} Catalogs */

// Every content.<locale>.json file is picked up automatically
const modules = /** @type {Record<string, DeepPartial<Content>>} */ (
  import.meta.glob('./content.*.json', { eager: true, import: 'default' })
);

/** @type {Catalogs} */
const catalogs = Object.fromEntries(
  Object.entries(modules).map(([path, catalog]) => [/content\.(.+)\.json$/.exec(path)?.[1] ?? path, catalog]),
);

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Overlays `override` on `base`, so keys a translation is missing fall back to the base text.
 * @template T
 * @param {T} base
 * @param {DeepPartial<T> | undefined} override
 * @returns {T}
 */
function merge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) return /** @type {T} */ (override ?? base);
  /** @type {Record<string, unknown>} */
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined) result[key] = merge(base[key], /** @type {never} */ (value));
  }
  return /** @type {T} */ (result);
}

/**
 * Picks the best available locale for the user's ordered language preferences: an exact match
 * (en-US) first, then any locale with the same language (en-GB gets en-US), else the fallback.
 * @param {readonly string[]} requested
 * @param {readonly string[]} available
 * @returns {string}
 */
export function resolveLocale(requested, available) {
  const language = (/** @type {string} */ tag) => tag.split('-')[0]?.toLowerCase();
  for (const tag of requested) {
    const exact = available.find((locale) => locale.toLowerCase() === tag.toLowerCase());
    if (exact) return exact;
    const sameLanguage = available.find((locale) => language(locale) === language(tag));
    if (sameLanguage) return sameLanguage;
  }
  return fallbackLocale;
}

/**
 * Fills `{name}` placeholders in a content string.
 * @param {string} template
 * @param {Record<string, string | number>} values
 */
export function format(template, values) {
  return template.replace(/\{(\w+)\}/g, (placeholder, name) => String(values[name] ?? placeholder));
}

/**
 * @param {readonly string[]} requested
 * @param {Catalogs} [available]
 * @returns {{ locale: string, content: Content }}
 */
export function buildContent(requested, available = catalogs) {
  const locale = resolveLocale(requested, Object.keys(available));
  return { locale, content: merge(enUS, available[locale]) };
}

const { locale, content } = buildContent(globalThis.navigator?.languages ?? []);

export { content, locale };
