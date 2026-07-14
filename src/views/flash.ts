/**
 * Session-less flash data for view routes.
 *
 * KratosJs has no server session store, so a `reply.back({ errors })` after a
 * failed no-JS form post carries the error bag to the next render in a
 * short-lived httpOnly cookie. `ViewService` reads and clears it, merging the
 * payload into `props.errors`. Keep payloads small — cookies cap at ~4KB.
 */
export function encodeFlash(data: Record<string, unknown>): string {
	return Buffer.from(JSON.stringify(data), 'utf-8').toString('base64url');
}

export function decodeFlash(raw: string | undefined): Record<string, unknown> | undefined {
	if (!raw) return undefined;
	try {
		const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8'));
		return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined;
	} catch {
		return undefined;
	}
}
