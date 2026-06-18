// Server-side resolution of validation-rule conditions.
//
// A rule may carry a condition (the second arg to `.required(cond)`, etc.).
// After serialization a condition is either:
//   • a boolean (the overwhelmingly common `true` default), or
//   • a serialized predicate function string, e.g.
//     `(context) => context?.operation === 'create'`.
//
// The frontend evaluates these with its full serialized-function runtime. On
// the server we only need a compact best-effort evaluator: it handles booleans
// exactly and runs developer-authored predicate strings against a minimal
// `FormContext` ({ get, operation }). The strings are the panel developer's own
// code (same trust boundary as the app bundle), compiled with `new Function`,
// never `eval`. If a predicate can't be compiled/run we default to applying the
// rule, so server-side enforcement never silently disappears.

export interface ConditionContext {
	/** All resolved field values in the current scope. */
	data: Record<string, any>;
	/** Operation being performed, for `operation`-gated rules. */
	operation?: 'create' | 'edit' | 'view';
}

const compileCache = new Map<string, ((ctx: any) => any) | null>();

/** Best-effort compile of a serialized predicate string into a callable. */
function compilePredicate(source: string): ((ctx: any) => any) | null {
	if (compileCache.has(source)) return compileCache.get(source) as ((ctx: any) => any) | null;

	let fn: ((ctx: any) => any) | null = null;
	try {
		let src = source.trim();
		// Unwrap esbuild/tsx `__name(fn, "name")` helper if present.
		const named = src.match(/^__name\(\s*([\s\S]*?),\s*["'][^"']*["']\s*\)$/);
		if (named) src = named[1].trim();
		// The developer's own predicate, recompiled server-side.
		fn = new Function(`return (${src})`)() as (ctx: any) => any;
		if (typeof fn !== 'function') fn = null;
	} catch {
		fn = null;
	}

	compileCache.set(source, fn);
	return fn;
}

/**
 * Resolve whether a rule's condition is satisfied on the server.
 * `undefined`/`true` → apply, `false` → skip, predicate string → evaluate
 * (defaulting to apply on any failure).
 */
export function resolveValidationCondition(condition: unknown, ctx: ConditionContext): boolean {
	if (condition === undefined || condition === null || condition === true) return true;
	if (condition === false) return false;

	if (typeof condition === 'string') {
		const fn = compilePredicate(condition);
		if (!fn) return true; // can't evaluate — enforce rather than silently skip
		try {
			const formContext = {
				operation: ctx.operation,
				get: (field: string) => ctx.data?.[field],
			};
			return !!fn(formContext);
		} catch {
			return true;
		}
	}

	// Unknown shape — apply.
	return true;
}
