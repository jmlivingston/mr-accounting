import type enUS from './content.en-US.json';

export type Content = typeof enUS;

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

export type Catalogs = Record<string, DeepPartial<Content>>;

export const fallbackLocale: string;
export const content: Content;
export const locale: string;

export function resolveLocale(requested: readonly string[], available: readonly string[]): string;
export function format(template: string, values: Record<string, string | number>): string;
export function buildContent(requested: readonly string[], available?: Catalogs): { locale: string; content: Content };
