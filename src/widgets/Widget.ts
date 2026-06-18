import type { EntityManager, EntityName } from '@mikro-orm/core';

export interface SerializedWidget {
	type: 'stats' | 'chart' | string;
	name: string;
	label?: string;
	icon?: string;
	color?: string;
	[key: string]: any;
}

/**
 * Base Widget class for table widgets
 * @template TData The type of data this widget expects from its render function
 */
export abstract class Widget<TData = any> {
	protected _name: string;
	protected _label?: string;
	protected _icon?: string;
	protected _color?: string;
	protected abstract widgetType: 'stats' | 'chart' | string;

	constructor(name: string) {
		this._name = name;
	}

	/**
	 * Set widget label
	 */
	label(label: string): this {
		this._label = label;
		return this;
	}

	/**
	 * Set widget icon (Lucide icon name)
	 */
	icon(icon: string): this {
		this._icon = icon;
		return this;
	}

	/**
	 * Set widget color/theme
	 */
	color(color: string): this {
		this._color = color;
		return this;
	}

	/**
	 * Get widget name
	 */
	getName(): string {
		return this._name;
	}

	/**
	 * Execute the render function to calculate widget data
	 * This function will be called by the backend to calculate widget data
	 * @param em The MikroORM EntityManager (request-scoped)
	 * @param entity The entity of the resource the widget belongs to
	 * @returns The widget data in the format expected by this widget type
	 */
	abstract execute(em: EntityManager, entity: EntityName<any>): Promise<TData>;

	/**
	 * Serialize widget to JSON
	 */
	toJSON(): SerializedWidget {
		return {
			type: this.widgetType,
			name: this._name,
			label: this._label,
			icon: this._icon,
			color: this._color,
		};
	}
}
