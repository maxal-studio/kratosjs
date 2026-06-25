import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/http';
import { createRecord, getRecord, updateRecord, RecordEnvelope } from '../../api/resourceApi';
import { executeAction, executeBulkAction } from '../../api/actionsApi';
import { handleRedirect } from '../../utils/redirectHandler';
import { useConfirm } from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';
import { usePanelMetadata } from '../../contexts/PanelMetadataContext';
import { useResourceModal } from '../../contexts/ResourceModalContext';
import { translate } from '../../i18n/activeLocale';

export type ResourceFormMode = 'create' | 'edit' | 'action';

export interface UseResourceFormOptions {
	mode: ResourceFormMode;
	resourceSlug: string;
	resourceName?: string;
	apiBaseUrl: string;
	/** Edit mode */
	recordId?: any;
	/** Action mode */
	recordIds?: string[];
	actionName?: string;
	actionLabel?: string;
	isBulk?: boolean;
	requiresConfirmation?: boolean;
	modalDescription?: string;
	/** Adjust the payload before submitting (e.g. inject a relation foreign key) */
	transformPayload?: (formData: any) => any;
	/** Override the submit call entirely (e.g. relation create endpoint) */
	submit?: (payload: any) => Promise<RecordEnvelope>;
	onSuccess?: (record?: any) => void;
	onClose: () => void;
	isOpen: boolean;
}

export interface ResourceFormApi {
	modalTitle: string;
	error: string | null;
	setError: (error: string | null) => void;
	/** True while fetching the record in edit mode */
	loading: boolean;
	recordData: Record<string, any>;
	handleSubmit: (formData: any) => Promise<void>;
}

/**
 * The shared behavior of every form modal (create / edit / action):
 * record fetch, payload submission, error mapping, redirects, success
 * toasts and modal-title registration. v1 copy-pasted this across
 * CreateModal, EditModal, CreateRelationModal and ActionFormModal.
 */
export function useResourceForm(options: UseResourceFormOptions): ResourceFormApi {
	const {
		mode,
		resourceSlug,
		resourceName,
		apiBaseUrl,
		recordId,
		recordIds = [],
		actionName,
		actionLabel,
		isBulk = false,
		requiresConfirmation = false,
		modalDescription,
		transformPayload,
		submit,
		onSuccess,
		onClose,
		isOpen,
	} = options;

	const navigate = useNavigate();
	const confirm = useConfirm();
	const toast = useToast();
	const { getResourceLabel } = usePanelMetadata();
	const { setModalTitle, removeModalTitle } = useResourceModal();

	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(mode === 'edit');
	const [recordData, setRecordData] = useState<Record<string, any>>({});
	const [recordTitle, setRecordTitle] = useState<string | undefined>(undefined);

	const label = getResourceLabel(resourceSlug) || resourceName || resourceSlug;

	const modalTitle =
		mode === 'create'
			? translate('core:form.create_title', { label })
			: mode === 'edit'
				? recordTitle
					? translate('core:form.editing_title', { title: recordTitle })
					: translate('core:form.edit_title', { label })
				: actionLabel || actionName || label;

	const modalKey =
		mode === 'action'
			? `${resourceSlug}-action-${actionName}-${recordIds.join('-')}`
			: `${resourceSlug}-${mode}-${recordId ?? 'new'}`;

	// Register the modal title for the breadcrumb
	useEffect(() => {
		setModalTitle(modalKey, modalTitle);
	}, [modalKey, modalTitle, setModalTitle]);

	useEffect(() => {
		return () => {
			removeModalTitle(modalKey);
		};
	}, [modalKey, removeModalTitle]);

	// Edit mode: fetch the record
	useEffect(() => {
		if (mode !== 'edit' || !isOpen || recordId === undefined || recordId === null) return;

		let cancelled = false;
		const fetchRecord = async () => {
			setLoading(true);
			setError(null);
			try {
				const result = await getRecord(apiBaseUrl, resourceSlug, recordId);
				if (cancelled) return;
				setRecordData(result.data || {});
				setRecordTitle(result.metadata?.recordTitle);
			} catch (err: any) {
				if (!cancelled) setError(err.message);
			} finally {
				if (!cancelled) setLoading(false);
			}
		};

		fetchRecord();
		return () => {
			cancelled = true;
		};
	}, [mode, isOpen, recordId, apiBaseUrl, resourceSlug]);

	const handleSubmit = async (formData: any) => {
		setError(null);
		const payload = transformPayload ? transformPayload(formData) : formData;

		if (mode === 'action') {
			if (requiresConfirmation) {
				const confirmed = await confirm({
					title: actionLabel || actionName,
					message:
						modalDescription ||
						(isBulk
							? translate('core:form.confirm_bulk', { action: actionName, count: recordIds.length })
							: translate('core:confirm.action_single', { action: actionName })),
				});
				if (!confirmed) return;
			}

			try {
				const apiUrl = `${apiBaseUrl}/${resourceSlug}`;
				const result = isBulk
					? await executeBulkAction(apiUrl, actionName!, recordIds, payload)
					: await executeAction(apiUrl, actionName!, recordIds[0], payload);

				if (!result.success) {
					throw new Error(result.message || translate('core:form.action_failed'));
				}

				if (handleRedirect(result, navigate) || (result.data && handleRedirect(result.data, navigate))) {
					onClose();
					return;
				}

				if (result.message) {
					toast.success(result.message);
				}
				onSuccess?.(result.data);
				onClose();
			} catch (err: any) {
				setError(err.message || translate('core:form.action_failed'));
			}
			return;
		}

		try {
			const result: RecordEnvelope = submit
				? await submit(payload)
				: mode === 'create'
					? await createRecord(apiBaseUrl, resourceSlug, payload)
					: await updateRecord(apiBaseUrl, resourceSlug, recordId, payload);

			if (handleRedirect(result, navigate) || handleRedirect(result.data, navigate)) {
				onClose();
				return;
			}

			if (result.metadata?.recordTitle) {
				setRecordTitle(result.metadata.recordTitle);
			}

			onSuccess?.(result.data ?? result);
			onClose();
		} catch (err: any) {
			const fallback =
				mode === 'create' ? translate('core:form.create_failed') : translate('core:form.update_failed');
			setError(err instanceof ApiError ? err.message : err.message || fallback);
		}
	};

	return { modalTitle, error, setError, loading, recordData, handleSubmit };
}
