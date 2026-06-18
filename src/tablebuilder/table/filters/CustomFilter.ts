import { Filter } from './Filter';

/**
 * Custom filter that allows users to define their own filter component
 */
export class CustomFilter extends Filter {
	protected _component?: string;
	protected _componentProps?: Record<string, any>;

	/**
	 * Set the custom React component name to render
	 */
	component(component: string): this {
		this._component = component;
		return this;
	}

	/**
	 * Set props to pass to the custom component
	 */
	componentProps(props: Record<string, any>): this {
		this._componentProps = props;
		return this;
	}

	/**
	 * Get the component name
	 */
	getComponent(): string | undefined {
		return this._component;
	}

	/**
	 * Get the component props
	 */
	getComponentProps(): Record<string, any> | undefined {
		return this._componentProps;
	}

	/**
	 * Serialize to JSON
	 */
	toJSON(): any {
		return {
			...super.toJSON(),
			type: 'custom',
			component: this._component,
			componentProps: this._componentProps,
		};
	}

	/**
	 * Static factory method
	 */
	static make(name: string): CustomFilter {
		return new CustomFilter(name);
	}
}
