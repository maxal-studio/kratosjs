import { AuthProviderConfig, AuthButtonConfig, AuthUser, AuthDefaultsContext } from './types';

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
	 * Authenticate user with credentials
	 * Must be implemented by all providers
	 */
	abstract authenticate(credentials: any): Promise<AuthUser | null>;

	/**
	 * Get OAuth authorization URL (for OAuth providers)
	 * Optional - only needed for OAuth providers
	 */
	getAuthorizationUrl?(state: string): string;

	/**
	 * Handle OAuth callback (for OAuth providers)
	 * Optional - only needed for OAuth providers
	 */
	handleCallback?(code: string, state: string): Promise<AuthUser | null>;

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
