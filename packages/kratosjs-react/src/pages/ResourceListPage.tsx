import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { SerializedTable } from '@maxal_studio/kratosjs';
import { TableRenderer } from '../TableRenderer';
import { authenticatedFetch } from '../api/authenticatedFetch';
import { useResourceModal } from '../contexts/ResourceModalContext';
import { useTableRefresh } from '../contexts/TableRefreshContext';
import { PillButton } from '../components/ui/PillButton';
import { translate } from '../i18n/activeLocale';

export interface ResourceListPageProps {
	apiBaseUrl: string;
	resourceSlug: string;
	resourceName: string;
	pluralLabel: string;
}

export function ResourceListPage({ apiBaseUrl, resourceSlug, resourceName, pluralLabel }: ResourceListPageProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const { openModal, closeAllModals, clearModalsForResource } = useResourceModal();
	const [tableSchema, setTableSchema] = useState<SerializedTable | null>(null);
	// Track which resource the current tableSchema belongs to, to avoid mismatches on navigation
	const [tableSchemaResource, setTableSchemaResource] = useState<string | null>(null);
	const [canCreate, setCanCreate] = useState<boolean>(true);
	const [canEdit, setCanEdit] = useState<boolean>(true);
	const [canDelete, setCanDelete] = useState<boolean>(true);
	const [canView, setCanView] = useState<boolean>(true);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [refreshKey, setRefreshKey] = useState(0);
	const { registerRefresh } = useTableRefresh();

	// Register refresh callback for this resource
	useEffect(() => {
		const unregister = registerRefresh(resourceSlug, () => {
			setRefreshKey(prev => prev + 1);
		});
		return unregister;
	}, [resourceSlug, registerRefresh]);

	// Parse route to determine which modal to show via context
	// This only manages modals for THIS resource (URL-based modals)
	useEffect(() => {
		const pathParts = location.pathname.split('/').filter(Boolean);
		const resourceIndex = pathParts.indexOf(resourceSlug);

		if (resourceIndex === -1) {
			// Not on this resource page anymore, clear only this resource's modals
			clearModalsForResource(resourceSlug);
			return;
		}

		const nextPart = pathParts[resourceIndex + 1];
		const thirdPart = pathParts[resourceIndex + 2];

		// Check for edit route: /resourceSlug/:id/edit
		if (nextPart && thirdPart === 'edit') {
			if (canEdit) {
				openModal(resourceSlug, 'edit', nextPart);
			}
		} else if (nextPart === 'create') {
			// Check for create route: /resourceSlug/create
			if (canCreate) {
				openModal(resourceSlug, 'create');
			}
		} else if (nextPart && nextPart !== 'create' && nextPart !== 'edit') {
			// It's an ID for view: /resourceSlug/:id
			if (canView) {
				openModal(resourceSlug, 'view', nextPart);
			}
		} else {
			// Just the resource slug, no modals in URL: /resourceSlug
			// Clear only this resource's URL-based modals (keeps cross-resource modals open)
			clearModalsForResource(resourceSlug);
		}
		// location.key is included so the effect re-fires even when the pathname
		// hasn't changed from React Router's perspective — this happens after a
		// replaceState (back/breadcrumb) when the user clicks the same row again.
		// navigate() always produces a new location.key, replaceState never does.
	}, [location.pathname, location.key, resourceSlug, canCreate, canEdit, canView, openModal, clearModalsForResource]);

	// Fetch table schema
	useEffect(() => {
		const fetchTableSchema = async () => {
			setError(null);
			try {
				const response = await authenticatedFetch(
					`${apiBaseUrl}/${resourceSlug}/schema/table`,
					{
						headers: {
							'Content-Type': 'application/json',
						},
					},
					apiBaseUrl,
				);
				if (!response.ok) {
					if (response.status === 401) {
						throw new Error('Unauthorized - Please login again');
					}
					const error = await response.json();
					throw new Error(`Failed to fetch table schema: ${error.message || response.statusText}`);
				}
				const data = await response.json();
				setTableSchema(data.schema);
				setTableSchemaResource(resourceSlug);
				// Extract canCreate, canEdit, canDelete, and canView from API response
				setCanCreate(data.canCreate !== false); // Default to true if undefined
				setCanEdit(data.canEdit !== false); // Default to true if undefined
				setCanDelete(data.canDelete !== false); // Default to true if undefined
				setCanView(data.canView !== false); // Default to true if undefined
			} catch (err) {
				setError(err instanceof Error ? err.message : translate('core:error.load_schema'));
			} finally {
				setLoading(false);
			}
		};

		if (resourceSlug) {
			// Set loading and clear schema together to prevent race conditions
			// This prevents TableRenderer from rendering with mismatched schema/resourceKey
			setLoading(true);
			setTableSchema(null);
			setTableSchemaResource(null);
			fetchTableSchema();
		}
	}, [apiBaseUrl, resourceSlug]);

	// Handlers for table actions - navigate to update URL (these are always same-resource)
	const handleCreateClick = () => {
		navigate(`/${resourceSlug}/create`);
	};

	const handleViewClick = (rowId: any) => {
		navigate(`/${resourceSlug}/${rowId}`);
	};

	const handleEditClick = (rowId: any) => {
		navigate(`/${resourceSlug}/${rowId}/edit`);
	};

	// Guard against rendering a schema that belongs to a previous resource
	if (tableSchema && tableSchemaResource !== resourceSlug) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="w-8 h-8 text-accent animate-spin" />
				<span className="ml-3 text-fg-secondary">{translate('core:common.loading_ellipsis')}</span>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="w-8 h-8 text-accent animate-spin" />
				<span className="ml-3 text-fg-secondary">{translate('core:common.loading_ellipsis')}</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="">
				<div className="text-center py-12">
					<p className="text-red-600 mb-4">{error}</p>
					<PillButton variant="primary" onClick={() => window.location.reload()}>
						{translate('core:common.retry')}
					</PillButton>
				</div>
			</div>
		);
	}

	if (!tableSchema) {
		return (
			<div className="">
				<div className="text-center py-12 text-fg-secondary">{translate('core:state.no_table_schema')}</div>
			</div>
		);
	}

	return (
		<>
			<div className="w-full max-w-7xl mx-auto">
				<div className="w-full">
					<TableRenderer
						isResource={true}
						schema={tableSchema}
						apiUrl={`${apiBaseUrl}/${resourceSlug}`}
						apiBaseUrl={apiBaseUrl}
						onCreateClick={canCreate ? handleCreateClick : undefined}
						onEditClick={canEdit ? handleEditClick : undefined}
						onViewClick={canView ? handleViewClick : undefined}
						canCreate={canCreate}
						canEdit={canEdit}
						canDelete={canDelete}
						canView={canView}
						refreshKey={refreshKey}
					/>
				</div>
			</div>
		</>
	);
}
