import React from 'react';
import { SerializedTable } from '@maxal_studio/kratosjs';
import { Plus } from 'lucide-react';
import { TableRenderer } from '../../../TableRenderer';
import { SerializedRelation } from '../../../types';
import { Spinner } from '../../ui/Spinner';
import { PillButton } from '../../ui/PillButton';
import { translate } from '../../../i18n/activeLocale';

export interface RelationPanelProps {
	relation: SerializedRelation;
	schema: SerializedTable | undefined;
	apiBaseUrl?: string;
	parentResourceSlug: string;
	parentRecordId: string;
	refreshKey: number;
	depth: number;
	onCloseAll?: () => void;
	onAddRelation: (relation: SerializedRelation) => void;
}

/**
 * One relation tab's content: the "Add" button plus the nested relation table.
 */
export function RelationPanel({
	relation,
	schema,
	apiBaseUrl,
	parentResourceSlug,
	parentRecordId,
	refreshKey,
	depth,
	onCloseAll,
	onAddRelation,
}: RelationPanelProps) {
	if (!schema) {
		return (
			<div className="flex justify-center py-8">
				<Spinner label={translate('core:common.loading_ellipsis')} />
			</div>
		);
	}

	const relatedApiUrl = relation.resourceApiUrl || `${apiBaseUrl}/${relation.resourceSlug}`;

	return (
		<div className="space-y-3">
			{schema.canCreate && (
				<div className="flex justify-end">
					<PillButton
						variant="primary"
						onClick={() => onAddRelation(relation)}
						icon={<Plus className="h-4 w-4" />}>
						Add {relation.label}
					</PillButton>
				</div>
			)}

			<TableRenderer
				isResource={true}
				key={`${relation.name}-${refreshKey}`}
				schema={schema}
				apiUrl={`${apiBaseUrl}/${parentResourceSlug}/${parentRecordId}/relations/${relation.name}`}
				apiBaseUrl={apiBaseUrl}
				relatedResourceSlug={relation.resourceSlug}
				relatedResourceApiUrl={relatedApiUrl}
				canCreate={schema.canCreate as boolean}
				canEdit={schema.canEdit as boolean}
				canDelete={schema.canDelete as boolean}
				canView={schema.canView as boolean}
				depth={depth + 1}
				onCloseAll={onCloseAll}
			/>
		</div>
	);
}
