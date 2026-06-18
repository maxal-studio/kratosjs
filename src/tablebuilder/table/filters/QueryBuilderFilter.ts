import { Filter } from './Filter';
import { Resolvable } from '../../types';

/**
 * Constraint for QueryBuilder
 */
export interface Constraint {
	name: string;
	label: string;
	dataType: 'text' | 'number' | 'date' | 'boolean' | 'select';
	operators: Operator[];
	settings?: any;
}

/**
 * Operator for QueryBuilder constraints
 */
export interface Operator {
	name: string;
	label: string;
	settings?: any;
}

/**
 * QueryBuilder rule structure
 */
export interface QueryBuilderRule {
	type?: string; // Optional - only needed for 'or' groups
	dataType?: 'text' | 'number' | 'date' | 'boolean' | 'select'; // data type for validation and query building
	data: {
		operator?: string;
		settings?: {
			field?: string;
			value?: any;
			[key: string]: any;
		};
		groups?: Array<{ rules: QueryBuilderRule[] }>;
	};
}

/**
 * QueryBuilder filter for complex nested conditions
 */
export class QueryBuilderFilter extends Filter {
	protected _constraints: Constraint[] = [];
	protected _constraintPickerColumns?: Record<string, number | null>;
	protected _constraintPickerWidth?: Resolvable<string>;

	/**
	 * Set the constraints available in the query builder
	 */
	constraints(constraints: Constraint[]): this {
		this._constraints = constraints;
		return this;
	}

	/**
	 * Set the number of columns for the constraint picker
	 */
	constraintPickerColumns(columns: number | Record<string, number | null>): this {
		if (typeof columns === 'number') {
			this._constraintPickerColumns = { lg: columns };
		} else {
			this._constraintPickerColumns = columns;
		}
		return this;
	}

	/**
	 * Set the width of the constraint picker
	 */
	constraintPickerWidth(width: Resolvable<string>): this {
		this._constraintPickerWidth = width;
		return this;
	}

	/**
	 * Get the constraints
	 */
	getConstraints(): Constraint[] {
		return this._constraints;
	}

	/**
	 * Get a specific constraint by name
	 */
	getConstraint(name: string): Constraint | undefined {
		return this._constraints.find(c => c.name === name);
	}

	/**
	 * Serialize to JSON
	 */
	toJSON(): any {
		return {
			...super.toJSON(),
			type: 'queryBuilder',
			constraints: this._constraints,
			constraintPickerColumns: this._constraintPickerColumns,
			constraintPickerWidth: this._constraintPickerWidth,
		};
	}

	/**
	 * Static factory method
	 */
	static make(name: string): QueryBuilderFilter {
		return new QueryBuilderFilter(name);
	}
}

/**
 * Helper to create common text field constraints
 */
export function textConstraint(name: string, label: string): Constraint {
	return {
		name,
		label,
		dataType: 'text',
		operators: [
			{ name: 'equals', label: 'Equals' },
			{ name: 'notEquals', label: 'Does not equal' },
			{ name: 'contains', label: 'Contains' },
			{ name: 'startsWith', label: 'Starts with' },
			{ name: 'endsWith', label: 'Ends with' },
			{ name: 'isNull', label: 'Is null' },
			{ name: 'isNotNull', label: 'Is not null' },
		],
	};
}

/**
 * Helper to create common number field constraints
 */
export function numberConstraint(name: string, label: string): Constraint {
	return {
		name,
		label,
		dataType: 'number',
		operators: [
			{ name: 'equals', label: 'Equals' },
			{ name: 'notEquals', label: 'Does not equal' },
			{ name: 'greaterThan', label: 'Greater than' },
			{ name: 'greaterThanOrEqual', label: 'Greater than or equal' },
			{ name: 'lessThan', label: 'Less than' },
			{ name: 'lessThanOrEqual', label: 'Less than or equal' },
			{ name: 'between', label: 'Between' },
			{ name: 'notBetween', label: 'Not between' },
			{ name: 'isNull', label: 'Is null' },
			{ name: 'isNotNull', label: 'Is not null' },
		],
	};
}

/**
 * Helper to create common boolean field constraints
 */
export function booleanConstraint(name: string, label: string): Constraint {
	return {
		name,
		label,
		dataType: 'boolean',
		operators: [
			{ name: 'equals', label: 'Is' },
			{ name: 'notEquals', label: 'Is not' },
		],
	};
}

/**
 * Helper to create common select/enum field constraints
 */
export function selectConstraint(name: string, label: string, options: Record<string, string>): Constraint {
	return {
		name,
		label,
		dataType: 'select',
		operators: [
			{ name: 'equals', label: 'Is' },
			{ name: 'notEquals', label: 'Is not' },
			{ name: 'in', label: 'Is any of', settings: { options } },
			{ name: 'notIn', label: 'Is none of', settings: { options } },
		],
	};
}

/**
 * Helper to create common date field constraints
 */
export function dateConstraint(name: string, label: string): Constraint {
	return {
		name,
		label,
		dataType: 'date',
		operators: [
			{ name: 'equals', label: 'Is' },
			{ name: 'notEquals', label: 'Is not' },
			{ name: 'before', label: 'Before' },
			{ name: 'after', label: 'After' },
			{ name: 'between', label: 'Between' },
			{ name: 'isNull', label: 'Is null' },
			{ name: 'isNotNull', label: 'Is not null' },
		],
	};
}
