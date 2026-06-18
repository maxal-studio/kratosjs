import { hash as bcryptHash, compare as bcryptCompare } from 'bcryptjs';

/**
 * Hash a plaintext password. Produces a bcrypt `$2b$` hash, compatible with the
 * native `bcrypt` package, so hashes stay interchangeable across apps and seeders.
 *
 * @param plain - The plaintext password.
 * @param rounds - Cost factor (salt rounds). Defaults to 10.
 */
export async function hashPassword(plain: string, rounds = 10): Promise<string> {
	return bcryptHash(plain, rounds);
}

/**
 * Verify a plaintext password against a bcrypt hash. Returns false (never throws)
 * when either input is missing or the hash is malformed.
 *
 * @param plain - The plaintext password supplied at login.
 * @param hash - The stored bcrypt hash.
 */
export async function verifyPassword(plain: string, hash: string | undefined | null): Promise<boolean> {
	if (!plain || !hash) {
		return false;
	}
	try {
		return await bcryptCompare(plain, hash);
	} catch {
		return false;
	}
}
