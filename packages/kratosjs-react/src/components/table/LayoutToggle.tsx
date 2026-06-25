import React from 'react';
import { Icon } from '../utils/Icon';
import { TableToolbarIconButton } from '../../table/components/TableToolbarButton';
import { translate } from '../../i18n/activeLocale';

interface LayoutToggleProps {
	layout: 'table' | 'grid';
	onLayoutChange: (layout: 'table' | 'grid') => void;
}

export function LayoutToggle({ layout, onLayoutChange }: LayoutToggleProps) {
	const isTable = layout === 'table';
	const nextLayout = isTable ? 'grid' : 'table';

	return (
		<TableToolbarIconButton
			onClick={() => onLayoutChange(nextLayout)}
			title={isTable ? translate('core:table.switch_grid') : translate('core:table.switch_table')}
			aria-label={isTable ? translate('core:table.switch_grid') : translate('core:table.switch_table')}
			aria-pressed={!isTable}>
			<Icon name={isTable ? 'Table' : 'LayoutGrid'} size={16} />
		</TableToolbarIconButton>
	);
}
