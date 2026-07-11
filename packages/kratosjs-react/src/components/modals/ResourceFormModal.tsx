import React, { useState } from 'react';
import { SerializedForm } from '@maxal_studio/kratosjs';
import { FormRenderer } from '../../FormRenderer';
import { ModalDrawer } from '../ModalDrawer';
import { ErrorAlert } from '../ui/ErrorAlert';
import { Spinner } from '../ui/Spinner';
import { useResourceForm, ResourceFormMode } from './useResourceForm';
import { RecordEnvelope } from '../../api/resourceApi';
import { translate } from '../../i18n/activeLocale';
import { withPanelBase } from '../../utils/panelPath';

export interface ResourceFormModalProps {
	isOpen: boolean;
	onClose: () => void;
	mode: ResourceFormMode;
	resourceSlug: string;
	resourceName?: string;
	apiBaseUrl: string;
	formSchema: SerializedForm;
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
	depth?: number;
	onCloseAll?: () => void;
	/** Show the copy-URL button (edit mode) */
	copyUrlPath?: string;
}

/**
 * The single form modal driving create, edit and action flows.
 * Replaces v1's CreateModal / EditModal / CreateRelationModal and the form
 * part of ActionFormModal.
 */
export function ResourceFormModal({
	isOpen,
	onClose,
	mode,
	resourceSlug,
	resourceName,
	apiBaseUrl,
	formSchema,
	recordId,
	recordIds,
	actionName,
	actionLabel,
	isBulk,
	requiresConfirmation,
	modalDescription,
	transformPayload,
	submit,
	onSuccess,
	depth = 0,
	onCloseAll,
	copyUrlPath,
}: ResourceFormModalProps) {
	const [urlCopied, setUrlCopied] = useState(false);

	const form = useResourceForm({
		mode,
		resourceSlug,
		resourceName,
		apiBaseUrl,
		recordId,
		recordIds,
		actionName,
		actionLabel,
		isBulk,
		requiresConfirmation,
		modalDescription,
		transformPayload,
		submit,
		onSuccess,
		onClose,
		isOpen,
	});

	const handleCopyUrl = copyUrlPath
		? () => {
				navigator.clipboard.writeText(`${window.location.origin}${withPanelBase(copyUrlPath)}`).then(() => {
					setUrlCopied(true);
					setTimeout(() => setUrlCopied(false), 2000);
				});
			}
		: undefined;

	const operation = mode === 'edit' ? 'edit' : mode === 'create' ? 'create' : undefined;

	return (
		<ModalDrawer
			isOpen={isOpen}
			onClose={onClose}
			title={form.modalTitle}
			width="max-w-2xl"
			depth={depth}
			onCloseAll={onCloseAll}
			backdropClosesAll={mode !== 'action'}
			onCopyUrl={handleCopyUrl}
			urlCopied={urlCopied}>
			{form.loading && (
				<div className="flex items-center justify-center py-12">
					<Spinner size="lg" label={translate('core:common.loading_ellipsis')} />
				</div>
			)}

			{form.error && <ErrorAlert className="mb-4" message={form.error} onDismiss={() => form.setError(null)} />}

			{!form.loading && formSchema && (
				<FormRenderer
					schema={formSchema}
					onSubmit={form.handleSubmit}
					defaultValues={mode === 'edit' ? form.recordData : undefined}
					apiBaseUrl={apiBaseUrl}
					resource={resourceSlug}
					operation={operation}
				/>
			)}
		</ModalDrawer>
	);
}
