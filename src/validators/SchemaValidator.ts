import { SerializedForm, SerializedComponent } from '../formbuilder/types';
import { getChildComponents, collectFieldNames, isArrayScope } from '../utils/formSchemaTraversal';
import { ValidationError } from '../resource/types';
import { ValidationEngine } from '../validation/ValidationEngine';
import { resolveValidationCondition } from '../validation/conditions';
import { formatValidationMessage } from '../validation/messages';

type FormOperation = 'create' | 'edit' | 'view';

/**
 * Build a structured type-mismatch ValidationError carrying the i18n `messageKey`
 * + `params` (so the client can localize it) plus a rendered English `message`.
 */
function typeError(component: SerializedComponent, messageKey: string): ValidationError {
	const label = ((component.label as string) || component.name) ?? '';
	return new ValidationError({
		message: formatValidationMessage(messageKey, { label }),
		field: component.name,
		rule: 'type',
		messageKey,
		params: { label },
	});
}

/** A pure layout container (inherits parent value scope, holds no value of its own). */
function isLayout(component: SerializedComponent): boolean {
	return (component as any).isLayout === true;
}

/**
 * Validates data against form schemas
 */
export class SchemaValidator {
	/**
	 * Validate data for create operation
	 */
	static validateCreate(schema: SerializedForm, data: any): any {
		const validated = { ...data };

		// Validate types first (also normalizes select values in place)
		this.validateTypes(schema, validated);

		// Validate declared rules (required is enforced on create)
		this.validateRules(schema, validated, { enforceRequired: true, operation: 'create' });

		// Filter fields (only allow fields in schema)
		return this.filterFields(schema, validated);
	}

	/**
	 * Validate data for update operation
	 */
	static validateUpdate(schema: SerializedForm, data: any): any {
		const validated = { ...data };

		// Validate types for provided fields (also normalizes select values)
		this.validateTypes(schema, validated);

		// For updates, required is not enforced (partial updates allowed); all
		// other declared rules still apply to the fields that are present.
		this.validateRules(schema, validated, { enforceRequired: false, operation: 'edit' });

		// Filter fields
		return this.filterFields(schema, validated);
	}

	/**
	 * Filter data to only include fields in schema
	 */
	static filterFields(schema: SerializedForm, data: any, includedFields: string[] = []): any {
		const filtered: any = {};
		const allowedFields = [...includedFields, ...this.getAllowedFields(schema)];

		for (const field of allowedFields) {
			if (data[field] !== undefined) {
				filtered[field] = data[field];
			}
		}

		return filtered;
	}

	/**
	 * Get all allowed (parent-scope) field names from schema, via the shared
	 * declarative traversal — layout containers are transparent, array-scope
	 * containers (repeaters) contribute only their own name.
	 */
	private static getAllowedFields(schema: SerializedForm): string[] {
		const fields: string[] = [];
		for (const component of (schema.components || []) as SerializedComponent[]) {
			collectFieldNames(component, fields);
		}
		return fields;
	}

	/**
	 * Validate field types
	 */
	static validateTypes(schema: SerializedForm, data: any): void {
		const components = schema.components || [];
		for (const component of components) {
			this.validateComponentType(component, data);
		}
	}

	/**
	 * Validate type for a single component
	 */
	private static validateComponentType(component: SerializedComponent, data: any): void {
		if (isLayout(component)) {
			for (const child of getChildComponents(component)) {
				this.validateComponentType(child, data);
			}
			return;
		}

		if (!component.name || data[component.name] === undefined) {
			return;
		}

		const value = data[component.name];

		// Skip null/empty values (handled by required validation)
		if (value === null || value === '') {
			return;
		}

		// Validate based on component type
		switch (component.type) {
			case 'textinput':
			case 'textarea':
			case 'radio':
			case 'colorpicker':
			case 'datetimepicker':
				if (typeof value !== 'string') {
					throw typeError(component, 'validation.type.string');
				}
				break;

			case 'select': {
				// Relationship selects may arrive as populated objects or numeric FKs from the API
				const normalized = this.normalizeSelectValue(value, !!component.multiple);
				data[component.name] = normalized;

				if (component.multiple) {
					if (!Array.isArray(normalized)) {
						throw typeError(component, 'validation.type.array');
					}
					const hasInvalidItem = normalized.some(
						item => item !== null && item !== '' && typeof item !== 'string' && typeof item !== 'number',
					);
					if (hasInvalidItem) {
						throw typeError(component, 'validation.type.array_items');
					}
				} else if (typeof normalized !== 'string' && typeof normalized !== 'number') {
					throw typeError(component, 'validation.type.string');
				}
				break;
			}

			case 'tags':
				// Tags input should always be an array
				if (!Array.isArray(value)) {
					throw typeError(component, 'validation.type.array');
				}
				break;

			case 'checkbox':
			case 'toggle':
				if (typeof value !== 'boolean') {
					throw typeError(component, 'validation.type.boolean');
				}
				break;

			case 'repeater':
				if (!Array.isArray(value)) {
					throw typeError(component, 'validation.type.array');
				}
				break;
		}
	}

