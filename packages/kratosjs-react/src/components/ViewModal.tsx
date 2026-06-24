import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SerializedForm } from '@maxal_studio/kratosjs';
import { ModalDrawer } from './ModalDrawer';
import { ActionFormModal } from './ActionFormModal';
import { RelationCreateModal } from './modals/RelationCreateModal';
import { useRecordView } from './modals/view/useRecordView';
import { RecordDetails } from './modals/view/RecordDetails';
import { RecordActions } from './modals/view/RecordActions';
import { RelationPanel } from './modals/view/RelationPanel';
import { RelationTabs, GroupInnerTabs, groupRelations } from './modals/view/RelationTabs';
import { Spinner } from './ui/Spinner';
import { ErrorAlert } from './ui/ErrorAlert';
import { useConfirm } from './ui/ConfirmDialog';
import { useToast } from './ui/Toast';
import { bulkDelete } from '../api/resourceApi';
import { executeAction } from '../api/actionsApi';
import { handleRedirect } from '../utils/redirectHandler';
import { usePanelMetadata } from '../contexts/PanelMetadataContext';
import { useResourceModal } from '../contexts/ResourceModalContext';
import { SerializedRelation } from '../types';
import { translate } from '../i18n/activeLocale';

export type { SerializedRelation };

interface ViewModalProps {
	/** Whether the modal is open */
	isOpen: boolean;
	/** Function to close the modal */
	onClose: () => void;
	/** Resource slug (e.g., 'users', 'posts') */
	resourceSlug: string;
	/** Display name for the resource */
	resourceName: string;
	/** ID of the record to view */
	recordId: string;
	/** API base URL */
	apiBaseUrl?: string;
	/** Form schema for displaying fields */
	formSchema: SerializedForm;
	/** Stacking depth */
	depth?: number;
	/** Close all modals */
	onCloseAll?: () => void;
}

