import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SerializedForm, SerializedTable } from '@maxal_studio/kratosjs';
import { TableApiClient } from '../../api/tableApi';
import { executeAction, executeBulkAction } from '../../api/actionsApi';
import { downloadExport } from '../../api/exportApi';
import { handleRedirect } from '../../utils/redirectHandler';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { useResourceModal } from '../../contexts/ResourceModalContext';
import { translate } from '../../i18n/activeLocale';

export interface ActionFormModalState {
	actionName: string;
	recordIds: string[];
	formSchema: SerializedForm;
	isBulk?: boolean;
	requiresConfirmation?: boolean;
	modalDescription?: string;
}

export interface TableActionsApi {
	selectedRows: Set<any>;
	handleRowSelect: (id: any) => void;
	handleSelectAll: () => void;
	clearSelection: () => void;
	handleRowAction: (actionName: string, rowId: any) => Promise<void>;
	handleBulkAction: (actionName: string, selectedIds: any[]) => Promise<void>;
	handleHeaderAction: (actionName: string) => Promise<void>;
	actionFormModal: ActionFormModalState | null;
	setActionFormModal: (state: ActionFormModalState | null) => void;
}

export interface UseTableActionsOptions {
	schema: SerializedTable & { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean; canView?: boolean };
	apiClient: TableApiClient;
	apiBaseUrl: string;
	resourceSlug: string;
	relatedResourceSlug?: string;
	relatedResourceApiUrl?: string;
	apiUrl: string;
	canEdit: boolean;
	canDelete: boolean;
	canView: boolean;
	data: any[];
	reload: () => Promise<void>;
	setError: (error: string | null) => void;
	setIsLoading: (loading: boolean) => void;
	/** Current table query (search/filters/sort), used by header exports. */
	getQueryParams?: () => Record<string, any>;
	onRowAction?: (action: string, rowId: any) => Promise<void> | void;
	onBulkAction?: (action: string, selectedIds: any[]) => Promise<void> | void;
	onEditClick?: (rowId: any) => void;
	onViewClick?: (rowId: any) => void;
}

/**
 * Row selection plus the row/bulk action pipeline: view/edit modal routing,
 * delete with confirmation, handler actions (with optional form modal or
 * confirmation), redirects and toasts.
 */
