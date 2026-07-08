import React, { useState } from 'react';
import { SerializedTable } from '@maxal_studio/kratosjs';
import { Columns3Cog, LayoutDashboard } from 'lucide-react';
import { TableSearchBar } from '../../components/table/TableSearchBar';
import { LayoutToggle } from '../../components/table/LayoutToggle';
import { ColumnTogglePopup } from '../../components/table/ColumnTogglePopup';
import { Icon } from '../../components/utils/Icon';
import { FiltersPanel } from './FiltersPanel';
import { TableQueryApi } from '../hooks/useTableQuery';
import { cn } from '../../utils/classNames';
import { TableToolbarButton, TableToolbarIconButton } from './TableToolbarButton';
import { translate } from '../../i18n/activeLocale';
import { SlotCluster } from '../../slots/SlotCluster';

export interface TableToolbarProps {
	schema: SerializedTable;
	query: TableQueryApi;
	/** Layout switching (undefined hides the toggle) */
	layout?: 'table' | 'grid';
	onLayoutChange?: (layout: 'table' | 'grid') => void;
	/** Column visibility */
	visibleColumnNames: Set<string>;
	onColumnToggle: (columnName: string, visible: boolean) => void;
	/** Create button */
	showCreateButton: boolean;
	onCreateClick?: () => void;
	onCreateModalOpen?: () => void;
	/** Header actions (e.g. Export), rendered as buttons in the toolbar */
	onHeaderAction?: (actionName: string) => void;
	/** Widgets panel toggle (icon-only, sits with other toolbar controls) */
	showWidgetsToggle?: boolean;
	widgetsExpanded?: boolean;
	onWidgetsToggle?: () => void;
}

/**
 * The row of list controls above the table: search + create, filter
 * trigger (dropdown layout), layout switch and column settings.
 */
export function TableToolbar({
	schema,
	query,
	layout,
	onLayoutChange,
	visibleColumnNames,
	onColumnToggle,
	showCreateButton,
	onCreateClick,
	onCreateModalOpen,
	onHeaderAction,
	showWidgetsToggle,
	widgetsExpanded,
	onWidgetsToggle,
}: TableToolbarProps) {
	const [isColumnToggleOpen, setIsColumnToggleOpen] = useState(false);
	const filtersLayout = schema.filtersLayout || 'inline';
	const hasFilters = !!schema.filters && schema.filters.length > 0;
	const headerActions = schema.headerActions || [];

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-end sm:gap-3">
			{schema.searchable && (
				<div className="w-full min-w-0 sm:flex-1">
					<TableSearchBar
						searchable
						searchQuery={query.searchQuery}
						onSearchChange={query.handleSearch}
						onCreateClick={onCreateClick}
						onCreateModalOpen={onCreateModalOpen}
						showCreateButton={showCreateButton}
					/>
				</div>
			)}

			<div className="flex flex-wrap items-center justify-end gap-1 sm:gap-1.5">
				{!schema.searchable && showCreateButton && (
					<button
						onClick={onCreateClick || onCreateModalOpen}
						className="inline-flex h-9 w-auto shrink-0 touch-manipulation items-center justify-center gap-2 rounded-full bg-accent px-3 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover sm:px-4"
						title={translate('core:table.create_record')}
						aria-label={translate('core:table.create_record')}>
						<Icon name="Plus" className="h-4 w-4 shrink-0" />
						<span className="hidden sm:inline">{translate('core:common.create')}</span>
					</button>
				)}

				<SlotCluster name="table.toolbar" context={{ schema }} />

				{headerActions.map(action => (
					<TableToolbarButton
						key={action.name}
						onClick={() => onHeaderAction?.(action.name)}
						icon={action.icon ? <Icon name={action.icon} size={16} /> : undefined}>
						{action.label || action.name}
					</TableToolbarButton>
				))}

				{hasFilters && filtersLayout === 'dropdown' && (
					<FiltersPanel
						filters={schema.filters!}
						values={query.filters}
						queryBuilderValues={query.queryBuilders}
						onChange={query.handleFilterChange}
						onClear={query.handleClearFilters}
						layout="dropdown"
					/>
				)}

				{showWidgetsToggle && onWidgetsToggle && (
					<TableToolbarIconButton
						id="widgets-toggle"
						className={cn(
							'relative',
							widgetsExpanded && 'bg-raised text-accent shadow-soft-sm ring-1 ring-accent/30',
						)}
						onClick={onWidgetsToggle}
						aria-expanded={widgetsExpanded}
						aria-pressed={widgetsExpanded}
						aria-controls="widgets-content"
						title={
							widgetsExpanded
								? translate('core:table.hide_widgets')
								: translate('core:table.show_widgets')
						}
						aria-label={
							widgetsExpanded
								? translate('core:table.hide_widgets')
								: translate('core:table.show_widgets')
						}>
						<LayoutDashboard className="h-4 w-4" />
						{widgetsExpanded && (
							<span
								className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-base"
								aria-hidden
							/>
						)}
					</TableToolbarIconButton>
				)}

				{schema.allowLayoutSwitch && layout && onLayoutChange && (
					<LayoutToggle layout={layout} onLayoutChange={onLayoutChange} />
				)}

				{schema.showColumnSettings !== false && (
					<div className="relative">
						<TableToolbarIconButton
							className={cn(isColumnToggleOpen && 'bg-raised text-fg shadow-soft-sm')}
							aria-label={translate('core:table.column_settings')}
							title={translate('core:table.column_settings')}
							aria-expanded={isColumnToggleOpen}
							onClick={() => setIsColumnToggleOpen(!isColumnToggleOpen)}>
							<Columns3Cog className="h-4 w-4" />
						</TableToolbarIconButton>
						<ColumnTogglePopup
							columns={schema.columns}
							visibleColumnNames={visibleColumnNames}
							onToggle={onColumnToggle}
							isOpen={isColumnToggleOpen}
							onClose={() => setIsColumnToggleOpen(false)}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
