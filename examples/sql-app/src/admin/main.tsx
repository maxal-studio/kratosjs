import { mountAdminPanel, CircleHelp } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';

// App-level custom components — no plugin required. The keys match the
// componentType/columnType emitted by the backend builders (src/fields, src/columns).
import StarRatingField from './components/StarRatingField';
import StarRatingColumn from './components/StarRatingColumn';
import CalloutBlock from './components/CalloutBlock';

// i18n is configured once on the backend (src/index.ts) and injected into the
// page, so no locale/translation config is needed here — the LocaleSwitcher and
// every app string come from the server automatically.
mountAdminPanel({
	fields: { 'star-rating': StarRatingField },
	columns: { 'star-rating': StarRatingColumn },
	blocks: { callout: CalloutBlock },
	// Slots inject extra elements into fixed UI locations. See docs: /customization/slots
	slots: {
		'header.right': {
			id: 'help-link',
			render: () => (
				<a
					href="https://github.com/maxal-studio/kratosjs"
					target="_blank"
					rel="noreferrer"
					title="Help"
					className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fg-secondary hover:bg-hover hover:text-fg">
					<CircleHelp className="h-4 w-4" />
				</a>
			),
		},
		'panel.footer': {
			id: 'made-with',
			render: () => <span className="text-xs text-fg-muted">Built with KratosJS</span>,
		},
	},
});
