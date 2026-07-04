import { AuthProviderConfig, AuthButtonConfig, AuthDefaultsContext } from './types';

/**
 * Abstract base class for authentication providers
 * All auth providers must extend this class
 */
export abstract class AuthProvider {
	protected config: AuthProviderConfig;

	constructor(config: AuthProviderConfig) {
		this.config = config;
	}

	/**
	 * Authenticate user with credentials. Return the raw user entity (the DB row) when
	 * valid, or `null` otherwise. Providers do NOT shape the public user — the panel's
	 * `serializeUser` maps the returned entity to the client-facing `AuthUser`.
	 * Must be implemented by all providers.
	 */
	abstract authenticate(credentials: any): Promise<any | null>;

	/**
	 * Get OAuth authorization URL (for OAuth providers)
	 * Optional - only needed for OAuth providers
	 */
	getAuthorizationUrl?(state: string): string;

	/**
	 * Handle OAuth callback (for OAuth providers). Returns the raw user entity (shaped
	 * later by `serializeUser`) or `null`. Optional - only needed for OAuth providers.
	 */
	handleCallback?(code: string, state: string): Promise<any | null>;

	/**
	 * Receive panel-provided defaults (user entity, field map, EM accessor, media
	 * resolver, password verifier) when the panel configures auth. Optional — a
	 * provider implements this to fill in a default behavior (e.g. a default
	 * `validateCredentials`) when the app didn't supply one.
	 */
	bindPanelDefaults?(ctx: AuthDefaultsContext): void;

	/**
	 * Get button configuration for frontend display
	 */
	getButtonConfig(): AuthButtonConfig {
		return {
			name: this.config.name,
			label: this.config.label || this.config.name,
			icon: this.config.icon,
			type: 'credentials', // Override in OAuth providers
			buttonStyle: this.config.buttonStyle,
		};
	}

	/**
	 * Get provider name
	 */
	getName(): string {
		return this.config.name;
	}
}
