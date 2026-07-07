import React, { useMemo, useRef, useState } from 'react';
import { SerializedTable, SerializedForm } from '@maxal_studio/kratosjs';
import { cn } from '../utils/classNames';
import { TableApiClient } from '../api/tableApi';
import { getFormSchema } from '../api/resourceApi';
import { deriveApiBaseUrl, resourceSlugFromUrl, resourceStorageKey } from '../api/urls';
import { useResourceModal } from '../contexts/ResourceModalContext';
import { WidgetRenderer } from '../components/widgets/WidgetRenderer';
import { TableTabs } from '../components/table/TableTabs';
import { TableBulkActions } from '../components/table/TableBulkActions';
import { TablePagination } from '../components/table/TablePagination';
import { GridView } from '../components/table/GridView';
import { ResourceFormModal } from '../components/modals/ResourceFormModal';
import { ActionFormModal } from '../components/ActionFormModal';
import { useTableQuery } from './hooks/useTableQuery';
import { useTableData } from './hooks/useTableData';
import { useEditableRows } from './hooks/useEditableRows';
import { useColumnVisibility } from './hooks/useColumnVisibility';
import { useTableLayout } from './hooks/useTableLayout';
import { useTableActions } from './hooks/useTableActions';
import { buildRowActions } from './defaultRowActions';
import { TableProvider, TableContextValue } from './TableContext';
import { TableToolbar } from './components/TableToolbar';
import { Slot } from '../slots/Slot';
import { TableView } from './components/TableView';
import { FiltersPanel } from './components/FiltersPanel';

export interface TableRendererProps {
	schema: SerializedTable & {
		canCreate?: boolean;
		canEdit?: boolean;
		canDelete?: boolean;
		canView?: boolean;
	};
	isResource: boolean;
	apiUrl: string;
	onBulkAction?: (action: string, selectedIds: any[]) => Promise<void> | void;
	onRowAction?: (action: string, rowId: any) => Promise<void> | void;
	className?: string;
	// For nested tables (relations), specify the actual resource info
	relatedResourceSlug?: string;
	relatedResourceApiUrl?: string;
	// Optional: Override the base API URL for modals (defaults to extracting from apiUrl)
	apiBaseUrl?: string;
	// Stacking depth for modals
	depth?: number;
	// Callback to close all stacked modals
	onCloseAll?: () => void;
	// Optional routing-based handlers (instead of modals)
	onCreateClick?: () => void;
	onEditClick?: (rowId: any) => void;
	onViewClick?: (rowId: any) => void;
	// Capability flags (default true)
	canCreate?: boolean;
	canEdit?: boolean;
	canDelete?: boolean;
	canView?: boolean;
	// Refresh key - increment to trigger a data refresh
	refreshKey?: number;
}

