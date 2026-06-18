import React from 'react';
import { SerializedForm } from '@maxal_studio/kratosjs';
import { FieldRenderer } from '../../../FieldRenderer';
import { cn } from '../../../utils/classNames';
import { getGridClasses } from '../../utils/layoutHelpers';

export interface RecordDetailsProps {
	formSchema: SerializedForm;
	recordData: Record<string, any>;
	apiBaseUrl?: string;
	resourceSlug: string;
}

/**
 * The "Details" tab of the view modal: renders every form component in
 * view mode against the loaded record.
 */
export function RecordDetails({ formSchema, recordData, apiBaseUrl, resourceSlug }: RecordDetailsProps) {
	const componentsArray = formSchema.components;

	if (!componentsArray || !Array.isArray(componentsArray) || componentsArray.length === 0) {
		return <div className="py-8 text-center text-fg-secondary">No fields to display</div>;
	}

	const detailsGridClasses =
		!formSchema.columns || formSchema.columns === 1 ? 'space-y-0' : getGridClasses(formSchema.columns, 'gap-0');

	return (
		<div className={cn('p-6', detailsGridClasses)}>
			{componentsArray.map((component: any, index: number) => {
				const fieldValue = component.name ? recordData[component.name] : undefined;

				// Layout components (Group, Section, Tabs, Repeater) need the full
				// record so nested fields can resolve their values.
				const needsRecordData =
					Boolean(component.needsRecordData) || Boolean(component.schema && component.schema.length > 0);

				const componentWithValue = {
					...component,
					value: fieldValue,
					mode: 'view',
					...(needsRecordData ? { _recordData: recordData } : {}),
				};

				return (
					<FieldRenderer
						key={component.name || index}
						field={componentWithValue}
						mode="view"
						value={fieldValue}
						apiBaseUrl={apiBaseUrl}
						resource={resourceSlug}
						operation="view"
					/>
				);
			})}
		</div>
	);
}
