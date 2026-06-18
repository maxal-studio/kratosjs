import React from 'react';
import { createRegistryContext } from './createRegistryContext';

export interface CustomBlockComponentProps {
	block: any;
	blockData?: Record<string, any>;
	apiBaseUrl?: string;
}

export type CustomBlockComponent = React.ComponentType<CustomBlockComponentProps>;

export interface BlockRegistry {
	[key: string]: CustomBlockComponent;
}

const registry = createRegistryContext<CustomBlockComponent>('BlockRegistry', {});

interface BlockRegistryProviderProps {
	children: React.ReactNode;
	customBlocks?: BlockRegistry;
}

export function BlockRegistryProvider({ children, customBlocks }: BlockRegistryProviderProps) {
	return <registry.Provider registry={customBlocks}>{children}</registry.Provider>;
}

/** Returns the flat block registry (custom page blocks keyed by type). */
export const useBlockRegistry = registry.useRegistry;
