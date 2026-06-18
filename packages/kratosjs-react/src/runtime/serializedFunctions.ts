/**
 * Runtime for executing functions serialized by the KratosJs backend.
 *
 * ## Trust boundary
 *
 * The strings executed here are NOT user input. They are functions written by
 * the panel developer in resource/column definitions (kratosjs core
 * serializes them with `.toString()`) and served by the developer's own server
 * over the authenticated metadata API. They carry exactly the same trust as
 * the application JS bundle itself: if an attacker can tamper with the
 * metadata endpoint, they already control the panel.
 *
 * Implementation notes:
 * - Compilation uses `new Function` (never `eval`), so serialized code cannot
 *   capture local scope from this module.
 * - Compiled functions are cached by source string — schemas re-render often
 *   and re-parsing on every render is wasted work.
 * - Deploying a CSP without `'unsafe-eval'` requires avoiding serialized
 *   functions entirely (use structured conditions instead, see conditions.ts).
 */

const compileCache = new Map<string, ((...args: any[]) => any) | undefined>();

/**
 * Strip TypeScript/esbuild helper wrappers from serialized code.
 * Toolchains wrap named function expressions as `__name(fn, "fnName")`;
 * this extracts the first argument and drops the name, iterating until
 * no `__name(` wrappers remain (handles nesting in block bodies).
 */
export function stripTypeScriptHelpers(code: string): string {
	let cleaned = code;
	let changed = true;
	let iterations = 0;
	const maxIterations = 100; // Safety limit to prevent infinite loops

	while (changed && iterations < maxIterations) {
		iterations++;
		const before = cleaned;
		let result = '';
		let i = 0;

		while (i < cleaned.length) {
			// Check if we're at __name(
			if (cleaned.substring(i, i + 6) === '__name' && (cleaned[i + 6] === '(' || /\s/.test(cleaned[i + 6]))) {
				// Skip '__name' and any whitespace, find the opening parenthesis
				let j = i + 6;
				while (j < cleaned.length && /\s/.test(cleaned[j])) j++;
				if (j >= cleaned.length || cleaned[j] !== '(') {
					// Not a __name( call, add it back and continue
					result += cleaned[i];
					i++;
					continue;
				}

				// Skip '('
				j++;

				// Find the first argument (the function expression),
				// matching balanced parens/brackets/braces outside strings
				let depth = 0;
				const start = j;
				let inString = false;
				let stringChar = '';
				let inTemplate = false;

				while (j < cleaned.length) {
					const char = cleaned[j];
					const prevChar = j > 0 ? cleaned[j - 1] : '';

					if (!inString && !inTemplate) {
						if (char === '`') {
							inTemplate = true;
						} else if (char === '"' || char === "'") {
							inString = true;
							stringChar = char;
						}
					} else if (inString && char === stringChar && prevChar !== '\\') {
						inString = false;
					} else if (inTemplate && char === '`' && prevChar !== '\\') {
						inTemplate = false;
					}

					if (!inString && !inTemplate) {
						if (char === '(' || char === '[' || char === '{') {
							depth++;
						} else if (char === ')' || char === ']' || char === '}') {
							depth--;
						}

						// A comma at depth 0 ends the first argument
						if (char === ',' && depth === 0) {
							break;
						}
					}

					j++;
				}

				const functionExpr = cleaned.substring(start, j);
				result += functionExpr;

				// Skip the comma
				if (cleaned[j] === ',') j++;

				// Skip whitespace
				while (j < cleaned.length && /\s/.test(cleaned[j])) j++;

				// Skip the string argument ("functionName")
				if (cleaned[j] === '"' || cleaned[j] === "'") {
					const quote = cleaned[j];
					j++;
					while (j < cleaned.length && cleaned[j] !== quote) {
						if (cleaned[j] === '\\') j++; // Skip escaped characters
						j++;
					}
					if (cleaned[j] === quote) j++; // Skip closing quote
				}

				// Skip whitespace and closing paren
				while (j < cleaned.length && (/\s/.test(cleaned[j]) || cleaned[j] === ')')) j++;

				i = j;
			} else {
				result += cleaned[i];
				i++;
			}
		}

		cleaned = result;
		changed = before !== cleaned;
	}

	return cleaned;
}

