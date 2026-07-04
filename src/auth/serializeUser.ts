import { AuthUser, SerializeUser } from './types';
import { formatUserDisplayName } from './formatUserDisplayName';

/**
 * Default `serializeUser`: map a raw user entity to the public {@link AuthUser}
 * using the resolved field map. This is the single source of truth for the shape
 * returned to the client when an app doesn't supply its own `serializeUser` on
 * `panel.auth()`.
 *
 * `role` is intentionally **not** included — it is not a core concept (base entities are
 * role-free). The permissions plugin (and any role-aware app) contributes it via
 * `extendUser`, e.g. `extendUser: (user) => ({ role: user.role })`, which is then normalized
 * to an id. To expose any extra column, prefer `extendUser` (additive) or provide your own
 * `serializeUser` — you never touch a provider.
 */
export const defaultSerializeUser: SerializeUser = async (user, { fields, resolveMediaUrl }): Promise<AuthUser> => {
	const avatarUrl = await resolveMediaUrl(user[fields.image]);
	return {
		id: String(user.id ?? user._id),
		email: user[fields.email],
		name: formatUserDisplayName({ firstname: user[fields.firstname], lastname: user[fields.lastname] }),
		avatarUrl,
	};
};
