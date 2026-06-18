import { AuthProvider } from '../AuthProvider';
import { AuthProviderConfig, AuthUser, AuthButtonConfig, AuthDefaultsContext } from '../types';
import { formatUserDisplayName } from '../formatUserDisplayName';

/** Shape the provider expects back from `validateCredentials`. */
export interface ValidatedUser {
	_id: string | number;
	email: string;
	firstname?: string;
	lastname?: string;
	role?: unknown;
	profileMediaImage?: { url: string };
	[key: string]: any;
}

/**
 * Configuration for EmailAuthProvider
 * Simple email/password authentication provider
 */
export interface EmailAuthProviderConfig extends Omit<AuthProviderConfig, 'name'> {
	/**
	 * Validate user credentials. Returns the user (the shape below) when valid,
	 * null otherwise.
	 *
	 * Optional: when omitted, the panel installs a default that looks the user up by
	 * email on `panel.auth({ userEntity })`, verifies the password, and resolves the
	 * avatar. Provide your own to override that behavior.
	 */
	validateCredentials?: (email: string, password: string) => Promise<ValidatedUser | null>;
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
	 * Install a default `validateCredentials` (entity lookup → password verify →
	 * avatar resolve) when the app didn't supply one. Called by the panel during
	 * `auth()` with its user entity, field map, and helpers.
	 */
	bindPanelDefaults(ctx: AuthDefaultsContext): void {
		if (this.validateCredentials || !ctx.userEntity) {
			return;
		}

		const f = ctx.fields;
		this.validateCredentials = async (email: string, password: string): Promise<ValidatedUser | null> => {
			const em = ctx.getEm();
			const user: any = await em.findOne(ctx.userEntity, { [f.email]: email.toLowerCase() });
			if (!user || !user[f.password]) {
				return null;
			}
			const valid = await ctx.verifyPassword(password, user[f.password]);
			if (!valid) {
				return null;
			}
			const avatarUrl = await ctx.resolveMediaUrl(user[f.image]);
			return {
				_id: user.id ?? user._id,
				email: user[f.email],
				firstname: user[f.firstname],
				lastname: user[f.lastname],
				role: user[f.role],
				profileMediaImage: avatarUrl ? { url: avatarUrl } : undefined,
			};
		};
	}

	/**
	 * Authenticate user with email and password
	 */
	async authenticate({ email, password }: { email: string; password: string }): Promise<AuthUser | null> {
		if (!this.validateCredentials) {
			throw new Error(
				'EmailAuthProvider has no validateCredentials. Pass one, or call panel.auth({ userEntity }) so the default can be installed.',
			);
		}

		const user = await this.validateCredentials(email, password);
		if (!user) {
			return null;
		}

		// Ensure _id is a string
		const userId = typeof user._id === 'string' ? user._id : (user._id as any)?.toString() || String(user._id);

		return {
			id: userId,
			email: user.email,
			name: formatUserDisplayName(user),
			role: user.role as string | undefined,
			avatarUrl: user.profileMediaImage?.url,
		};
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