export function useTableActions(options: UseTableActionsOptions): TableActionsApi {
	const {
		schema,
		apiClient,
		apiBaseUrl,
		resourceSlug,
		relatedResourceSlug,
		relatedResourceApiUrl,
		apiUrl,
		canEdit,
		canDelete,
		canView,
		data,
		reload,
		setError,
		setIsLoading,
		getQueryParams,
		onRowAction,
		onBulkAction,
		onEditClick,
		onViewClick,
	} = options;

	const navigate = useNavigate();
	const confirm = useConfirm();
	const toast = useToast();
	const { openModal } = useResourceModal();

	const [selectedRows, setSelectedRows] = useState<Set<any>>(new Set());
	const [actionFormModal, setActionFormModal] = useState<ActionFormModalState | null>(null);

	const handleRowSelect = (id: any) => {
		setSelectedRows(prev => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const handleSelectAll = () => {
		setSelectedRows(prev =>
			prev.size === data.length && data.length > 0 ? new Set() : new Set(data.map(row => row.id || row._id)),
		);
	};

	const clearSelection = () => setSelectedRows(new Set());

	/** For relation tables, mutations go to the related resource's own endpoint */
	const clientForMutations = () => {
		if (relatedResourceSlug && apiBaseUrl) {
			const url = relatedResourceApiUrl || `${apiBaseUrl}/${relatedResourceSlug}`;
			return new TableApiClient(apiBaseUrl, url, '/list');
		}
		return apiClient;
	};

	const actionApiUrl = () =>
		relatedResourceSlug && apiBaseUrl ? `${apiBaseUrl}/${relatedResourceSlug}` : relatedResourceApiUrl || apiUrl;

	/** Run an export (download) action, optionally scoped to selected record ids. */
	const runExport = async (format: string, actionName: string, recordIds?: any[]) => {
		setIsLoading(true);
		setError(null);
		try {
			await downloadExport(actionApiUrl(), apiBaseUrl, {
				format,
				action: actionName,
				query: recordIds && recordIds.length > 0 ? undefined : getQueryParams?.() || {},
				recordIds,
			});
		} catch (err: any) {
			setError(err.message || translate('core:error.export_failed'));
			console.error('Error exporting:', err);
		} finally {
			setIsLoading(false);
		}
	};

	const deleteRecords = async (ids: any[]) => {
		setIsLoading(true);
		setError(null);
		try {
			await clientForMutations().deleteRecords(ids);
			toast.success(ids.length === 1 ? 'Item deleted successfully' : `${ids.length} items deleted successfully`);
		} catch (err: any) {
			setError(err.message || translate('core:error.delete_failed'));
			console.error('Error deleting:', err);
		} finally {
			await reload();
			setIsLoading(false);
		}
	};

	const handleRowAction = async (actionName: string, rowId: any) => {
		const actionConfig = schema.actions?.find(a => a.name === actionName);

		if (actionName === 'view') {
			if (!canView) return;
			if (onViewClick) {
				onViewClick(rowId);
				return;
			}
			openModal(resourceSlug, 'view', rowId);
			return;
		}

		if (actionName === 'edit') {
			if (!canEdit) return;
			if (onEditClick) {
				onEditClick(rowId);
				return;
			}
			openModal(resourceSlug, 'edit', rowId);
			return;
		}

		if (actionName === 'delete') {
			if (!canDelete) return;
			const confirmed = await confirm({
				title: translate('core:confirm.delete_item_title'),
				message: translate('core:confirm.delete_item_message'),
				confirmLabel: translate('core:common.delete'),
				danger: true,
			});
			if (!confirmed) return;
			await deleteRecords([rowId]);
			return;
		}

		if (actionConfig?.hasHandler) {
			if (actionConfig.form) {
				setActionFormModal({
					actionName,
					recordIds: [rowId],
					formSchema: actionConfig.form,
					isBulk: false,
					requiresConfirmation: actionConfig.requiresConfirmation,
					modalDescription: actionConfig.modalDescription,
				});
				openModal(resourceSlug, 'action', rowId, actionName, actionConfig.label);
				return;
			}

			if (actionConfig.requiresConfirmation) {
				const confirmed = await confirm({
					title: actionConfig.label || actionName,
					message:
						actionConfig.modalDescription ||
						translate('core:confirm.action_single', { action: actionName }),
				});
				if (!confirmed) return;
			}

			setIsLoading(true);
			setError(null);
			try {
				const result = await executeAction(actionApiUrl(), actionName, rowId, {});

				if (handleRedirect(result, navigate) || (result.data && handleRedirect(result.data, navigate))) {
					return;
				}

				if (result.success) {
					if (result.message) {
						toast.success(result.message);
					}
				} else {
					setError(result.message || translate('core:form.action_failed'));
				}
			} catch (err: any) {
				setError(err.message || translate('core:error.action_failed'));
				console.error('Error executing action:', err);
			} finally {
				await reload();
				setIsLoading(false);
			}
			return;
		}

		if (onRowAction) {
			await onRowAction(actionName, rowId);
		}
	};

	const handleBulkAction = async (actionName: string, selectedIds: any[]) => {
		const actionConfig = schema.bulkActions?.find(a => a.name === actionName);

		if (actionName === 'delete' || actionName === 'bulkDelete') {
			if (!canDelete) return;
			const confirmed = await confirm({
				title: translate('core:confirm.delete_items_title'),
				message: translate('core:confirm.delete_items_message', { count: selectedIds.length }),
				confirmLabel: translate('core:common.delete'),
				danger: true,
			});
			if (!confirmed) return;
			clearSelection();
			await deleteRecords(selectedIds);
			return;
		}

		const exportFormat = (actionConfig as any)?.export as string | undefined;
		if (exportFormat) {
			await runExport(exportFormat, actionName, selectedIds);
			return;
		}

		if (actionConfig?.hasHandler) {
			if (actionConfig.form) {
				setActionFormModal({
					actionName,
					recordIds: selectedIds,
					formSchema: actionConfig.form,
					isBulk: true,
					requiresConfirmation: actionConfig.requiresConfirmation,
					modalDescription: actionConfig.modalDescription,
				});
				openModal(resourceSlug, 'action', undefined, actionName, actionConfig.label);
				return;
			}

			if (actionConfig.requiresConfirmation) {
				const confirmed = await confirm({
					title: actionConfig.label || actionName,
					message:
						actionConfig.modalDescription ||
						translate('core:form.confirm_bulk', { action: actionName, count: selectedIds.length }),
				});
				if (!confirmed) return;
			}

			setIsLoading(true);
			setError(null);
			try {
				const result = await executeBulkAction(actionApiUrl(), actionName, selectedIds, {});

				if (result.success) {
					if (result.message) {
						toast.success(result.message);
					}
					if (actionConfig.deselectAfterCompletion !== false) {
						clearSelection();
					}
				} else {
					setError(result.message || translate('core:error.bulk_action_failed'));
				}
			} catch (err: any) {
				setError(err.message || translate('core:error.action_failed_bulk'));
				console.error('Error executing bulk action:', err);
			} finally {
				await reload();
				setIsLoading(false);
			}
			return;
		}

		if (onBulkAction) {
			await onBulkAction(actionName, selectedIds);
			await reload();
		}
	};

	const handleHeaderAction = async (actionName: string) => {
		const actionConfig = (schema.headerActions as any[])?.find(a => a.name === actionName);
		if (!actionConfig) return;

		const exportFormat = actionConfig.export as string | undefined;
		if (exportFormat) {
			await runExport(exportFormat, actionName);
			return;
		}

		// Handler-based header action (operates on no specific records).
		if (actionConfig.hasHandler) {
			if (actionConfig.form) {
				setActionFormModal({
					actionName,
					recordIds: [],
					formSchema: actionConfig.form,
					isBulk: true,
					requiresConfirmation: actionConfig.requiresConfirmation,
					modalDescription: actionConfig.modalDescription,
				});
				openModal(resourceSlug, 'action', undefined, actionName, actionConfig.label);
				return;
			}

			if (actionConfig.requiresConfirmation) {
				const confirmed = await confirm({
					title: actionConfig.label || actionName,
					message:
						actionConfig.modalDescription ||
						translate('core:confirm.action_generic', { action: actionName }),
				});
				if (!confirmed) return;
			}

			setIsLoading(true);
			setError(null);
			try {
				const result = await executeBulkAction(actionApiUrl(), actionName, [], {});
				if (result.success) {
					if (result.message) toast.success(result.message);
				} else {
					setError(result.message || translate('core:form.action_failed'));
				}
			} catch (err: any) {
				setError(err.message || translate('core:error.action_failed'));
				console.error('Error executing header action:', err);
			} finally {
				await reload();
				setIsLoading(false);
			}
		}
	};

	return {
		selectedRows,
		handleRowSelect,
		handleSelectAll,
		clearSelection,
		handleRowAction,
		handleBulkAction,
		handleHeaderAction,
		actionFormModal,
		setActionFormModal,
	};
}
