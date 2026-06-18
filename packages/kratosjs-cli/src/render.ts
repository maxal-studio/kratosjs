import fs from 'fs';
import path from 'path';

export type TokenMap = Record<string, string>;

export interface RenderResult {
	created: string[];
	skipped: string[];
}

/** Convert an arbitrary string into PascalCase, e.g. "star rating" -> "StarRating". */
export function toPascalCase(input: string): string {
	return input
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.trim()
		.split(/\s+/)
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join('');
}

/** Convert an arbitrary string into kebab-case, e.g. "StarRating" -> "star-rating". */
export function toKebabCase(input: string): string {
	return input
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
}

/** Convert an arbitrary string into camelCase, e.g. "Star Rating" -> "starRating". */
export function toCamelCase(input: string): string {
	const pascal = toPascalCase(input);
	return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** Replace every {{token}} occurrence in a string using the provided map. */
export function replaceTokens(content: string, tokens: TokenMap): string {
	return content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
		return key in tokens ? tokens[key] : match;
	});
}

/**
 * Recursively render a template directory into the target directory.
 *
 * - `.tmpl` files have their tokens replaced and the `.tmpl` suffix stripped.
 * - Other files are copied verbatim.
 * - Existing files are skipped (idempotent, never overwrites).
 * - File/directory names also get token replacement (so `{{name}}.ts` works).
 */
export function renderTemplateTree(
	templateDir: string,
	targetDir: string,
	tokens: TokenMap,
	result: RenderResult = { created: [], skipped: [] },
): RenderResult {
	const entries = fs.readdirSync(templateDir, { withFileTypes: true });

	for (const entry of entries) {
		const sourcePath = path.join(templateDir, entry.name);
		const renderedName = replaceTokens(entry.name.replace(/\.tmpl$/, ''), tokens);
		const targetPath = path.join(targetDir, renderedName);

		if (entry.isDirectory()) {
			fs.mkdirSync(targetPath, { recursive: true });
			renderTemplateTree(sourcePath, targetPath, tokens, result);
			continue;
		}

		const relative = path.relative(targetDir, targetPath);

		if (fs.existsSync(targetPath)) {
			result.skipped.push(relative);
			continue;
		}

		const isTemplate = entry.name.endsWith('.tmpl');

		fs.mkdirSync(path.dirname(targetPath), { recursive: true });

		if (isTemplate) {
			const raw = fs.readFileSync(sourcePath, 'utf-8');
			fs.writeFileSync(targetPath, replaceTokens(raw, tokens), 'utf-8');
		} else {
			fs.copyFileSync(sourcePath, targetPath);
		}

		result.created.push(relative);
	}

	return result;
}

/** Resolve a path inside the shipped templates directory. */
export function templatePath(...segments: string[]): string {
	return path.join(__dirname, '..', 'templates', ...segments);
}
