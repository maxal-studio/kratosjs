/**
 * Build a display name for JWT / UI from user entity fields.
 */
export function formatUserDisplayName(user: { firstname?: string; lastname?: string }): string | undefined {
	if (!user.firstname) {
		return undefined;
	}
	return user.lastname ? `${user.firstname} ${user.lastname}` : user.firstname;
}
