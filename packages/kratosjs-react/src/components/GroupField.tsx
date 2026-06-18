import React, { useId } from 'react';
import { FieldProps } from '../types';
import { FieldRenderer } from '../FieldRenderer';
import { HintDisplay } from './utils/HintDisplay';
import { Icon } from './utils/Icon';
import { getGridClasses } from './utils/layoutHelpers';
import { cn } from '../utils/classNames';

export function GroupField({
	label,
	description,
	hint,
	hintIcon,
	hintColor,
	icon,
	schema,
	columns,
	disabled,
	mode,
	value,
	_recordData,
	operation,
}: FieldProps & { _recordData?: any }) {
	const groupId = useId();
	const recordData = mode === 'view' && _recordData ? _recordData : value || {};
	const gridClasses = getGridClasses(columns);
	const hasHeader = Boolean(label || description || hint || icon);

	return (
		<div
			role="group"
			aria-labelledby={label ? groupId : undefined}
			className="w-full rounded-xl border border-border bg-surface">
			{hasHeader && (
				<div className="rounded-t-xl border-b border-border/60 bg-muted/25 px-4 py-3">
					<div className="flex items-start gap-3">
						{icon && (
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-raised text-fg-secondary shadow-soft-sm">
								<Icon name={icon} className="h-4 w-4" />
							</div>
						)}
						<div className="min-w-0 flex-1">
							{label && (
								<p id={groupId} className="text-sm font-semibold leading-snug text-fg">
									{label}
								</p>
							)}
							{description && (
								<p className={cn('text-sm leading-relaxed text-fg-secondary', label && 'mt-1')}>
									{description}
								</p>
							)}
							<HintDisplay hint={hint} hintIcon={hintIcon} hintColor={hintColor} />
						</div>
					</div>
				</div>
			)}

			<div className={cn('p-4', gridClasses, 'gap-y-4')}>
				{schema &&
					schema.map((field: any, index: number) => {
						const nestedField = {
							...field,
							disabled: disabled || field.disabled,
							mode: mode || field.mode,
						};
						const nestedValue = mode === 'view' && field.name ? recordData[field.name] : undefined;
						return (
							<FieldRenderer
								key={index}
								field={nestedField}
								mode={mode}
								value={nestedValue}
								operation={operation}
							/>
						);
					})}
			</div>
		</div>
	);
}
