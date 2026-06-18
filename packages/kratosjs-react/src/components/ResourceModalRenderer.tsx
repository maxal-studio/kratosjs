import React, { useState, useEffect, memo } from 'react';
import { ViewModal } from './ViewModal';
import { ResourceFormModal } from './modals/ResourceFormModal';
import { authenticatedFetch } from '../api/authenticatedFetch';
import { SerializedForm } from '@maxal_studio/kratosjs';
import { ModalState } from '../contexts/ResourceModalContext';
import { useTableRefresh } from '../contexts/TableRefreshContext';

interface ResourceModalRendererProps {
	modal: ModalState;
	apiBaseUrl: string;
	onClose: () => void;
	onCloseAll: () => void;
}

/**
 * Renders a single modal from the modal stack
 * Handles fetching form schema and rendering the appropriate modal component
 * Memoized to prevent unnecessary re-renders
 */
const ResourceModalRendererComponent = ({ modal, apiBaseUrl, onClose, onCloseAll }: ResourceModalRendererProps) => {
	const [formSchema, setFormSchema] = useState<SerializedForm | null>(null);
	const [resourceName, setResourceName] = useState<string>('');
	const [loading, setLoading] = useState(false);
	const { refreshTable } = useTableRefresh();

	// Fetch form schema when modal opens
	useEffect(() => {
		const fetchFormSchema = async () => {
			setLoading(true);
			try {
				const response = await authenticatedFetch(
					`${apiBaseUrl}/${modal.resource}/schema/form`,
					{
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
						},
					},
					apiBaseUrl,
				);

				if (!response.ok) {
					throw new Error(`Failed to fetch form schema: ${response.status}`);
				}

				const data = await response.json();
				// API returns 'schema' not 'formSchema'
				setFormSchema({
					...data.schema,
					canCreate: data.canCreate,
					canEdit: data.canEdit,
					canDelete: data.canDelete,
					canView: data.canView,
				});
				setResourceName(data.resource || data.resourceName || modal.resource);
			} catch (error) {
				console.error('Error fetching form schema:', error);
				onClose(); // Close modal on error
			} finally {
				setLoading(false);
			}
		};

		fetchFormSchema();
	}, [modal.resource, modal.recordId, modal.mode, apiBaseUrl, onClose]);

	// Don't render until schema is loaded
	if (loading || !formSchema) {
		return null;
	}

	const handleSuccess = (createdRecord?: any) => {
		refreshTable(modal.resource);
		onClose(); // Close this modal
	};

	// Render appropriate modal based on mode
	if (modal.mode === 'view') {
		return (
			<ViewModal
				isOpen={true}
				onClose={onClose}
				recordId={modal.recordId!}
				formSchema={formSchema}
				apiBaseUrl={apiBaseUrl}
				resourceSlug={modal.resource}
				resourceName={resourceName}
				depth={modal.depth}
				onCloseAll={onCloseAll}
			/>
		);
	}

	if (modal.mode === 'edit') {
		return (
			<ResourceFormModal
				isOpen={true}
				onClose={onClose}
				mode="edit"
				recordId={modal.recordId!}
				formSchema={formSchema}
				apiBaseUrl={apiBaseUrl}
				resourceSlug={modal.resource}
				resourceName={resourceName}
				onSuccess={handleSuccess}
				depth={modal.depth}
				onCloseAll={onCloseAll}
				copyUrlPath={`/${modal.resource}/${modal.recordId}/edit`}
			/>
		);
	}

	if (modal.mode === 'create') {
		return (
			<ResourceFormModal
				isOpen={true}
				onClose={onClose}
				mode="create"
				formSchema={formSchema}
				apiBaseUrl={apiBaseUrl}
				resourceSlug={modal.resource}
				resourceName={resourceName}
				onSuccess={handleSuccess}
				depth={modal.depth}
				onCloseAll={onCloseAll}
			/>
		);
	}

	return null;
};

// Memoize to prevent unnecessary re-renders when other modals in stack change
export const ResourceModalRenderer = memo(ResourceModalRendererComponent, (prevProps, nextProps) => {
	// Only re-render if the modal itself changes
	return (
		prevProps.modal.resource === nextProps.modal.resource &&
		prevProps.modal.recordId === nextProps.modal.recordId &&
		prevProps.modal.mode === nextProps.modal.mode &&
		prevProps.modal.depth === nextProps.modal.depth &&
		prevProps.apiBaseUrl === nextProps.apiBaseUrl
	);
});
