import React from 'react';
import { SerializedColumn } from '@maxal_studio/kratosjs';
import { cn } from '../../utils/classNames';
import { formatValue } from '../../utils/tableFormatters';
import { DeeplinkWrapper } from './DeeplinkWrapper';

export interface ColumnProps {
	column: SerializedColumn;
	record: any;
	rowIndex: number;
}

/**
 * TextColumn component for displaying text values
 */
export function TextColumnComponent({ column, record, rowIndex }: ColumnProps) {
	const value = record[column.name];

	// Handle row index
	if (column.rowIndex) {
		const displayIndex = column.rowIndexFromZero ? rowIndex : rowIndex + 1;
		return <span className="text-fg">{displayIndex}</span>;
	}

	// Format value (pass entire record for formatStateUsing function)
	const formattedValue = formatValue(value, column, record);

	if (!formattedValue) {
		return <></>;
	}

	const hasDeeplink = !!column.deeplink;

	// Handle arrays
	if (Array.isArray(formattedValue)) {
		const items = column.limit ? formattedValue.slice(0, column.limit) : formattedValue;
		const shouldRenderHtml = column.stripHtml === false;

		if (column.bulleted) {
			return (
				<ul className="list-disc list-inside space-y-1">
					{items.map((item, idx) => {
						const itemText = String(item);
						return (
							<li key={idx} className="text-fg text-sm">
								{shouldRenderHtml ? <span dangerouslySetInnerHTML={{ __html: itemText }} /> : itemText}
							</li>
						);
					})}
					{column.limit && formattedValue.length > column.limit && (
						<li className="text-fg-secondary text-sm italic">
							+{formattedValue.length - column.limit} more
						</li>
					)}
				</ul>
			);
		}

		if (column.listWithLineBreaks) {
			return (
				<div className="space-y-1">
					{items.map((item, idx) => {
						const itemText = String(item);
						return (
							<div key={idx} className="text-fg text-sm">
								{shouldRenderHtml ? <span dangerouslySetInnerHTML={{ __html: itemText }} /> : itemText}
							</div>
						);
					})}
					{column.limit && formattedValue.length > column.limit && (
						<div className="text-fg-secondary text-sm italic">
							+{formattedValue.length - column.limit} more
						</div>
					)}
				</div>
			);
		}

		// Default: comma-separated
		const joinedText = items.join(', ');
		return (
			<span className="text-fg">
				{shouldRenderHtml ? <span dangerouslySetInnerHTML={{ __html: joinedText }} /> : joinedText}
			</span>
		);
	}

	// Get styling classes
	const getTextClasses = () => {
		const classes = ['text-fg'];

		if (column.weight) {
			classes.push(`font-${column.weight}`);
		}

		if (column.fontFamily) {
			classes.push(`font-${column.fontFamily}`);
		}

		if (column.size) {
			if (typeof column.size === 'string') {
				classes.push(`text-${column.size}`);
			}
		}

		if (column.lineClamp) {
			classes.push(`line-clamp-${column.lineClamp}`);
		}

		if (!column.wrap) {
			classes.push('truncate');
		}

		return cn(classes);
	};

	// Check if HTML should be rendered (stripHtml defaults to true in backend)
	const shouldRenderHtml = column.stripHtml === false;
	const textContent = String(formattedValue);

	// Render badge
	if (column.badge) {
		let badgeColor = 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';

		if (column.color) {
			if (typeof column.color === 'object') {
				// Color mapping based on value
				const colorKey = column.color[value];
				if (colorKey) {
					badgeColor = getBadgeColorClasses(colorKey);
				}
			} else {
				badgeColor = getBadgeColorClasses(column.color);
			}
		}

		const badgeElement = (
			<span
				className={cn(
					'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
					badgeColor,
					hasDeeplink && 'hover:opacity-80',
				)}>
				{shouldRenderHtml ? <span dangerouslySetInnerHTML={{ __html: textContent }} /> : textContent}
			</span>
		);

		// Wrap badge in deeplink if exists
		if (hasDeeplink) {
			return (
				<DeeplinkWrapper column={column} record={record} value={value} className="inline-block">
					{badgeElement}
				</DeeplinkWrapper>
			);
		}

		return badgeElement;
	}

	// Regular text - render as HTML if stripHtml is false
	const textElement = shouldRenderHtml ? <span dangerouslySetInnerHTML={{ __html: textContent }} /> : textContent;

	// Wrap in deeplink if exists
	if (hasDeeplink) {
		return (
			<DeeplinkWrapper column={column} record={record} value={value} className={getTextClasses()}>
				{textElement}
			</DeeplinkWrapper>
		);
	}

	return (
		<span className={getTextClasses()}>
			{shouldRenderHtml ? <span dangerouslySetInnerHTML={{ __html: textContent }} /> : textContent}
		</span>
	);
}

function getBadgeColorClasses(color: string): string {
	const colorMap: Record<string, string> = {
		primary: 'bg-accent-soft dark:bg-accent-soft text-accent',
		secondary: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
		success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
		danger: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
		warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
		info: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300',
		gray: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
	};

	return colorMap[color] || colorMap.gray;
}
