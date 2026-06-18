import React, { useEffect, useMemo, useState } from 'react';
import { SerializedForm } from '@maxal_studio/kratosjs';
import { getFormSchema, createRelationRecord } from '../../api/resourceApi';
import { SerializedRelation } from '../../types';
import { ModalDrawer } from '../ModalDrawer';
import { Spinner } from '../ui/Spinner';
import { ResourceFormModal } from './ResourceFormModal';

export interface RelationCreateModalProps {
	isOpen: boolean;
	onClose: () => void;
	relation: SerializedRelation;
	parentId: string;
	parentResourceSlug: string;
	apiBaseUrl: string;
	onSuccess?: () => void;
	depth?: number;
	onCloseAll?: () => void;
}

/**
 * Create a related record from the view modal: fetches the related
 * resource's form schema, injects the parent foreign key as a hidden
 * field, and posts to the relation endpoint.
 */
export function RelationCreateModal({
	isOpen,
	onClose,
	relation,
	parentId,
	parentResourceSlug,
	apiBaseUrl,
	onSuccess,
	depth = 0,
	onCloseAll,
}: RelationCreateModalProps) {
	const [fetchedFormSchema, setFetchedFormSchema] = useState<SerializedForm | null>(null);
	const [loadingSchema, setLoadingSchema] = useState(false);

	useEffect(() => {
		if (!isOpen) return;

		let cancelled = false;
		const fetchSchema = async () => {
			setLoadingSchema(true);
			try {
				const schema = await getFormSchema(apiBaseUrl, relation.resourceSlug);
				if (!cancelled) setFetchedFormSchema(schema);
			} catch (err) {
				console.error('Error fetching form schema:', err);
			} finally {
				if (!cancelled) setLoadingSchema(false);
			}
		};

		fetchSchema();
		return () => {
			cancelled = true;
		};
	}, [isOpen, relation.resourceSlug, apiBaseUrl]);

	// Inject a hidden input for the parent foreign key; drop any visible FK field
	const formSchema: SerializedForm = useMemo(() => {
		if (!fetchedFormSchema?.components) {
			return { type: 'form', components: [] };
		}
		return {
			type: 'form',
			components: [
				{ type: 'hidden', name: relation.foreignKey, default: parentId, label: '' },
				...fetchedFormSchema.components.filter((component: any) => component.name !== relation.foreignKey),
			],
		};
	}, [relation, parentId, fetchedFormSchema]);

	if (loadingSchema) {
		return (
			<ModalDrawer
				isOpen={isOpen}
				onClose={onClose}
				title={`Add ${relation.label}`}
				depth={depth}
				onCloseAll={onCloseAll}>
				<div className="flex items-center justify-center py-8">
					<Spinner size="lg" label="Loading form..." />
				</div>
			</ModalDrawer>
		);
	}

	return (
		<ResourceFormModal
			isOpen={isOpen}
			onClose={onClose}
			mode="create"
			resourceSlug={relation.resourceSlug}
			resourceName={relation.label}
			apiBaseUrl={apiBaseUrl}
			formSchema={formSchema}
			submit={payload => createRelationRecord(apiBaseUrl, parentResourceSlug, parentId, relation.name, payload)}
			onSuccess={onSuccess}
			depth={depth}
			onCloseAll={onCloseAll}
		/>
	);
}
