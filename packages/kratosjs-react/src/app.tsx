import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminPanel } from './components/AdminPanel';
import { mergePluginClients } from './plugin';
import type { KratosPluginClient } from './plugin';
import { ValidationEngine } from '@maxal_studio/kratosjs/dist/validation';

export interface MountAdminPanelOptions {
	/** Client manifests of the plugins used by this panel */
	plugins?: KratosPluginClient[];
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
 * // src/admin/main.tsx
 * import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
 * import '@maxal_studio/kratosjs-react/styles.css';
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

	const registries = mergePluginClients(options.plugins);

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
			/>
		</React.StrictMode>,
	);
}
