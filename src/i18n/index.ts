// Browser-safe i18n barrel.
//
// This module ships to the React package via `dist/i18n`, so it MUST NOT import
// any `node:*` API (no AsyncLocalStorage). The server-only helpers (`t`,
// `withLocale`, request-locale resolution) are exported from the main server
// entry (`src/index.ts`) only.

export { KratosI18n, createI18n } from './KratosI18n';
export type {
	Catalog,
	NamespaceResources,
	I18nResources,
	I18nConfig,
	Direction,
	TranslateOptions,
	Translator,
} from './types';
export { coreResources, coreEn, coreSq } from './locales/core';
