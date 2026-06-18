import React from 'react';
import { FieldProps } from '../types';
import { FieldRenderer } from '../FieldRenderer';
import { Icon } from './utils/Icon';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { getFieldLayoutClasses } from './utils/layoutHelpers';

// Section background by depth; no bg-muted — direct opacity scale for light and dark.
const SECTION_BG_LIGHT = [
	'bg-black/[0.04]',
	'bg-black/[0.08]',
	'bg-black/[0.12]',
	'bg-black/[0.16]',
	'bg-black/[0.20]',
	'bg-black/[0.25]',
	'bg-black/[0.30]',
	'bg-black/[0.35]',
];
const SECTION_BG_DARK = [
	'dark:bg-black/35',
	'dark:bg-black/50',
	'dark:bg-black/62',
	'dark:bg-black/72',
	'dark:bg-black/80',
	'dark:bg-black/87',
	'dark:bg-black/93',
	'dark:bg-black',
];

export function SectionField({
	heading,
	description,
	icon,
	collapsible,
	collapsed: initialCollapsed,
	compact,
	aside,
	mode,
	schema,
	columns,
	disabled,
	value,
	_recordData,
	operation,
	isLastSectionInParent,
	sectionDepth = 0,
}: FieldProps & { _recordData?: any; isLastSectionInParent?: boolean; sectionDepth?: number }) {
	// Default to collapsed if not specified
	const [isCollapsed, setIsCollapsed] = React.useState(initialCollapsed !== undefined ? initialCollapsed : true);

	// In view mode, sections are always expanded and not collapsible
	const isViewMode = mode === 'view';
	const viewCollapsed = false;

	if (!heading && !description) {
		// Section without header - just a visual separator
		return <div className="my-6 border-t border-gray-200 dark:border-gray-700" />;
	}

	const toggleCollapse = () => {
		if (collapsible && !isViewMode) {
			setIsCollapsed(!isCollapsed);
		}
	};

	// In view mode, use viewCollapsed (always false)
	const displayCollapsed = isViewMode ? viewCollapsed : isCollapsed;

	// In view mode, use _recordData if provided, otherwise use value
	const recordData = mode === 'view' && _recordData ? _recordData : value || {};

	// Get layout classes for nested fields
	const fieldLayoutClasses = getFieldLayoutClasses(columns);

	// At each level, the last section gets smaller padding and no border; others get full padding and border.
	// Background gets darker for each nesting level; supports arbitrary depth (capped at array length).
	const hasNestedSections =
		schema && Array.isArray(schema) && schema.some((f: { type?: string }) => f.type === 'section');
	const isLast = Boolean(isLastSectionInParent);
	const depthIndex = Math.min(sectionDepth, SECTION_BG_LIGHT.length - 1);
	const bgByDepth = `${SECTION_BG_LIGHT[depthIndex]} ${SECTION_BG_DARK[depthIndex]}`;
	// Dark mode uses solid colors from styles.css (.dark .section-depth-bg[data-section-depth="1"] etc.)
	const bodyWrapperClass = `${bgByDepth} section-depth-bg`;
	const bodyWrapperData = { 'data-section-depth': depthIndex + 1 }; // CSS uses "1"–"8"
	// Last section: same padding as others, only border-bottom removed.
	const bodyClasses = isLast
		? `rounded-lg ${bodyWrapperClass} p-4 border border-gray-100 dark:border-gray-700/50 border-b-0 mb-2`
		: `rounded-lg ${bodyWrapperClass} p-4 border border-gray-100 dark:border-gray-700/50 mb-2`;
	const outerClasses = hasNestedSections && !isLast ? (compact ? 'my-4' : 'my-6') : '';

	return (
		<div className={outerClasses}>
			<div className={`${aside ? 'flex gap-6' : ''}`}>
				{/* Heading section */}
				<div className={`${aside ? 'w-1/3' : 'mb-4'}`}>
					<div className="flex items-center gap-2">
						{icon && <Icon name={icon} size={20} className="text-gray-500 dark:text-gray-400" />}
						{heading && (
							<h3
								className={`font-semibold ${aside ? 'text-lg' : 'text-xl'} text-gray-900 dark:text-gray-100 ${
									collapsible && !isViewMode
										? 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-2'
										: ''
								}`}
								onClick={toggleCollapse}>
								{heading}
								{collapsible &&
									!isViewMode &&
									(displayCollapsed ? (
										<ChevronRight size={16} className="text-gray-500 dark:text-gray-400" />
									) : (
										<ChevronDown size={16} className="text-gray-500 dark:text-gray-400" />
									))}
							</h3>
						)}
					</div>
					{description && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{description}</p>}
				</div>

				{/* Content section — body has background and padding so nested sections read clearly */}
				{aside ? (
					<div className="flex-1">
						{/* Render nested schema fields if present and section is not collapsed */}
						{schema &&
							Array.isArray(schema) &&
							!displayCollapsed &&
							(() => {
								const lastSectionIndex = schema.reduce(
									(last, f, i) => (f.type === 'section' ? i : last),
									-1 as number,
								);
								return (
									<div className={bodyClasses} {...bodyWrapperData}>
										<div className={fieldLayoutClasses}>
											{schema.map(
												(
													field: Record<string, unknown> & { type?: string; name?: string },
													index: number,
												) => {
													const isSection = field.type === 'section';
													const nestedField = {
														...field,
														disabled: disabled || field.disabled,
														mode: mode || field.mode,
														// Only the single section at lastSectionIndex is "last"; others get false so border shows.
														isLastSectionInParent: isSection
															? lastSectionIndex >= 0 && index === lastSectionIndex
															: undefined,
														sectionDepth: isSection ? sectionDepth + 1 : undefined,
													};
													const nestedValue =
														mode === 'view' && field.name
															? recordData[field.name]
															: undefined;
													return (
														<FieldRenderer
															key={index}
															field={nestedField as FieldProps}
															mode={mode}
															value={nestedValue}
															operation={operation}
														/>
													);
												},
											)}
										</div>
									</div>
								);
							})()}
					</div>
				) : (
					<>
						{/* Render nested schema fields if present and section is not collapsed */}
						{schema &&
							Array.isArray(schema) &&
							!displayCollapsed &&
							(() => {
								const lastSectionIndex = schema.reduce(
									(last, f, i) => (f.type === 'section' ? i : last),
									-1 as number,
								);
								return (
									<div
										className={!isLast && hasNestedSections ? `mt-4 ${bodyClasses}` : bodyClasses}
										{...bodyWrapperData}>
										<div className={fieldLayoutClasses}>
											{schema.map(
												(
													field: Record<string, unknown> & { type?: string; name?: string },
													index: number,
												) => {
													const isSection = field.type === 'section';
													const nestedField = {
														...field,
														disabled: disabled || field.disabled,
														mode: mode || field.mode,
														isLastSectionInParent: isSection
															? lastSectionIndex >= 0 && index === lastSectionIndex
															: undefined,
														sectionDepth: isSection ? sectionDepth + 1 : undefined,
													};
													const nestedValue =
														mode === 'view' && field.name
															? recordData[field.name]
															: undefined;
													return (
														<FieldRenderer
															key={index}
															field={nestedField as FieldProps}
															mode={mode}
															value={nestedValue}
															operation={operation}
														/>
													);
												},
											)}
										</div>
									</div>
								);
							})()}
						{/* Separator line — not for the last section at this level */}
						{hasNestedSections && !isLast && (
							<div className="mt-4 border-t border-gray-200 dark:border-gray-700" />
						)}
					</>
				)}
			</div>
		</div>
	);
}