	/**
	 * Validate field rules
	 */
	static validateRules(
		schema: SerializedForm,
		data: any,
		opts: { enforceRequired: boolean; operation: FormOperation },
	): void {
		const components = schema.components || [];
		for (const component of components) {
			this.validateComponentRules(component, data, opts);
		}
	}

	/**
	 * Validate rules for a single component by delegating to the shared
	 * ValidationEngine — the SAME engine the React frontend uses, so server and
	 * client agree on every rule and message.
	 */
	private static validateComponentRules(
		component: SerializedComponent,
		data: any,
		opts: { enforceRequired: boolean; operation: FormOperation },
	): void {
		// Pure layout container (Section/Group/Tabs/Tab): children share the parent
		// value scope — recurse with the same data.
		if (isLayout(component)) {
			for (const child of getChildComponents(component)) {
				this.validateComponentRules(child, data, opts);
			}
			return;
		}

		if (!component.name) return;

		// Array-scope container (Repeater): validate the container's own rules
		// against the array (e.g. required/min item count), then validate each
		// item-template field against each element — its own value scope. This
		// keeps the server in step with the client, which validates every row.
		if (isArrayScope(component)) {
			this.applyRules(component, data[component.name], data, opts);

			const items = data[component.name];
			if (Array.isArray(items)) {
				const childComponents = getChildComponents(component);
				for (const item of items) {
					const itemScope = item && typeof item === 'object' ? item : {};
					for (const child of childComponents) {
						this.validateComponentRules(child, itemScope, opts);
					}
				}
			}
			return;
		}

		// Plain value-bearing field.
		this.applyRules(component, data[component.name], data, opts);
	}

	/**
	 * Run a single field's rules through the shared engine against `value`,
	 * resolving conditions against `allValues` (the current value scope), and
	 * throw the first violation as a ValidationError.
	 */
	private static applyRules(
		component: SerializedComponent,
		value: any,
		allValues: any,
		opts: { enforceRequired: boolean; operation: FormOperation },
	): void {
		const ruleStrings = this.extractRuleStrings(component, allValues, opts);
		if (ruleStrings.length === 0) return;

		// `required` runs even when absent; all other rules only apply to fields
		// that are actually present in the payload.
		if (value === undefined && !ruleStrings.includes('required')) return;

		const messages = (component as any).validation?.messages as Record<string, string> | undefined;
		const violations = ValidationEngine.validateValue(value, ruleStrings, {
			allValues,
			field: component.name,
			label: component.label as string | undefined,
			messages,
		});

		if (violations.length > 0) {
			const v = violations[0];
			throw new ValidationError({
				message: v.message,
				field: v.field,
				rule: v.rule,
				messageKey: v.messageKey,
				params: v.params,
			});
		}
	}

	/**
	 * Collect the rule strings that apply to a component for this operation.
	 * Reads the serialized `validation.rules` (objects `{ rule, condition }`) and
	 * also tolerates a flat `rules` array. Conditions are resolved server-side;
	 * `required` is dropped on update (partial updates allowed).
	 */
	private static extractRuleStrings(
		component: SerializedComponent,
		data: any,
		opts: { enforceRequired: boolean; operation: FormOperation },
	): string[] {
		const raw =
			(component as any).validation?.rules ??
			(Array.isArray((component as any).rules) ? (component as any).rules : []);

		const out: string[] = [];

		// Honor a flat `required: true` flag (hand-built/plugin schemas) as an
		// implicit required rule, in addition to any rules under `validation`.
		if (opts.enforceRequired && (component as any).required === true) {
			out.push('required');
		}

		for (const entry of raw as any[]) {
			let rule: unknown;
			let condition: unknown;
			if (entry && typeof entry === 'object' && 'rule' in entry) {
				rule = (entry as any).rule;
				condition = (entry as any).condition;
			} else {
				rule = entry;
			}

			if (typeof rule !== 'string') continue;
			if (!opts.enforceRequired && rule === 'required') continue;
			if (!resolveValidationCondition(condition, { data, operation: opts.operation })) continue;

			out.push(rule);
		}
		return out;
	}

	/**
	 * Normalize select values: populated relations `{ id, ... }` → id, preserve string/number ids.
	 */
	private static normalizeSelectValue(value: any, multiple: boolean): any {
		if (multiple) {
			if (!Array.isArray(value)) {
				return value;
			}
			return value.map(item => this.extractSelectId(item));
		}
		return this.extractSelectId(value);
	}

	private static extractSelectId(value: any): any {
		if (value == null || value === '') {
			return value;
		}
		if (typeof value === 'object' && !Array.isArray(value)) {
			const id = value._id ?? value.id;
			if (id !== undefined && id !== null) {
				return id;
			}
		}
		return value;
	}
}
