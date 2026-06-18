import type { EntityManager, EntityName } from '@mikro-orm/core';
import { Widget, SerializedWidget } from './Widget';

export interface SerializedStatsWidget extends SerializedWidget {
	type: 'stats';
	format?: 'number' | 'currency' | 'percentage';
	currency?: string;
	precision?: number;
	suffix?: string;
	prefix?: string;
}

/**
 * Stats Widget - displays aggregated numeric data
 * The render function must return a number or null
 */
export class StatsWidget extends Widget<number | null> {
	protected widgetType = 'stats' as const;
	protected _format?: 'number' | 'currency' | 'percentage';
	protected _currency?: string;
	protected _precision?: number;
	protected _suffix?: string;
	protected _prefix?: string;
	protected _renderFunction?: (em: EntityManager, entity: EntityName<any>) => Promise<number | null>;

	/**
	 * Factory method
	 */
	static make(name: string): StatsWidget {
		return new StatsWidget(name);
	}

	/**
	 * Set display format
	 */
	format(format: 'number' | 'currency' | 'percentage'): this {
		this._format = format;
		return this;
	}

	/**
	 * Set currency code (e.g., 'USD', 'EUR')
	 */
	currency(currency: string): this {
		this._currency = currency;
		this._format = 'currency';
		return this;
	}

	/**
	 * Set decimal precision
	 */
	precision(decimals: number): this {
		this._precision = decimals;
		return this;
	}

	/**
	 * Set value suffix (e.g., 'users', 'posts')
	 */
	suffix(suffix: string): this {
		this._suffix = suffix;
		return this;
	}

	/**
	 * Set value prefix (e.g., '$', '€')
	 */
	prefix(prefix: string): this {
		this._prefix = prefix;
		return this;
	}

	/**
	 * Set the render function that returns the widget data
	 * @param fn Function that takes the EntityManager and the resource entity and returns a number or null
	 */
	render(fn: (em: EntityManager, entity: EntityName<any>) => Promise<number | null>): this {
		this._renderFunction = fn;
		return this;
	}

	/**
	 * Execute the render function (called internally by Panel)
	 */
	async execute(em: EntityManager, entity: EntityName<any>): Promise<number | null> {
		if (!this._renderFunction) {
			throw new Error(`StatsWidget "${this._name}" must have a render function defined`);
		}
		return this._renderFunction(em, entity);
	}

	/**
	 * Serialize to JSON
	 */
	toJSON(): SerializedStatsWidget {
		return {
			...super.toJSON(),
			type: 'stats',
			format: this._format,
			currency: this._currency,
			precision: this._precision,
			suffix: this._suffix,
			prefix: this._prefix,
		};
	}
}
