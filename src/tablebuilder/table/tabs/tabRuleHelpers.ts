import { QueryBuilderRule } from '../filters/QueryBuilderFilter';

/**
 * Create an equals rule for tab filters
 */
export function equalsRule(
	field: string,
	value: any,
	dataType: 'text' | 'number' | 'date' | 'boolean' | 'select' = 'text',
): QueryBuilderRule {
	return {
		dataType,
		data: {
			operator: 'equals',
			settings: { field, value },
		},
	};
}

/**
 * Create a greater than or equal rule for tab filters
 */
export function greaterThanOrEqualRule(
	field: string,
	value: any,
	dataType: 'text' | 'number' | 'date' = 'number',
): QueryBuilderRule {
	return {
		dataType,
		data: {
			operator: 'greaterThanOrEqual',
			settings: { field, value },
		},
	};
}

/**
 * Create a less than or equal rule for tab filters
 */
export function lessThanOrEqualRule(
	field: string,
	value: any,
	dataType: 'text' | 'number' | 'date' = 'number',
): QueryBuilderRule {
	return {
		dataType,
		data: {
			operator: 'lessThanOrEqual',
			settings: { field, value },
		},
	};
}

/**
 * Create a not equals rule for tab filters
 */
export function notEqualsRule(
	field: string,
	value: any,
	dataType: 'text' | 'number' | 'date' | 'boolean' | 'select' = 'text',
): QueryBuilderRule {
	return {
		dataType,
		data: {
			operator: 'notEquals',
			settings: { field, value },
		},
	};
}

/**
 * Create a contains rule for tab filters
 */
export function containsRule(field: string, value: any): QueryBuilderRule {
	return {
		dataType: 'text',
		data: {
			operator: 'contains',
			settings: { field, value },
		},
	};
}

/**
 * Create a greater than rule for tab filters
 */
export function greaterThanRule(
	field: string,
	value: any,
	dataType: 'text' | 'number' | 'date' = 'number',
): QueryBuilderRule {
	return {
		dataType,
		data: {
			operator: 'greaterThan',
			settings: { field, value },
		},
	};
}

/**
 * Create a less than rule for tab filters
 */
export function lessThanRule(
	field: string,
	value: any,
	dataType: 'text' | 'number' | 'date' = 'number',
): QueryBuilderRule {
	return {
		dataType,
		data: {
			operator: 'lessThan',
			settings: { field, value },
		},
	};
}

/**
 * Create a between rule for tab filters
 * For numbers: value should be [min, max]
 * For dates: value can be [from, to] or { from: date, to: date }
 */
export function betweenRule(
	field: string,
	value: [any, any] | { from: any; to: any },
	dataType: 'number' | 'date' = 'number',
): QueryBuilderRule {
	return {
		dataType,
		data: {
			operator: 'between',
			settings: { field, value },
		},
	};
}

/**
 * Create a not between rule for tab filters
 * For numbers: value should be [min, max]
 * For dates: value can be [from, to] or { from: date, to: date }
 */
export function notBetweenRule(
	field: string,
	value: [any, any] | { from: any; to: any },
	dataType: 'number' | 'date' = 'number',
): QueryBuilderRule {
	return {
		dataType,
		data: {
			operator: 'notBetween',
			settings: { field, value },
		},
	};
}

/**
 * Create an is null rule for tab filters
 */
export function isNullRule(field: string): QueryBuilderRule {
	return {
		dataType: 'text',
		data: {
			operator: 'isNull',
			settings: { field, value: null },
		},
	};
}

/**
 * Create an is not null rule for tab filters
 */
export function isNotNullRule(field: string): QueryBuilderRule {
	return {
		dataType: 'text',
		data: {
			operator: 'isNotNull',
			settings: { field, value: null },
		},
	};
}

/**
 * Create a before rule for tab filters (works for dates and numbers)
 */
export function beforeRule(field: string, value: any, dataType: 'number' | 'date' = 'date'): QueryBuilderRule {
	return {
		dataType,
		data: {
			operator: 'before',
			settings: { field, value },
		},
	};
}

/**
 * Create an after rule for tab filters (works for dates and numbers)
 */
export function afterRule(field: string, value: any, dataType: 'number' | 'date' = 'date'): QueryBuilderRule {
	return {
		dataType,
		data: {
			operator: 'after',
			settings: { field, value },
		},
	};
}

/**
 * Create a starts with rule for tab filters
 */
export function startsWithRule(field: string, value: any): QueryBuilderRule {
	return {
		dataType: 'text',
		data: {
			operator: 'startsWith',
			settings: { field, value },
		},
	};
}

/**
 * Create an ends with rule for tab filters
 */
export function endsWithRule(field: string, value: any): QueryBuilderRule {
	return {
		dataType: 'text',
		data: {
			operator: 'endsWith',
			settings: { field, value },
		},
	};
}

/**
 * Create an in rule for tab filters (is any of)
 * Value should be an array of values
 */
export function inRule(
	field: string,
	value: any[],
	dataType: 'text' | 'number' | 'date' | 'boolean' | 'select' = 'text',
): QueryBuilderRule {
	return {
		dataType,
		data: {
			operator: 'in',
			settings: { field, value },
		},
	};
}

/**
 * Create a not in rule for tab filters (is none of)
 * Value should be an array of values
 */
export function notInRule(
	field: string,
	value: any[],
	dataType: 'text' | 'number' | 'date' | 'boolean' | 'select' = 'text',
): QueryBuilderRule {
	return {
		dataType,
		data: {
			operator: 'notIn',
			settings: { field, value },
		},
	};
}

/**
 * Create an OR group rule - at least one of the rules must match
 * @param groups Array of rule arrays, each group is combined with AND internally
 */
export function orRule(groups: QueryBuilderRule[][]): QueryBuilderRule {
	return {
		type: 'or',
		data: {
			groups: groups.map(rules => ({ rules })),
		},
	};
}

/**
 * Create an AND group rule - all rules must match (this is the default behavior)
 * Multiple rules in an array are automatically combined with AND
 * This helper is provided for clarity and consistency
 */
export function andRule(rules: QueryBuilderRule[]): QueryBuilderRule[] {
	// AND is the default - just return the rules array
	// This is a helper for clarity, actual AND logic is handled by the adapter
	return rules;
}
