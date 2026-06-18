import React from 'react';
import { Icon } from '../utils/Icon';
import { TableToolbarIconButton } from '../../table/components/TableToolbarButton';

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
			title={isTable ? 'Switch to grid view' : 'Switch to table view'}
			aria-label={isTable ? 'Switch to grid view' : 'Switch to table view'}
			aria-pressed={!isTable}>
			<Icon name={isTable ? 'Table' : 'LayoutGrid'} size={16} />
		</TableToolbarIconButton>
	);
}
