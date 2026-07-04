import { AuthProvider } from '../AuthProvider';
import { AuthProviderConfig, AuthButtonConfig, AuthDefaultsContext } from '../types';

/**
 * Configuration for EmailAuthProvider
 * Simple email/password authentication provider
 */
export interface EmailAuthProviderConfig extends Omit<AuthProviderConfig, 'name'> {
	/**
	 * Validate user credentials. Returns the raw user entity (the DB row) when valid,
	 * `null` otherwise. The panel's `serializeUser` shapes that entity into the
	 * client-facing user — do NOT map fields here.
	 *
	 * Optional: when omitted, the panel installs a default that looks the user up by
	 * email on `panel.auth({ userEntity })` and verifies the password. Provide your own
	 * to override the lookup/verification (e.g. an external identity store).
	 */
	validateCredentials?: (email: string, password: string) => Promise<any | null>;
}

/**
 * EmailAuthProvider - Simple email/password authentication provider
 * Uses JWT tokens for authentication (no external auth package required)
 */
export class EmailAuthProvider extends AuthProvider {
	private validateCredentials?: EmailAuthProviderConfig['validateCredentials'];

	constructor(config: EmailAuthProviderConfig = {}) {
		super({
			label: config.label || 'Sign in with Email',
			icon: config.icon || 'Mail',
			...config,
			name: 'email', // Provider name
		});
		this.validateCredentials = config.validateCredentials;
	}

	/**
	 * Install a default `validateCredentials` (entity lookup by email → password verify)
	 * when the app didn't supply one. Called by the panel during `auth()` with its user
	 * entity, field map, and helpers. The raw entity is returned as-is; `serializeUser`
	 * shapes it for the client.
	 */
	bindPanelDefaults(ctx: AuthDefaultsContext): void {
		if (this.validateCredentials || !ctx.userEntity) {
			return;
		}

		const f = ctx.fields;
		this.validateCredentials = async (email: string, password: string): Promise<any | null> => {
			const em = ctx.getEm();
			const user: any = await em.findOne(ctx.userEntity, { [f.email]: email.toLowerCase() });
			if (!user || !user[f.password]) {
				return null;
			}
			const valid = await ctx.verifyPassword(password, user[f.password]);
			if (!valid) {
				return null;
			}
			return user;
		};
	}

	/**
	 * Authenticate user with email and password. Returns the raw user entity (or null);
	 * the panel's `serializeUser` produces the public `AuthUser`.
	 */
	async authenticate({ email, password }: { email: string; password: string }): Promise<any | null> {
		if (!this.validateCredentials) {
			throw new Error(
				'EmailAuthProvider has no validateCredentials. Pass one, or call panel.auth({ userEntity }) so the default can be installed.',
			);
		}

		return this.validateCredentials(email, password);
	}

	/**
	 * Get button configuration for frontend
	 */
	getButtonConfig(): AuthButtonConfig {
		return {
			...super.getButtonConfig(),
			type: 'credentials',
			fields: ['email', 'password'],
		};
	}
}
