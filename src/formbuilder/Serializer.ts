import { SerializedComponent, SerializedForm } from './types';
import { Field } from './form/Field';
import { FormBuilder } from './form/FormBuilder';

/**
 * Serializer utility for converting components to JSON
 * Handles the conversion of the component tree to a comprehensive JSON format
 */
export class Serializer {
	/**
	 * Serialize a single component to JSON
	 */
	static serializeComponent(component: Field): SerializedComponent {
		return component.toJSON();
	}

	/**
	 * Serialize multiple components to JSON
	 */
	static serializeComponents(components: Field[]): SerializedComponent[] {
		return components.map(component => this.serializeComponent(component));
	}

	/**
	 * Serialize a form builder to JSON
	 */
	static serializeForm(formBuilder: FormBuilder): SerializedForm {
		return formBuilder.toJSON();
	}

	/**
	 * Serialize to JSON string
	 */
	static toJSONString(input: Field | Field[] | FormBuilder, pretty: boolean = false): string {
		let data: SerializedComponent | SerializedComponent[] | SerializedForm;

		if (input instanceof FormBuilder) {
			data = this.serializeForm(input);
		} else if (Array.isArray(input)) {
			data = this.serializeComponents(input);
		} else {
			data = this.serializeComponent(input);
		}

		return JSON.stringify(data, null, pretty ? 2 : 0);
	}

	/**
	 * Parse JSON string back to object
	 */
	static fromJSONString(jsonString: string): SerializedComponent | SerializedComponent[] | SerializedForm {
		return JSON.parse(jsonString);
	}
}
