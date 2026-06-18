import React, { createContext, useContext, useMemo } from 'react';

export interface RegistryProviderProps<T> {
	/** Custom entries; merged over the defaults, custom entries win */
	registry?: Record<string, T>;
	children: React.ReactNode;
}

/**
 * Factory for component registries (fields, columns, widgets, blocks).
 * All registries share one pattern: a flat `Record<string, Component>` of
 * defaults that custom (plugin) entries can extend or override.
 */
export function createRegistryContext<T>(displayName: string, defaults: Record<string, T>) {
	const Context = createContext<Record<string, T>>(defaults);
	Context.displayName = displayName;

	function Provider({ registry = {}, children }: RegistryProviderProps<T>) {
		const merged = useMemo(() => ({ ...defaults, ...registry }), [registry]);
		return <Context.Provider value={merged}>{children}</Context.Provider>;
	}
	Provider.displayName = `${displayName}Provider`;

	function useRegistry(): Record<string, T> {
		return useContext(Context);
	}

	return { Context, Provider, useRegistry };
}
