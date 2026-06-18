import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';

// App-level custom components — no plugin required. The keys match the
// componentType/columnType emitted by the backend builders (src/fields, src/columns).
import StarRatingField from './components/StarRatingField';
import StarRatingColumn from './components/StarRatingColumn';
import CalloutBlock from './components/CalloutBlock';

mountAdminPanel({
	fields: { 'star-rating': StarRatingField },
	columns: { 'star-rating': StarRatingColumn },
	blocks: { callout: CalloutBlock },
});
