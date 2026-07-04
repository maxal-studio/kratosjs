/**
 * Reduce a user's `role` value to a plain identifier suitable for the JWT and
 * for permission lookups.
 *
 * Historically `role` was a plain string. Plugins such as the permissions plugin
 * now model `role` as a relation (ManyToOne) on the User entity, so the value an
 * app hands back from `validateCredentials` / `getUserById` may be a related
 * entity (or an unpopulated reference) instead of a scalar. In that case we want
 * the related record's id, not the whole object.
 *
 * @param role - A scalar role value, or a related entity/reference, or nullish.
 * @returns The role id as a string, or undefined when there is no role.
 */
export function normalizeRoleId(role: unknown): string | undefined {
	if (role === null || role === undefined) {
		return undefined;
	}
	if (typeof role === 'object') {
		const obj = role as Record<string, unknown>;
		const id = obj.id ?? obj._id ?? null;
		return id === null || id === undefined ? undefined : String(id);
	}
	return String(role);
}

/**
 * Return the user with its `role` normalized to an id — but only when a role is present.
 *
 * `role` is not a core concept (base apps are role-free; the permissions plugin adds it via
 * `extendUser`). So this leaves a role-less user untouched instead of stamping on a
 * `role: undefined` key, while still reducing a relation reference to its id when a role
 * exists.
 */
export function withNormalizedRole<T extends { role?: unknown }>(user: T): T {
	if (user.role === null || user.role === undefined) {
		return user;
	}
	return { ...user, role: normalizeRoleId(user.role) };
}
