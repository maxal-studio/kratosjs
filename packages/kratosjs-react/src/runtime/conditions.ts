import { compileSerializedFunction } from './serializedFunctions';

/**
 * Conditional visibility / disabled-state evaluation.
 *
 * Three condition forms are supported, in priority order:
 *  1. `boolean` — static.
 *  2. Structured condition object (preferred) — a small declarative AST that
 *     is interpreted without executing any code, so it works under a strict
 *     CSP and cannot do anything besides read form values.
 *  3. Serialized function string — `({ get, operation }) => boolean`,
 *     compiled via the serialized-function runtime (see its trust-boundary
 *     notes).
 */

export type ConditionOperator =
	| 'eq'
	| 'ne'
	| 'in'
	| 'nin'
	| 'truthy'
	| 'falsy'
	| 'gt'
	| 'gte'
	| 'lt'
	| 'lte'
	| 'operation';

export type ConditionAst =
	| { all: ConditionAst[] }
	| { any: ConditionAst[] }
	| { not: ConditionAst }
	| { op: ConditionOperator; field?: string; value?: any };

export type Condition = boolean | string | ConditionAst | undefined;

export type FormOperation = 'create' | 'edit' | 'view';

/** Read a (possibly dot-separated) field path from the form state. */
function getFieldValue(formState: Record<string, any>, fieldName: string): any {
	let value: any = formState;
	for (const key of fieldName.split('.')) {
		if (value === undefined || value === null) {
			return undefined;
		}
		value = value[key];
	}
	return value;
}

function isConditionAst(condition: unknown): condition is ConditionAst {
	if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
		return false;
	}
	const c = condition as Record<string, unknown>;
	return Array.isArray(c.all) || Array.isArray(c.any) || typeof c.not === 'object' || typeof c.op === 'string';
}

/**
 * Pure interpreter for structured conditions — no code execution.
 */
export function evaluateConditionAst(
	ast: ConditionAst,
	formState: Record<string, any>,
	operation?: FormOperation,
): boolean {
	if ('all' in ast && Array.isArray(ast.all)) {
		return ast.all.every(child => evaluateConditionAst(child, formState, operation));
	}
	if ('any' in ast && Array.isArray(ast.any)) {
		return ast.any.some(child => evaluateConditionAst(child, formState, operation));
	}
	if ('not' in ast && ast.not) {
		return !evaluateConditionAst(ast.not as ConditionAst, formState, operation);
	}

	const { op, field, value } = ast as { op: ConditionOperator; field?: string; value?: any };
	const actual = op === 'operation' ? operation : field !== undefined ? getFieldValue(formState, field) : undefined;

	switch (op) {
		case 'eq':
			return actual === value;
		case 'ne':
			return actual !== value;
		case 'in':
			return Array.isArray(value) && value.includes(actual);
		case 'nin':
			return Array.isArray(value) && !value.includes(actual);
		case 'truthy':
			return Boolean(actual);
		case 'falsy':
			return !actual;
		case 'gt':
			return actual > value;
		case 'gte':
			return actual >= value;
		case 'lt':
			return actual < value;
		case 'lte':
			return actual <= value;
		case 'operation':
			return operation === value;
		default:
			console.warn('Unknown condition operator:', op);
			return false;
	}
}

/**
 * Evaluate a hidden/disabled condition against the current form state.
 * Returns false (not hidden / not disabled) for undefined or invalid input.
 */
export function evaluateCondition(
	condition: Condition,
	formState: Record<string, any>,
	operation?: FormOperation,
): boolean {
	if (condition === undefined || condition === null) {
		return false;
	}

	if (typeof condition === 'boolean') {
		return condition;
	}

	if (isConditionAst(condition)) {
		try {
			return evaluateConditionAst(condition, formState, operation);
		} catch (error) {
			console.error('Error evaluating condition AST:', condition, error);
			return false;
		}
	}

	if (typeof condition === 'string') {
		try {
			const fn = compileSerializedFunction(condition);
			if (!fn) return false;
			const get = (fieldName: string) => getFieldValue(formState, fieldName);
			return Boolean(fn({ get, operation }));
		} catch (error) {
			console.error('Error evaluating condition:', condition, error);
			return false;
		}
	}

	return false;
}
