import type { FieldRegistry, WidgetRegistry, BlockRegistry } from './types';
import type { ColumnRegistry } from './contexts/ColumnRegistryContext';
import type { AuthChallengeRegistry } from './contexts/AuthChallengeRegistryContext';
import type { RuleDefinition } from '@maxal_studio/kratosjs';

/**
 * Client-side manifest of a KratosJs plugin.
 *
 * Plugins export this from their `/client` entry. Components are statically
 * imported, so the app's bundler (Vite) bundles them with a single shared
 * React instance — no runtime transformation or dynamic URL loading.
 *
 * @example
 * ```typescript
 * // my-plugin/src/client/index.ts
 * import { definePluginClient } from '@maxal_studio/kratosjs-react';
 * import StarRatingField from './StarRatingField';
 *
 * export default definePluginClient({
 *   name: 'star-rating',
 *   fields: { 'star-rating': StarRatingField },
 * });
 * ```
 */
export interface KratosPluginClient {
	/** Optional plugin name (for debugging) */
	name?: string;
	/** Custom field components keyed by field type (e.g. 'star-rating') */
	fields?: FieldRegistry;
	/** Custom column components keyed by column type */
	columns?: ColumnRegistry;
	/** Custom widget components keyed by widget type */
	widgets?: WidgetRegistry;
	/** Custom page block components keyed by block type */
	blocks?: BlockRegistry;
	/**
	 * Challenge UI components keyed by challenge `type` (e.g. '2fa-totp'). Rendered on the
	 * login screen when the server returns a matching pending challenge. Pairs with the
	 * plugin's server-side `panel.registerAuthChallenge(...)`.
	 */
	authChallenges?: AuthChallengeRegistry;
	/**
	 * Custom validation rules keyed by rule name (e.g. 'phone'). Authored once as
	 * a `RuleDefinition` and referenced from both the plugin's server `register()`
	 * (via `panel.registerValidationRule`) and this client manifest, so the rule
	 * behaves identically on both sides.
	 */
	rules?: Record<string, RuleDefinition>;
}

/**
 * Identity helper that provides type inference for plugin client manifests.
 */
export function definePluginClient(client: KratosPluginClient): KratosPluginClient {
	return client;
}

export interface MergedPluginRegistries {
	fields: FieldRegistry;
	columns: ColumnRegistry;
	widgets: WidgetRegistry;
	blocks: BlockRegistry;
	authChallenges: AuthChallengeRegistry;
	rules: Record<string, RuleDefinition>;
}

/**
 * Merge multiple plugin client manifests into flat component registries.
 * Later plugins win on name collisions.
 */
export function mergePluginClients(plugins: KratosPluginClient[] = []): MergedPluginRegistries {
	const merged: MergedPluginRegistries = {
		fields: {},
		columns: {},
		widgets: {},
		blocks: {},
		authChallenges: {},
		rules: {},
	};

	for (const plugin of plugins) {
		Object.assign(merged.fields, plugin.fields ?? {});
		Object.assign(merged.columns, plugin.columns ?? {});
		Object.assign(merged.widgets, plugin.widgets ?? {});
		Object.assign(merged.blocks, plugin.blocks ?? {});
		Object.assign(merged.authChallenges, plugin.authChallenges ?? {});
		Object.assign(merged.rules, plugin.rules ?? {});
	}

	return merged;
}