export function TableRenderer({
	schema,
	isResource = true,
	apiUrl,
	onBulkAction,
	onRowAction,
	className,
	relatedResourceSlug,
	relatedResourceApiUrl,
	apiBaseUrl,
	depth = 0,
	onCloseAll,
	onCreateClick,
	onEditClick,
	onViewClick,
	canCreate = true,
	canEdit = true,
	canDelete = true,
	canView = true,
	refreshKey,
}: TableRendererProps) {
	const { openModal, closeModal } = useResourceModal();

	// Derived identifiers
	const computedApiBaseUrl = apiBaseUrl || deriveApiBaseUrl(apiUrl);
	const resourceSlug = relatedResourceSlug || resourceSlugFromUrl(apiUrl);
	const resourceKey = useMemo(
		() => resourceStorageKey(apiUrl, isResource, relatedResourceSlug),
		[apiUrl, isResource, relatedResourceSlug],
	);

	const apiClient = useMemo(
		() => new TableApiClient(computedApiBaseUrl, apiUrl, isResource ? '/list' : ''),
		[computedApiBaseUrl, apiUrl, isResource],
	);

	// Query + data + change tracking
	const query = useTableQuery(schema);
	const editableRef = useRef<(rows: any[]) => void>(() => {});
	const table = useTableData({
		apiClient,
		queryParams: query.queryParams,
		refreshKey,
		onLoaded: rows => editableRef.current(rows),
	});

	const editable = useEditableRows({
		data: table.data,
		setData: table.setData,
		saveRecord: async (rowId, changes) => {
			// Relation tables save through the related resource's own endpoint
			if (relatedResourceSlug) {
				const relatedApiUrl = relatedResourceApiUrl || `${computedApiBaseUrl}/${relatedResourceSlug}`;
				const relatedClient = new TableApiClient(computedApiBaseUrl, relatedApiUrl, '/list');
				await relatedClient.updateRecord(rowId, changes);
			} else {
				await apiClient.updateRecord(rowId, changes);
			}
		},
		onSaveError: () => table.setError('Failed to save changes. Please try again.'),
	});
	editableRef.current = editable.resetTracking;

	// Presentation state
	const columns = useColumnVisibility(schema.columns, resourceKey);
	const layoutState = useTableLayout(schema, resourceSlug);
	const [openActionsRowId, setOpenActionsRowId] = useState<any>(null);

	// Row + bulk actions
	const actions = useTableActions({
		schema,
		apiClient,
		apiBaseUrl: computedApiBaseUrl,
		resourceSlug,
		relatedResourceSlug,
		relatedResourceApiUrl,
		apiUrl,
		canEdit,
		canDelete,
		canView,
		data: table.data,
		reload: table.reload,
		setError: table.setError,
		setIsLoading: table.setIsLoading,
		getQueryParams: () => query.queryParams,
		onRowAction,
		onBulkAction,
		onEditClick,
		onViewClick,
	});

	// Create modal
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [createFormSchema, setCreateFormSchema] = useState<SerializedForm | null>(null);

	const handleCreateModalOpen = async () => {
		if (!createFormSchema) {
			try {
				setCreateFormSchema(await getFormSchema(computedApiBaseUrl, resourceSlug));
			} catch (err) {
				console.error('Error loading form schema:', err);
			}
		}
		openModal(resourceSlug, 'create');
		setCreateModalOpen(true);
	};

	// Reset the cached create schema when the resource changes
	React.useEffect(() => {
		setCreateFormSchema(null);
	}, [apiUrl]);

	const handleCloseAll = () => {
		setCreateModalOpen(false);
		onCloseAll?.();
	};

	// Built-in view/edit/delete row actions are derived from capability flags;
	// custom actions from the schema are merged in (delete stays last).
	const visibleActions = useMemo(
		() => buildRowActions(schema.actions, { canView, canEdit, canDelete }),
		[schema.actions, canEdit, canDelete, canView],
	);

	const filtersLayout = schema.filtersLayout || 'inline';
	const hasWidgets =
		!relatedResourceSlug && schema.widgets && Array.isArray(schema.widgets) && schema.widgets.length > 0;

	const tableContext: TableContextValue = {
		schema,
		visibleColumns: columns.visibleColumns,
		visibleActions,
		data: table.data,
		isLoading: table.isLoading,
		error: table.error,
		setError: table.setError,
		selectedRows: actions.selectedRows,
		changedRows: editable.changedRows,
		openActionsRowId,
		onToggleActions: id => setOpenActionsRowId(openActionsRowId === id ? null : id),
		onRowSelect: actions.handleRowSelect,
		onSelectAll: actions.handleSelectAll,
		onCellChange: editable.handleCellChange,
		onRowAction: actions.handleRowAction,
		onSaveRow: editable.handleSaveRow,
		onResetRow: editable.handleResetRow,
	};

	return (
		<TableProvider value={tableContext}>
			<div className={cn('w-full', className)}>
				{hasWidgets && (
					<WidgetRenderer
						widgets={schema.widgets}
						widgetData={table.widgetData}
						className={cn(layoutState.widgetsExpanded ? 'mb-4' : 'mb-0')}
						expanded={layoutState.widgetsExpanded}
						onExpandedChange={layoutState.setWidgetsExpanded}
					/>
				)}

				{/* Tabs, search, filters */}
				<div className="mb-4 space-y-4 p-1 sm:p-0">
					{schema.tabs && Array.isArray(schema.tabs) && schema.tabs.length > 0 && (
						<TableTabs tabs={schema.tabs} activeTab={query.activeTab} onTabChange={query.handleTabClick} />
					)}

					<TableToolbar
						schema={schema}
						query={query}
						layout={layoutState.layout}
						onLayoutChange={layoutState.setLayout}
						visibleColumnNames={columns.visibleColumnNames}
						onColumnToggle={columns.handleColumnToggle}
						showCreateButton={canCreate}
						onCreateClick={onCreateClick}
						onCreateModalOpen={handleCreateModalOpen}
						onHeaderAction={actions.handleHeaderAction}
						showWidgetsToggle={hasWidgets}
						widgetsExpanded={layoutState.widgetsExpanded}
						onWidgetsToggle={() => layoutState.setWidgetsExpanded(!layoutState.widgetsExpanded)}
					/>

					{schema.filters && schema.filters.length > 0 && filtersLayout === 'inline' && (
						<FiltersPanel
							filters={schema.filters}
							values={query.filters}
							queryBuilderValues={query.queryBuilders}
							onChange={query.handleFilterChange}
							onClear={query.handleClearFilters}
							layout="inline"
						/>
					)}
				</div>

				{/* Bulk actions toolbar */}
				<TableBulkActions
					schema={schema}
					selectedCount={actions.selectedRows.size}
					onBulkAction={actionName => actions.handleBulkAction(actionName, Array.from(actions.selectedRows))}
					onClearSelection={actions.clearSelection}
					canDelete={canDelete}
				/>

				{actions.selectedRows.size > 0 && (
					<Slot
						name="table.bulkActions"
						context={{
							schema,
							resourceSlug: resourceSlugFromUrl(apiUrl),
							data: {
								selectedCount: actions.selectedRows.size,
								selectedIds: Array.from(actions.selectedRows),
							},
						}}
						as="div"
						className="mb-4 flex flex-wrap items-center gap-2 empty:hidden"
					/>
				)}

				<Slot
					name="table.aboveTable"
					context={{ schema, resourceSlug: resourceSlugFromUrl(apiUrl) }}
					as="div"
					className="mb-3 space-y-3 empty:hidden"
				/>

				{/* Table or Grid view with integrated pagination footer */}
				<div className="overflow-hidden rounded-xl border border-border bg-surface">
					{layoutState.layout === 'table' ? (
						<TableView query={query} embedded />
					) : (
						<GridView
							schema={schema}
							data={table.data}
							visibleColumns={columns.visibleColumns}
							selectedRows={actions.selectedRows}
							changedRows={editable.changedRows}
							openActionsRowId={openActionsRowId}
							onRowSelect={actions.handleRowSelect}
							onCellChange={editable.handleCellChange}
							onRowAction={actions.handleRowAction}
							onSaveRow={editable.handleSaveRow}
							onResetRow={editable.handleResetRow}
							onToggleActions={id => setOpenActionsRowId(openActionsRowId === id ? null : id)}
							isLoading={table.isLoading}
							error={table.error}
							visibleActions={visibleActions}
							embedded
						/>
					)}

					<TablePagination
						schema={schema}
						currentPage={query.currentPage}
						perPage={query.perPage}
						totalRecords={table.totalRecords}
						onPageChange={query.handlePageChange}
						onPageSizeChange={query.handlePageSizeChange}
						className="border-t border-border/60"
					/>
				</div>

				<Slot
					name="table.belowTable"
					context={{ schema, resourceSlug: resourceSlugFromUrl(apiUrl) }}
					as="div"
					className="mt-3 space-y-3 empty:hidden"
				/>

				{/* Create Modal */}
				{createModalOpen && createFormSchema && (
					<ResourceFormModal
						isOpen={createModalOpen}
						onClose={() => {
							setCreateModalOpen(false);
							closeModal();
						}}
						mode="create"
						resourceSlug={resourceSlugFromUrl(apiUrl)}
						resourceName={(schema.resource as string) || resourceSlugFromUrl(apiUrl)}
						apiBaseUrl={computedApiBaseUrl}
						formSchema={createFormSchema}
						onSuccess={() => {
							table.reload();
							closeModal();
						}}
						depth={depth}
						onCloseAll={handleCloseAll}
					/>
				)}

				{/* Action Form Modal */}
				{actions.actionFormModal && (
					<ActionFormModal
						isOpen={!!actions.actionFormModal}
						onClose={() => {
							actions.setActionFormModal(null);
							closeModal();
						}}
						actionName={actions.actionFormModal.actionName}
						actionLabel={actions.actionFormModal.actionLabel || actions.actionFormModal.actionName}
						formSchema={actions.actionFormModal.formSchema}
						recordIds={actions.actionFormModal.recordIds}
						isBulk={actions.actionFormModal.isBulk}
						requiresConfirmation={actions.actionFormModal.requiresConfirmation}
						modalDescription={actions.actionFormModal.modalDescription}
						apiBaseUrl={computedApiBaseUrl}
						resourceSlug={resourceSlug}
						onSuccess={() => {
							if (actions.actionFormModal?.isBulk) {
								actions.clearSelection();
							}
							table.reload();
							closeModal();
						}}
						depth={depth}
						onCloseAll={handleCloseAll}
					/>
				)}
			</div>
		</TableProvider>
	);
}
