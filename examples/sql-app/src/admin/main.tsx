import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';

// App-level custom components — no plugin required. The keys match the
// componentType/columnType emitted by the backend builders (src/fields, src/columns).
import StarRatingField from './components/StarRatingField';
import StarRatingColumn from './components/StarRatingColumn';
import CalloutBlock from './components/CalloutBlock';

// Same catalog modules registered on the backend (src/index.ts) — authored once,
// used on both sides. Backend-authored labels arrive already translated; these
// cover any strings authored in React (and let the LocaleSwitcher offer sq).
import enApp from '../lang/en';
import sqApp from '../lang/sq';

mountAdminPanel({
	fields: { 'star-rating': StarRatingField },
	columns: { 'star-rating': StarRatingColumn },
	blocks: { callout: CalloutBlock },
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'sq'],
		translations: { en: enApp, sq: sqApp },
	},
});
