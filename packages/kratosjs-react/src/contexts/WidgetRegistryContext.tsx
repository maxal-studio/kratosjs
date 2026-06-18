import React from 'react';
import { createRegistryContext } from './createRegistryContext';
import { StatsWidget } from '../components/widgets/StatsWidget';
import { ChartWidget } from '../components/widgets/ChartWidget';

export interface WidgetComponentProps {
	widget: any;
	data: any;
}

export type WidgetComponent = React.ComponentType<WidgetComponentProps>;

export interface WidgetRegistry {
	[key: string]: WidgetComponent;
}

const builtInWidgets: WidgetRegistry = {
	stats: StatsWidget,
	chart: ChartWidget,
};

const registry = createRegistryContext<WidgetComponent>('WidgetRegistry', builtInWidgets);

interface WidgetRegistryProviderProps {
	children: React.ReactNode;
	customWidgets?: WidgetRegistry;
}

export function WidgetRegistryProvider({ children, customWidgets }: WidgetRegistryProviderProps) {
	return <registry.Provider registry={customWidgets}>{children}</registry.Provider>;
}

/** Returns the flat widget registry (built-ins merged with custom widgets). */
export const useWidgetRegistry = registry.useRegistry;
