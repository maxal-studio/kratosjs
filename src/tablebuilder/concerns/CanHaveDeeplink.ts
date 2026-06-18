import { Constructor } from '../types';

/**
 * Deeplink configuration for column navigation
 */
export interface DeeplinkConfig {
	resource?: string; // Resource slug (mutually exclusive with page)
	page?: string; // Page slug (mutually exclusive with resource)
	id?: ((value: any, row: Record<string, any>) => string) | string; // Function (value, row) => string or static string to get record ID (required for resources)
	edit?: boolean; // Open edit modal instead of view (default: false)
}

/**
 * Mixin that adds deeplink functionality to a column
 * Allows columns to navigate to resources or pages using React Router
 */
export function CanHaveDeeplink<TBase extends Constructor>(Base: TBase): TBase & Constructor<CanHaveDeeplink> {
	return class extends Base {
		public _deeplink?: DeeplinkConfig;

		/**
		 * Set deeplink configuration for this column
		 * @param config Deeplink configuration
		 */
		deeplink(config: DeeplinkConfig): this {
			// Validate config
			if (config.resource && config.page) {
				throw new Error('Deeplink cannot have both resource and page set');
			}
			if (!config.resource && !config.page) {
				throw new Error('Deeplink must have either resource or page set');
			}
			if (config.resource && !config.id) {
				throw new Error('Deeplink with resource must have id set');
			}

			this._deeplink = config;
			return this;
		}

		/**
		 * Get the deeplink configuration
		 */
		getDeeplink(): DeeplinkConfig | undefined {
			return this._deeplink;
		}

		/**
		 * Check if this column has a deeplink
		 */
		hasDeeplink(): boolean {
			return !!this._deeplink;
		}
	};
}

export interface CanHaveDeeplink {
	deeplink(config: DeeplinkConfig): this;
	getDeeplink(): DeeplinkConfig | undefined;
	hasDeeplink(): boolean;
}
