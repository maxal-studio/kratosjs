import React from 'react';
import { SerializedForm } from '@maxal_studio/kratosjs';
import { ResourceFormModal } from './modals/ResourceFormModal';

export interface ActionFormModalProps {
	isOpen: boolean;
	onClose: () => void;
	actionName: string;
	actionLabel?: string;
	formSchema: SerializedForm;
	recordIds: string[];
	isBulk?: boolean;
	requiresConfirmation?: boolean;
	modalDescription?: string;
	apiBaseUrl: string;
	resourceSlug: string;
	onSuccess?: () => void;
	depth?: number;
	onCloseAll?: () => void;
}

/**
 * Thin wrapper over ResourceFormModal for actions that collect form input.
 */
export function ActionFormModal(props: ActionFormModalProps) {
	return (
		<ResourceFormModal
			isOpen={props.isOpen}
			onClose={props.onClose}
			mode="action"
			resourceSlug={props.resourceSlug}
			apiBaseUrl={props.apiBaseUrl}
			formSchema={props.formSchema}
			recordIds={props.recordIds}
			actionName={props.actionName}
			actionLabel={props.actionLabel}
			isBulk={props.isBulk}
			requiresConfirmation={props.requiresConfirmation}
			modalDescription={props.modalDescription}
			onSuccess={props.onSuccess}
			depth={props.depth}
			onCloseAll={props.onCloseAll}
		/>
	);
}
