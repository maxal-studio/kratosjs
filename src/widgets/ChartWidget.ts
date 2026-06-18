import type { EntityManager, EntityName } from '@mikro-orm/core';
import { Widget, SerializedWidget } from './Widget';

export interface SerializedChartWidget extends SerializedWidget {
	type: 'chart';
	chartType: 'line' | 'bar' | 'pie';
	showLegend?: boolean;
}

export type ChartDataPoint = {
	label: string;
	value: number;
};

/**
 * Chart Widget - displays time-series or grouped chart data
 * The render function must return an array of { label: string, value: number } or null
 */
export class ChartWidget extends Widget<ChartDataPoint[] | null> {
	protected widgetType = 'chart' as const;
	protected _chartType: 'line' | 'bar' | 'pie' = 'line';
	protected _showLegend: boolean = false;
	protected _renderFunction?: (em: EntityManager, entity: EntityName<any>) => Promise<ChartDataPoint[] | null>;

	/**
	 * Factory method
	 */
	static make(name: string): ChartWidget {
		return new ChartWidget(name);
	}

	/**
	 * Set chart type
	 */
	type(type: 'line' | 'bar' | 'pie'): this {
		this._chartType = type;
		return this;
	}

	/**
	 * Show or hide the legend
	 * @param show Whether to show the legend (default: false)
	 */
	showLegend(show: boolean = true): this {
		this._showLegend = show;
		return this;
	}

	/**
	 * Set the render function that returns the widget data
	 * @param fn Function that takes the EntityManager and the resource entity and returns chart data points or null
	 */
	render(fn: (em: EntityManager, entity: EntityName<any>) => Promise<ChartDataPoint[] | null>): this {
		this._renderFunction = fn;
		return this;
	}

	/**
	 * Execute the render function (called internally by Panel)
	 */
	async execute(em: EntityManager, entity: EntityName<any>): Promise<ChartDataPoint[] | null> {
		if (!this._renderFunction) {
			throw new Error(`ChartWidget "${this._name}" must have a render function defined`);
		}
		return this._renderFunction(em, entity);
	}

	/**
	 * Serialize to JSON
	 */
	toJSON(): SerializedChartWidget {
		return {
			...super.toJSON(),
			type: 'chart',
			chartType: this._chartType,
			showLegend: this._showLegend,
		};
	}
}