/**
 * Extract parameter names from a function parameter list.
 * Handles: (a, b), (a,b), a, (a = 1, b), etc.
 */
function extractParameters(paramString: string): string[] {
	if (!paramString) return [];

	const cleaned = paramString.replace(/^\(|\)$/g, '').trim();
	if (!cleaned) return [];

	const params: string[] = [];
	let current = '';
	let depth = 0;

	for (let i = 0; i < cleaned.length; i++) {
		const char = cleaned[i];

		if (char === '(' || char === '[' || char === '{') {
			depth++;
			current += char;
		} else if (char === ')' || char === ']' || char === '}') {
			depth--;
			current += char;
		} else if (char === ',' && depth === 0) {
			const paramName = current.trim().split('=')[0].trim();
			if (paramName) {
				params.push(paramName);
			}
			current = '';
		} else {
			current += char;
		}
	}

	if (current.trim()) {
		const paramName = current.trim().split('=')[0].trim();
		if (paramName) {
			params.push(paramName);
		}
	}

	return params.length > 0 ? params : ['value', 'record']; // Default fallback
}

function compile(functionString: string): ((...args: any[]) => any) | undefined {
	const trimmed = stripTypeScriptHelpers(functionString).trim();

	if (trimmed.includes('=>')) {
		const arrowIndex = trimmed.indexOf('=>');
		const afterArrow = trimmed.substring(arrowIndex + 2).trim();
		const beforeArrow = trimmed.substring(0, arrowIndex).trim();
		const params = extractParameters(beforeArrow);

		if (afterArrow.startsWith('{')) {
			// Block body — extract content between balanced braces
			let braceCount = 0;
			let startIndex = 0;
			let endIndex = afterArrow.length;

			for (let i = 0; i < afterArrow.length; i++) {
				if (afterArrow[i] === '{') {
					if (braceCount === 0) startIndex = i + 1;
					braceCount++;
				} else if (afterArrow[i] === '}') {
					braceCount--;
					if (braceCount === 0) {
						endIndex = i;
						break;
					}
				}
			}

			const functionBody = afterArrow.substring(startIndex, endIndex).trim();
			return new Function(...params, functionBody) as (...args: any[]) => any;
		}

		// Expression body — wrap in a return statement
		return new Function(...params, `return ${afterArrow}`) as (...args: any[]) => any;
	}

	if (trimmed.startsWith('function')) {
		return new Function(`return ${trimmed}`)() as (...args: any[]) => any;
	}

	// Bare function body, or an unrecognized wrapping
	try {
		return new Function('value', 'record', trimmed) as (...args: any[]) => any;
	} catch {
		// Last resort: treat the string as an expression evaluating to a function
		const fn = new Function(`return (${trimmed})`)();
		if (typeof fn === 'function') {
			return fn as (...args: any[]) => any;
		}
		throw new Error('Serialized string is not a valid function');
	}
}

/**
 * Compile a serialized function string into a callable, with caching.
 * Returns undefined (and logs) when the string cannot be compiled.
 */
export function compileSerializedFunction(functionString: string | undefined): ((...args: any[]) => any) | undefined {
	if (!functionString) {
		return undefined;
	}

	if (compileCache.has(functionString)) {
		return compileCache.get(functionString);
	}

	let compiled: ((...args: any[]) => any) | undefined;
	try {
		compiled = compile(functionString);
	} catch (error: any) {
		console.error('Error compiling serialized function:', error);
		console.error('Function string (first 500 chars):', functionString.substring(0, 500));
		compiled = undefined;
	}

	compileCache.set(functionString, compiled);
	return compiled;
}

/**
 * Execute a serialized function with the given arguments.
 * Without arguments, returns the compiled function itself.
 * Returns undefined on compile or runtime errors.
 *
 * @example
 * executeSerializedFunction('(value, record) => value.toUpperCase()', 'hello', {});
 */
export function executeSerializedFunction(functionString: string | undefined, ...args: any[]): any {
	const fn = compileSerializedFunction(functionString);
	if (!fn) {
		return undefined;
	}

	if (args.length === 0) {
		return fn;
	}

	try {
		return fn(...args);
	} catch (error: any) {
		console.error('Error executing serialized function:', error);
		console.error('Function string (first 500 chars):', functionString?.substring(0, 500));
		return undefined;
	}
}
