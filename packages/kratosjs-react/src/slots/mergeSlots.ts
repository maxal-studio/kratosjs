import type { SlotMap, ResolvedSlots, SlotContribution } from './types';

/**
 * Append the contributions of one `SlotMap` onto an accumulator. Unlike the
 * override-based component registries, slots are 1:many — every contribution is
 * kept, preserving the order contributors were applied in.
 */
export function appendSlots(target: ResolvedSlots, slots: SlotMap = {}): ResolvedSlots {
	for (const [name, value] of Object.entries(slots)) {
		if (!value) continue;
		const contributions = Array.isArray(value) ? value : [value];
		(target[name] ??= []).push(...contributions);
	}
	return target;
}

/**
 * Stable-sort every slot's contributions by `order` (default 0). Equal orders
 * keep registration order, since `Array.prototype.sort` is stable.
 */
export function sortSlots(resolved: ResolvedSlots): ResolvedSlots {
	for (const name of Object.keys(resolved)) {
		resolved[name] = [...resolved[name]].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
	}
	return resolved;
}

/**
 * Merge an ordered list of slot maps into a single resolved, sorted map.
 * Earlier maps contribute first; the app map is appended last by the caller.
 */
export function mergeSlots(maps: Array<SlotMap | undefined>): ResolvedSlots {
	const resolved: ResolvedSlots = {};
	for (const map of maps) {
		appendSlots(resolved, map);
	}
	return sortSlots(resolved);
}

export type { SlotContribution };
