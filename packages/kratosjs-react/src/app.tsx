import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminPanel } from './components/AdminPanel';
import { mergePluginClients } from './plugin';
import type { KratosPluginClient, MergedPluginRegistries } from './plugin';
import type { FieldRegistry, WidgetRegistry, BlockRegistry } from './types';
import type { ColumnRegistry } from './contexts/ColumnRegistryContext';
import type { AuthChallengeRegistry } from './contexts/AuthChallengeRegistryContext';
import type { RuleDefinition } from '@maxal_studio/kratosjs';
import { ValidationEngine } from '@maxal_studio/kratosjs/dist/validation';

export interface MountAdminPanelOptions {
	/** Client manifests of the plugins used by this panel */
	plugins?: KratosPluginClient[];
	/**
	 * Custom field components keyed by field type (e.g. `'star-rating'`).
	 * Registered directly by the app — no plugin required. The key must match the
	 * `componentType` emitted by the backend builder. App entries override plugins.
	 */
	fields?: FieldRegistry;
	/** Custom table column components keyed by column type. App entries override plugins. */
	columns?: ColumnRegistry;
	/** Custom widget components keyed by widget type. App entries override plugins. */
	widgets?: WidgetRegistry;
	/** Custom page block components keyed by block type. App entries override plugins. */
	blocks?: BlockRegistry;
	/** Challenge UI components keyed by challenge type. App entries override plugins. */
	authChallenges?: AuthChallengeRegistry;
	/**
	 * Custom validation rules keyed by rule name. Authored once and shared with the
	 * server (via `panel.registerValidationRule`) so they validate identically on
	 * both sides. App entries override plugins.
	 */
	rules?: Record<string, RuleDefinition>;
	/**
	 * API base URL. Defaults to the base path injected by the KratosJs server
	 * (window.__VALAJS_API_BASE_PATH__) on the current origin.
	 */
	apiBaseUrl?: string;
	/** Panel id when serving multiple panels */
	panelId?: string;
	/** DOM element id to mount into (default: 'root') */
	rootElementId?: string;
	/**
	 * Accent color override (any CSS color). Sets the --kratos-accent tokens
	 * on the document root; hover/soft shades are derived automatically.
	 */
	accentColor?: string;
}

/**
 * Resolve the merged component/rule registries from mount options.
 *
 * Plugin manifests are merged first, then the app's own direct registrations
 * (`fields`/`columns`/`widgets`/`blocks`/`rules`) are applied last so an app
 * always wins over a plugin on a key collision.
 */
export function resolveRegistries(options: MountAdminPanelOptions = {}): MergedPluginRegistries {
	const appManifest: KratosPluginClient = {
		name: 'app',
		fields: options.fields,
		columns: options.columns,
		widgets: options.widgets,
		blocks: options.blocks,
		authChallenges: options.authChallenges,
		rules: options.rules,
	};
	return mergePluginClients([...(options.plugins ?? []), appManifest]);
}

function applyAccentColor(accentColor: string): void {
	const root = document.documentElement;
	root.style.setProperty('--kratos-accent', accentColor);
	root.style.setProperty('--kratos-accent-hover', `color-mix(in srgb, ${accentColor} 85%, black)`);
	root.style.setProperty('--kratos-accent-soft', `color-mix(in srgb, ${accentColor} 15%, transparent)`);
}

function resolveApiBaseUrl(): string {
	const basePath = (window as any).__VALAJS_API_BASE_PATH__ || '/api';
	return `${window.location.origin}${basePath}`;
}

/**
 * Mount the KratosJs admin panel into the DOM.
 *
 * This is the entry point apps use in their admin client bundle:
 *
 * @example
 * ```typescript
 * // src/admin/main.tsx — register custom components directly, no plugin needed
 * import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
 * import '@maxal_studio/kratosjs-react/styles.css';
 * import StarRatingField from './components/StarRatingField';
 *
 * mountAdminPanel({
 *   fields: { 'star-rating': StarRatingField },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Packaged plugins still work, and can be combined with app registrations:
 * import starRating from '@maxal_studio/kratosjs-plugin-star-rating/client';
 *
 * mountAdminPanel({ plugins: [starRating] });
 * ```
 */
export function mountAdminPanel(options: MountAdminPanelOptions = {}): void {
	const rootElement = document.getElementById(options.rootElementId ?? 'root');
	if (!rootElement) {
		throw new Error(`Root element "#${options.rootElementId ?? 'root'}" not found`);
	}

	const registries = resolveRegistries(options);

	// Register plugin-provided validation rules into the shared engine so the
	// client validates them exactly as the server does.
	for (const definition of Object.values(registries.rules)) {
		ValidationEngine.register(definition);
	}

	const apiBaseUrl = options.apiBaseUrl ?? resolveApiBaseUrl();

	if (options.accentColor) {
		applyAccentColor(options.accentColor);
	}

	ReactDOM.createRoot(rootElement).render(
		<React.StrictMode>
			<AdminPanel
				apiBaseUrl={apiBaseUrl}
				panelId={options.panelId}
				customFields={registries.fields}
				customColumns={registries.columns}
				customWidgets={registries.widgets}
				customBlocks={registries.blocks}
				customAuthChallenges={registries.authChallenges}
			/>
		</React.StrictMode>,
	);
}
