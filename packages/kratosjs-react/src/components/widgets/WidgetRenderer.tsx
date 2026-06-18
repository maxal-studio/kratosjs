import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useWidgetRegistry } from '../../contexts/WidgetRegistryContext';
import { ErrorBoundary } from '../errors/ErrorBoundary';
import { cn } from '../../utils/classNames';
import { widgetVisibilityStorage, getDefaultWidgetsExpanded } from '../../utils/widgetVisibilityStorage';
import { PillButton } from '../ui/PillButton';

export interface WidgetRendererProps {
	widgets?: any[];
	widgetData?: Record<string, any>;
	className?: string;
	/** When set, controlled mode: no internal toggle, use this value and callback */
	expanded?: boolean;
	onExpandedChange?: (expanded: boolean) => void;
}

export function WidgetRenderer({
	widgets,
	widgetData,
	className,
	expanded: controlledExpanded,
	onExpandedChange,
}: WidgetRendererProps) {
	const widgetRegistry = useWidgetRegistry();
	const [internalExpanded, setInternalExpanded] = useState(false);

	const isControlled = controlledExpanded !== undefined && onExpandedChange !== undefined;
	const expanded = isControlled ? controlledExpanded : internalExpanded;

	useEffect(() => {
		if (isControlled) return;
		const stored = widgetVisibilityStorage.get();
		if (stored !== null) {
			setInternalExpanded(stored);
		} else {
			setInternalExpanded(getDefaultWidgetsExpanded());
		}
	}, [isControlled]);

	const toggleExpanded = () => {
		const next = !expanded;
		if (isControlled) {
			widgetVisibilityStorage.set(next);
			onExpandedChange(next);
		} else {
			setInternalExpanded(next);
			widgetVisibilityStorage.set(next);
		}
	};

	if (!widgets || widgets.length === 0) {
		return null;
	}

	return (
		<div className={cn('mb-4', className)}>
			{!isControlled && (
				<div className="mb-2 flex justify-end">
					<PillButton
						variant="default"
						onClick={toggleExpanded}
						aria-expanded={expanded}
						aria-controls="widgets-content"
						id="widgets-toggle"
						icon={expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}>
						Widgets
					</PillButton>
				</div>
			)}

			<div
				id="widgets-content"
				role="region"
				aria-labelledby="widgets-toggle"
				className={cn(
					'overflow-hidden transition-[grid-template-rows] duration-200 ease-out',
					expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
				)}
				style={{ display: 'grid' }}>
				<div className="min-h-0">
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
						{widgets.map(widget => {
							const WidgetComponent = widgetRegistry[widget.type];
							if (!WidgetComponent) {
								console.warn(`Widget type "${widget.type}" not registered`);
								return null;
							}

							const data = widgetData?.[widget.name] ?? null;

							return (
								<div key={widget.name} className="min-w-0">
									<ErrorBoundary label={`widget "${widget.name}"`}>
										<WidgetComponent widget={widget} data={data} />
									</ErrorBoundary>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
