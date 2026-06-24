// React i18n barrel.
export { I18nProvider, useI18nContext } from './I18nProvider';
export type { I18nContextValue, I18nProviderProps } from './I18nProvider';
export { useTranslation } from './useTranslation';
export { useLocale } from './useLocale';
export { useFormatter } from './useFormatter';
export { LocaleSwitcher } from './LocaleSwitcher';
export type { LocaleSwitcherProps } from './LocaleSwitcher';
export { getActiveLocale, translate, setActiveI18n } from './activeLocale';
export { buildClientI18n, buildClientResources } from './buildClientI18n';
export type { ClientI18nConfig, ClientTranslations } from './buildClientI18n';
export { clientCoreResources } from './locales/core';
