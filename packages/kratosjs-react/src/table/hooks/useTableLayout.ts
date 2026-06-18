import { useEffect, useState } from 'react';
import { SerializedTable } from '@maxal_studio/kratosjs';
import { layoutStorage } from '../../utils/layoutStorage';
import { widgetVisibilityStorage, getDefaultWidgetsExpanded } from '../../utils/widgetVisibilityStorage';

export interface TableLayoutApi {
	layout: 'table' | 'grid';
	setLayout: (layout: 'table' | 'grid') => void;
	widgetsExpanded: boolean;
	setWidgetsExpanded: (expanded: boolean) => void;
}

/**
 * Persisted presentation state: table-vs-grid layout (per resource) and
 * the widgets expanded/collapsed preference (global).
 */
export function useTableLayout(schema: SerializedTable, resourceSlug: string): TableLayoutApi {
	const [layout, setLayoutState] = useState<'table' | 'grid'>(() => {
		const defaultLayout: 'table' | 'grid' = schema.defaultLayout === 'grid' ? 'grid' : 'table';
		if (schema.allowLayoutSwitch) {
			return layoutStorage.getLayout(resourceSlug, defaultLayout);
		}
		return defaultLayout;
	});

	const [widgetsExpanded, setWidgetsExpandedState] = useState(false);

	// Hydrate widgets-expanded from localStorage (desktop default expanded)
	useEffect(() => {
		const stored = widgetVisibilityStorage.get();
		setWidgetsExpandedState(stored !== null ? stored : getDefaultWidgetsExpanded());
	}, []);

	const setLayout = (next: 'table' | 'grid') => {
		setLayoutState(next);
		layoutStorage.setLayout(resourceSlug, next);
	};

	const setWidgetsExpanded = (next: boolean) => {
		widgetVisibilityStorage.set(next);
		setWidgetsExpandedState(next);
	};

	return { layout, setLayout, widgetsExpanded, setWidgetsExpanded };
}
