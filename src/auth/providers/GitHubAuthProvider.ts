import { AuthProvider } from '../AuthProvider';
import { AuthProviderConfig, AuthButtonConfig } from '../types';

/**
 * Configuration for GitHub OAuth provider
 */
export interface GitHubAuthProviderConfig extends Omit<AuthProviderConfig, 'name'> {
	/** GitHub OAuth Client ID */
	clientId: string;
	/** GitHub OAuth Client Secret */
	clientSecret: string;
	/** Redirect URI (must match GitHub app settings) */
	redirectUri: string;
	/** Base URL of your application (for generating redirect URI) */
	baseUrl: string;
	/**
	 * Resolve a stored user from a GitHub profile. Return the raw user entity (the DB
	 * row) or `null`. The panel's `serializeUser` shapes it for the client — do NOT map
	 * fields here.
	 */
	findUser: (githubProfile: {
		id: string;
		email: string;
		name?: string;
		avatar_url?: string;
		login: string;
	}) => Promise<any | null>;
}

/**
 * GitHub OAuth Provider
 * Implements OAuth 2.0 flow with GitHub
 */
export class GitHubAuthProvider extends AuthProvider {
	private clientId: string;
	private clientSecret: string;
	private redirectUri: string;
	private findUser: GitHubAuthProviderConfig['findUser'];

	constructor(config: GitHubAuthProviderConfig) {
		super({
			label: config.label || 'Sign in with GitHub',
			icon: config.icon || 'Github',
			...config,
			name: 'github',
		});
		this.clientId = config.clientId;
		this.clientSecret = config.clientSecret;
		this.redirectUri = config.redirectUri;
		this.findUser = config.findUser;
	}

	/**
	 * Authenticate is not used for OAuth providers
	 * OAuth uses handleCallback instead
	 */
	async authenticate(_credentials: any): Promise<any | null> {
		throw new Error('GitHub OAuth provider does not support direct authentication. Use OAuth flow instead.');
	}

	/**
	 * Generate OAuth authorization URL
	 */
	getAuthorizationUrl(state: string): string {
		const params = new URLSearchParams({
			client_id: this.clientId,
			redirect_uri: this.redirectUri,
			scope: 'user:email',
			state,
		});

		return `https://github.com/login/oauth/authorize?${params.toString()}`;
	}

	/**
	 * Handle OAuth callback - exchange code for access token and get user info
	 */
	async handleCallback(code: string, state: string): Promise<any | null> {
		try {
			// Exchange authorization code for access token
			const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
				body: JSON.stringify({
					client_id: this.clientId,
					client_secret: this.clientSecret,
					code,
					state,
				}),
			});

			if (!tokenResponse.ok) {
				console.error('Failed to exchange code for token:', await tokenResponse.text());
				return null;
			}

			const tokenData = (await tokenResponse.json()) as {
				access_token?: string;
				error?: string;
				error_description?: string;
			};

			if (tokenData.error) {
				console.error('GitHub OAuth error:', tokenData.error_description || tokenData.error);
				return null;
			}

			const accessToken = tokenData.access_token;
			if (!accessToken) {
				console.error('No access token received from GitHub');
				return null;
			}

			// Get user profile from GitHub
			const userResponse = await fetch('https://api.github.com/user', {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: 'application/vnd.github.v3+json',
				},
			});

			if (!userResponse.ok) {
				console.error('Failed to get user profile from GitHub:', await userResponse.text());
				return null;
			}

			const githubUser = (await userResponse.json()) as {
				id: number;
				email?: string;
				name?: string;
				login: string;
				avatar_url?: string;
			};

			// Get user email (may require additional scope)
			let email = githubUser.email;
			if (!email) {
				// Try to get email from emails endpoint
				const emailsResponse = await fetch('https://api.github.com/user/emails', {
					headers: {
						Authorization: `Bearer ${accessToken}`,
						Accept: 'application/vnd.github.v3+json',
					},
				});

				if (emailsResponse.ok) {
					const emails = (await emailsResponse.json()) as Array<{ email: string; primary?: boolean }>;
					const primaryEmail = emails.find(e => e.primary);
					email = primaryEmail?.email || emails[0]?.email;
				}
			}

			if (!email) {
				console.error('No email found for GitHub user');
				return null;
			}

			// Find user in database — returns the raw entity, shaped later by serializeUser.
			const user = await this.findUser({
				id: githubUser.id.toString(),
				email,
				name: githubUser.name || githubUser.login,
				avatar_url: githubUser.avatar_url,
				login: githubUser.login,
			});

			return user ?? null;
		} catch (error) {
			console.error('GitHub OAuth callback error:', error);
			return null;
		}
	}

	/**
	 * Get button configuration for frontend
	 */
	getButtonConfig(): AuthButtonConfig {
		return {
			...super.getButtonConfig(),
			type: 'oauth',
		};
	}
}
