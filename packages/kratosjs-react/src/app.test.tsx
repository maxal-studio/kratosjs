import { describe, expect, it } from 'vitest';
import { resolveRegistries } from './app';
import { definePluginClient } from './plugin';

// Minimal stand-in components — resolveRegistries only moves references around.
const AppField = () => null;
const PluginField = () => null;
const AppColumn = () => null;
const AppWidget = () => null;
const AppBlock = () => null;

describe('resolveRegistries (mountAdminPanel direct registration)', () => {
	it('exposes app-level fields/columns/widgets/blocks without a plugin', () => {
		const registries = resolveRegistries({
			fields: { 'star-rating': AppField },
			columns: { 'star-rating': AppColumn },
			widgets: { card: AppWidget },
			blocks: { 'lives-page': AppBlock },
		});

		expect(registries.fields['star-rating']).toBe(AppField);
		expect(registries.columns['star-rating']).toBe(AppColumn);
		expect(registries.widgets.card).toBe(AppWidget);
		expect(registries.blocks['lives-page']).toBe(AppBlock);
	});

	it('lets app registrations win over a plugin on the same key', () => {
		const plugin = definePluginClient({
			name: 'star-rating',
			fields: { 'star-rating': PluginField },
		});

		const registries = resolveRegistries({
			plugins: [plugin],
			fields: { 'star-rating': AppField },
		});

		expect(registries.fields['star-rating']).toBe(AppField);
	});

	it('keeps plugin entries that the app does not override', () => {
		const plugin = definePluginClient({ fields: { 'plugin-only': PluginField } });

		const registries = resolveRegistries({
			plugins: [plugin],
			fields: { 'star-rating': AppField },
		});

		expect(registries.fields['plugin-only']).toBe(PluginField);
		expect(registries.fields['star-rating']).toBe(AppField);
	});

	it('flows app-level validation rules into the merged rule map', () => {
		const phoneRule = { name: 'phone', validate: () => true } as any;
		const registries = resolveRegistries({ rules: { phone: phoneRule } });
		expect(registries.rules.phone).toBe(phoneRule);
	});

	it('returns empty registries when given no options', () => {
		const registries = resolveRegistries();
		expect(registries.fields).toEqual({});
		expect(registries.columns).toEqual({});
		expect(registries.widgets).toEqual({});
		expect(registries.blocks).toEqual({});
		expect(registries.rules).toEqual({});
	});
});
