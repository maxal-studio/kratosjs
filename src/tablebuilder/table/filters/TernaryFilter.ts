import { Filter } from './Filter';
import { SerializedFilter } from '../../types';

/**
 * TernaryFilter for three-state filtering (true/false/null)
 */
export class TernaryFilter extends Filter {
	protected _placeholder?: string;
	protected _trueLabel?: string;
	protected _falseLabel?: string;
	protected _nullable: boolean = true;

	/**
	 * Set placeholder text (for null/all state)
	 */
	placeholder(placeholder: string): this {
		this._placeholder = placeholder;
		return this;
	}

	/**
	 * Set label for true state
	 */
	trueLabel(label: string): this {
		this._trueLabel = label;
		return this;
	}

	/**
	 * Set label for false state
	 */
	falseLabel(label: string): this {
		this._falseLabel = label;
		return this;
	}

	/**
	 * Make filter nullable (allow "all" option)
	 */
	nullable(condition: boolean = true): this {
		this._nullable = condition;
		return this;
	}

	getPlaceholder(): string | undefined {
		return this._placeholder;
	}

	getTrueLabel(): string | undefined {
		return this._trueLabel;
	}

	getFalseLabel(): string | undefined {
		return this._falseLabel;
	}

	isNullable(): boolean {
		return this._nullable;
	}

	toJSON(): SerializedFilter {
		return {
			...super.toJSON(),
			type: 'ternary',
			placeholder: this._placeholder,
			trueLabel: this._trueLabel,
			falseLabel: this._falseLabel,
			nullable: this._nullable,
		};
	}

	static make(name: string): TernaryFilter {
		return new TernaryFilter(name);
	}
}
