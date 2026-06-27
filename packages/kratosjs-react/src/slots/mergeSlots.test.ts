import { describe, expect, it } from 'vitest';
import { mergeSlots, appendSlots, sortSlots } from './mergeSlots';
import { mergePluginClients } from '../plugin';
import type { SlotContribution, SlotMap } from './types';

const make = (id: string, order?: number): SlotContribution => ({
	id,
	render: () => null,
	order,
});

describe('mergeSlots', () => {
	it('concatenates contributions from multiple maps targeting the same slot (no override)', () => {
		const a: SlotMap = { 'header.right': make('a') };
		const b: SlotMap = { 'header.right': make('b') };

		const merged = mergeSlots([a, b]);

		expect(merged['header.right'].map(c => c.id)).toEqual(['a', 'b']);
	});

	it('accepts a single contribution or an array per slot', () => {
		const merged = mergeSlots([{ 'sidebar.top': [make('x'), make('y')] }, { 'sidebar.top': make('z') }]);
		expect(merged['sidebar.top'].map(c => c.id)).toEqual(['x', 'y', 'z']);
	});

	it('sorts by order, keeping registration order on ties', () => {
		const merged = mergeSlots([
			{ 'table.toolbar': [make('first-default'), make('low', -10)] },
			{ 'table.toolbar': [make('high', 10), make('second-default')] },
		]);
		expect(merged['table.toolbar'].map(c => c.id)).toEqual(['low', 'first-default', 'second-default', 'high']);
	});

	it('ignores undefined maps and empty values', () => {
		const merged = mergeSlots([undefined, {}, { 'panel.footer': make('only') }]);
		expect(Object.keys(merged)).toEqual(['panel.footer']);
		expect(merged['panel.footer'].map(c => c.id)).toEqual(['only']);
	});
});

describe('appendSlots / sortSlots', () => {
	it('appendSlots mutates and returns the target', () => {
		const target = {};
		const result = appendSlots(target, { 'form.footer': make('a') });
		expect(result).toBe(target);
		expect(result['form.footer'].map(c => c.id)).toEqual(['a']);
	});

	it('sortSlots is stable for equal orders', () => {
		const resolved = { s: [make('a'), make('b'), make('c')] };
		expect(sortSlots(resolved).s.map(c => c.id)).toEqual(['a', 'b', 'c']);
	});
});

describe('mergePluginClients slot integration', () => {
	it('stacks plugin slots in plugin order and appends the app manifest last', () => {
		const pluginA = { name: 'a', slots: { 'header.right': make('from-a') } };
		const pluginB = { name: 'b', slots: { 'header.right': make('from-b') } };
		const appManifest = { name: 'app', slots: { 'header.right': make('from-app') } };

		const merged = mergePluginClients([pluginA, pluginB, appManifest]);

		expect(merged.slots['header.right'].map(c => c.id)).toEqual(['from-a', 'from-b', 'from-app']);
	});

	it('produces an empty slot map when no plugin contributes slots', () => {
		const merged = mergePluginClients([{ name: 'a' }]);
		expect(merged.slots).toEqual({});
	});
});
