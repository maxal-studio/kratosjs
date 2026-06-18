import { Resolvable, SerializedForm } from '../types';
import { Component } from '../Component';
import { makeConfigurable } from '../../utils/configurable';

/**
 * FormBuilder class for composing form schemas
 */
export class FormBuilder {
	protected components: Component[] = [];
	protected _columns: Resolvable<number | Record<string, number>> = 1;

	/**
	 * Set the form schema (components)
	 */
	schema(components: Component[]): this {
		this.components = components;
		return this;
	}

	/**
	 * Set the number of columns in the form's grid
	 * @param columns - number or object with breakpoints
	 */
	columns(columns: number | Resolvable<Record<string, number>>): this {
		this._columns = columns;
		return this;
	}

	protected evaluate<T>(value: Resolvable<T>): T {
		return typeof value === 'function' ? (value as () => T)() : value;
	}

	getColumns(): number | Record<string, number> {
		return this.evaluate(this._columns);
	}

	/**
	 * Add a single component to the schema
	 */
	addComponent(component: Component): this {
		this.components.push(component);
		return this;
	}

	/**
	 * Get all components
	 */
	getComponents(): Component[] {
		return this.components;
	}

	/**
	 * Serialize the form to JSON format
	 */
	toJSON(): SerializedForm {
		const form: SerializedForm = {
			type: 'form',
			components: this.components.map(component => component.toJSON()),
		};

		// Add columns if specified
		const columns = this.getColumns();
		if (columns && columns !== 1) {
			form.columns = columns;
		}

		return form;
	}

	/**
	 * Get JSON string representation
	 */
	toJSONString(pretty: boolean = false): string {
		return JSON.stringify(this.toJSON(), null, pretty ? 2 : 0);
	}

	/**
	 * Static factory method
	 */
	static make(): FormBuilder {
		return new FormBuilder();
	}

	private static _configurator = makeConfigurable<FormBuilder>();

	/**
	 * Register a callback that mutates every form in the panel.
	 * Applied after a resource defines its form and before serialization.
	 */
	static configureUsing(cb: (form: FormBuilder) => void): typeof FormBuilder {
		this._configurator.register(cb);
		return this;
	}

	/** Apply all registered global configuration callbacks to a form. */
	static applyConfiguration(form: FormBuilder): void {
		this._configurator.apply(form);
	}

	/** Remove all registered global configuration callbacks. */
	static clearConfigurations(): void {
		this._configurator.clear();
	}
}
