import React, { createContext, useContext, useMemo } from 'react';
import type { SlotContribution, ResolvedSlots, SlotName } from '../slots/types';
import { sortSlots } from '../slots/mergeSlots';

const SlotRegistryContext = createContext<ResolvedSlots>({});
SlotRegistryContext.displayName = 'SlotRegistry';

export interface SlotRegistryProviderProps {
	/** Resolved slot map (already merged across plugins + app). */
	slots?: ResolvedSlots;
	children: React.ReactNode;
}

/**
 * Provides the merged slot map to the tree. Slots differ from the component
 * registries (`createRegistryContext`): they are 1:many and concatenated rather
 * than overridden, so this provider keeps a sorted array per slot name.
 */
export function SlotRegistryProvider({ slots = {}, children }: SlotRegistryProviderProps) {
	const value = useMemo(() => sortSlots({ ...slots }), [slots]);
	return <SlotRegistryContext.Provider value={value}>{children}</SlotRegistryContext.Provider>;
}

/** Full resolved slot map (for introspection/tests). */
export function useSlotRegistry(): ResolvedSlots {
	return useContext(SlotRegistryContext);
}

/** The sorted contributions for a single slot, or an empty array. */
export function useSlot(name: SlotName): SlotContribution[] {
	const registry = useContext(SlotRegistryContext);
	return registry[name] ?? [];
}

export { SlotRegistryContext };