export function ViewModal({
	isOpen,
	onClose,
	resourceSlug,
	resourceName,
	recordId,
	apiBaseUrl,
	formSchema,
	depth = 0,
	onCloseAll,
}: ViewModalProps) {
	const navigate = useNavigate();
	const confirm = useConfirm();
	const toast = useToast();
	const { getResourceLabel } = usePanelMetadata();
	const { setModalTitle, removeModalTitle, openModal, closeModal } = useResourceModal();

	// Capabilities come from the form schema
	const canEdit = formSchema.canEdit !== false;
	const canDelete = formSchema.canDelete !== false;

	const view = useRecordView(isOpen, apiBaseUrl, resourceSlug, recordId);

	// Top-level tab: 'details', a group key, or an ungrouped relation name
	const [activeTopTab, setActiveTopTab] = useState<string>('details');
	// Inner tab per group: groupKey -> relation.name
	const [activeGroupRelation, setActiveGroupRelation] = useState<Record<string, string>>({});
	const [relationRefreshKeys, setRelationRefreshKeys] = useState<Record<string, number>>({});
	const [createRelation, setCreateRelation] = useState<SerializedRelation | null>(null);
	const [urlCopied, setUrlCopied] = useState(false);
	const [actionFormModal, setActionFormModal] = useState<{
		actionName: string;
		actionLabel: string;
		formSchema: SerializedForm;
		requiresConfirmation: boolean;
		modalDescription?: string;
	} | null>(null);

	// Modal title (breadcrumb)
	const label = getResourceLabel(resourceSlug) || resourceName;
	const modalKey = `${resourceSlug}-view-${recordId}`;
	const modalTitle = view.recordTitle
		? translate('core:modal.view_record', { title: view.recordTitle })
		: translate('core:modal.view_title', { label });

	useEffect(() => {
		setModalTitle(modalKey, modalTitle);
	}, [modalKey, modalTitle, setModalTitle]);

	useEffect(() => {
		return () => {
			removeModalTitle(modalKey);
		};
	}, [modalKey, removeModalTitle]);

	// Reset tab state when closed
	useEffect(() => {
		if (!isOpen) {
			setActiveTopTab('details');
			setActiveGroupRelation({});
		}
	}, [isOpen]);

	if (!isOpen) return null;

	const handleCopyUrl = () => {
		navigator.clipboard.writeText(`${window.location.origin}/${resourceSlug}/${recordId}`).then(() => {
			setUrlCopied(true);
			setTimeout(() => setUrlCopied(false), 2000);
		});
	};

	const handleDelete = async () => {
		const confirmed = await confirm({
			title: translate('core:confirm.delete_item_title'),
			message: translate('core:confirm.delete_item_message'),
			confirmLabel: translate('core:common.delete'),
			danger: true,
		});
		if (!confirmed) return;

		try {
			await bulkDelete(apiBaseUrl!, resourceSlug, [recordId]);
			toast.success(translate('core:toast.deleted'));
			onClose();
		} catch (error: any) {
			toast.error(error.message || translate('core:toast.delete_failed'));
		}
	};

	const handleActionClick = async (action: any) => {
		// Actions with a form open the action form modal
		if (action.form && action.form.components) {
			setActionFormModal({
				actionName: action.name,
				actionLabel: action.label,
				formSchema: action.form,
				requiresConfirmation: action.requiresConfirmation || false,
				modalDescription: action.modalDescription,
			});
			openModal(resourceSlug, 'action', recordId, action.name, action.label);
			return;
		}

		if (action.requiresConfirmation) {
			const confirmed = await confirm({
				title: action.label,
				message:
					action.modalDescription ||
					translate('core:confirm.action_generic', { action: action.label.toLowerCase() }),
			});
			if (!confirmed) return;
		}

		try {
			const result = await executeAction(`${apiBaseUrl}/${resourceSlug}`, action.name, recordId, {});

			if (handleRedirect(result, navigate) || (result.data && handleRedirect(result.data, navigate))) {
				// closeModal() pops from the stack without triggering the parent's navigation
				closeModal();
				return;
			}

			if (result.success) {
				if (result.message) {
					toast.success(result.message);
				}
				view.refreshRecord();
			} else {
				toast.error(result.message || translate('core:form.action_failed'));
			}
		} catch (error: any) {
			toast.error(error.message || translate('core:error.action_failed'));
		}
	};

	// Only actions with a backend handler (and not bulk-only) are shown
	const filteredActions = (formSchema.actions?.filter((action: any) => !action.bulk && action.hasHandler) ||
		[]) as any[];
	const hasActionBar = canEdit || canDelete || filteredActions.length > 0;

	const grouped = groupRelations(view.relations);

	const renderRelation = (relation: SerializedRelation) => (
		<RelationPanel
			relation={relation}
			schema={view.relationSchemas[relation.name]}
			apiBaseUrl={apiBaseUrl}
			parentResourceSlug={resourceSlug}
			parentRecordId={recordId}
			refreshKey={relationRefreshKeys[relation.name] || 0}
			depth={depth}
			onCloseAll={onCloseAll}
			onAddRelation={setCreateRelation}
		/>
	);

	return (
		<>
			<ModalDrawer
				isOpen={isOpen}
				onClose={onClose}
				title={modalTitle}
				width="max-w-4xl"
				depth={depth}
				onCloseAll={onCloseAll}
				onCopyUrl={handleCopyUrl}
				urlCopied={urlCopied}>
				<div className="-mx-4 -mt-4 flex h-full flex-col sm:-mx-6 sm:-mt-6">
					{view.loading && (
						<div className="flex items-center justify-center py-12">
							<Spinner size="lg" label={translate('core:common.loading_ellipsis')} />
						</div>
					)}

					{view.error && (
						<div className="p-6">
							<ErrorAlert message={view.error} />
						</div>
					)}

					{!view.loading && !view.error && view.recordData && (
						<>
							<RecordActions
								actions={filteredActions}
								canEdit={canEdit}
								canDelete={canDelete}
								onAction={handleActionClick}
								onEdit={() => openModal(resourceSlug, 'edit', recordId)}
								onDelete={handleDelete}
							/>

							{view.relations.length > 0 && (
								<RelationTabs
									grouped={grouped}
									activeTopTab={activeTopTab}
									onTopTabChange={setActiveTopTab}
									hasActionBar={hasActionBar}
								/>
							)}

							<div className="flex-1 overflow-y-auto">
								{activeTopTab === 'details' && (
									<RecordDetails
										formSchema={formSchema}
										recordData={view.recordData}
										apiBaseUrl={apiBaseUrl}
										resourceSlug={resourceSlug}
									/>
								)}

								{grouped.ungrouped.map(
									relation =>
										activeTopTab === relation.name && (
											<div key={relation.name} className="p-6">
												{renderRelation(relation)}
											</div>
										),
								)}

								{grouped.groups.map(group => {
									if (activeTopTab !== group.key) return null;
									const currentInner = activeGroupRelation[group.key] || group.relations[0]?.name;
									const activeRelation =
										group.relations.find(r => r.name === currentInner) || group.relations[0];
									if (!activeRelation) return null;

									return (
										<div key={group.key} className="p-6">
											<GroupInnerTabs
												group={group}
												current={currentInner}
												onChange={name =>
													setActiveGroupRelation(prev => ({ ...prev, [group.key]: name }))
												}
											/>
											{renderRelation(activeRelation)}
										</div>
									);
								})}
							</div>
						</>
					)}
				</div>
			</ModalDrawer>

			{/* Create Relation Modal */}
			{createRelation && (
				<RelationCreateModal
					isOpen={!!createRelation}
					onClose={() => setCreateRelation(null)}
					relation={createRelation}
					parentId={recordId}
					parentResourceSlug={resourceSlug}
					apiBaseUrl={apiBaseUrl!}
					onSuccess={() => {
						setRelationRefreshKeys(prev => ({
							...prev,
							[createRelation.name]: (prev[createRelation.name] || 0) + 1,
						}));
						setCreateRelation(null);
					}}
					depth={depth + 1}
					onCloseAll={onCloseAll}
				/>
			)}

			{/* Action Form Modal */}
			{actionFormModal && (
				<ActionFormModal
					isOpen={!!actionFormModal}
					onClose={() => {
						setActionFormModal(null);
						closeModal();
					}}
					actionName={actionFormModal.actionName}
					actionLabel={actionFormModal.actionLabel}
					formSchema={actionFormModal.formSchema}
					recordIds={[recordId]}
					isBulk={false}
					requiresConfirmation={actionFormModal.requiresConfirmation}
					modalDescription={actionFormModal.modalDescription}
					apiBaseUrl={apiBaseUrl || ''}
					resourceSlug={resourceSlug}
					onSuccess={() => {
						view.refreshRecord();
						setActionFormModal(null);
						closeModal();
					}}
					depth={depth + 1}
					onCloseAll={onCloseAll}
				/>
			)}
		</>
	);
}
