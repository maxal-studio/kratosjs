import { Resolvable, SerializedColumn } from './types';
import { HasName } from './concerns/HasName';
import { HasLabel } from './concerns/HasLabel';
import { HasState } from './concerns/HasState';
import { CanBeHidden } from './concerns/CanBeHidden';
import { CanBeDisabled } from './concerns/CanBeDisabled';
import { CanBeSortable } from './concerns/CanBeSortable';
import { CanBeToggled } from './concerns/CanBeToggled';
import { HasWidth } from './concerns/HasWidth';
import { CanWrap } from './concerns/CanWrap';
import { HasColor } from './concerns/HasColor';
import { CanHaveDeeplink } from './concerns/CanHaveDeeplink';
import { makeConfigurable } from '../utils/configurable';

/**
 * Formatter function type
 * Receives the cell value and the entire row data
 * Returns the formatted value (can be any type - string, number, React element, etc.)
 * Can be async to allow for backend operations
 */
export type FormatterFn = (value: any, row: Record<string, any>) => any | Promise<any>;

/**
 * Base Column class with mixins applied
 */
class BaseColumn {
	protected columnType: string = 'column';
	protected _formatter?: FormatterFn;
	protected _gridSpanFull: boolean = false;

	protected evaluate<T>(value: Resolvable<T>): T {
		return typeof value === 'function' ? (value as () => T)() : value;
	}

	configure(): this {
		// Hook for subclasses to configure themselves after instantiation
		return this;
	}

	getType(): string {
		return this.columnType;
	}

	/**
	 * Set a formatter function to transform the cell value before display
	 * @param fn Function that receives (value, row) and returns the formatted value
	 * @example
	 * // Prepend URL to image path
	 * .formatStateUsing((value) => `https://cdn.example.com/${value}`)
	 *
	 * // Access nested property
	 * .formatStateUsing((value) => value?.key || '')
	 *
	 * // Mask email
	 * .formatStateUsing((value) => value ? '**' + value.slice(2) : '')
	 *
	 * // Use row data
	 * .formatStateUsing((value, row) => `${row.firstName} ${row.lastName}`)
	 */
	formatStateUsing(fn: FormatterFn): this {
		this._formatter = fn;
		return this;
	}

	/**
	 * Get the formatter function
	 */
	getFormatter(): FormatterFn | undefined {
		return this._formatter;
	}

	/**
	 * Check if column has a formatter
	 */
	hasFormatter(): boolean {
		return this._formatter !== undefined;
	}

	/**
	 * Set whether this column should span full width in grid view
	 * Useful for media columns (image, video) that should take full card width
	 * @param condition - true to span full width, false otherwise (default: false)
	 */
	gridSpanFull(condition: boolean = true): this {
		this._gridSpanFull = condition;
		return this;
	}

	/**
	 * Get whether this column spans full width in grid view
	 */
	getGridSpanFull(): boolean {
		return this._gridSpanFull;
	}

	/**
	 * Serialize column to JSON
	 * Subclasses should override this to add their specific properties
	 */
	toJSON(): SerializedColumn {
		const self = this as any;

		const json: SerializedColumn = {
			type: this.getType(),
			name: self.getName(),
		};

		// Add label if present
		const label = self.getLabel?.();
		if (label !== undefined) {
			json.label = label;
		}

		// Add visibility state
		if (self._isHidden !== undefined && self._isHidden !== false) {
			// If it's a function, serialize it as a string for runtime evaluation
			if (typeof self._isHidden === 'function') {
				json.hiddenFn = self._isHidden.toString();
			} else {
				json.hidden = self._isHidden;
			}
		}

		// Add disabled state
		if (self._isDisabled !== undefined && self._isDisabled !== false) {
			// If it's a function, serialize it as a string for runtime evaluation
			if (typeof self._isDisabled === 'function') {
				json.disabledFn = self._isDisabled.toString();
			} else {
				json.disabled = self._isDisabled;
			}
		}

		// Add sortable
		if (self._isSortable) {
			json.sortable = true;
			if (self._sortColumn) {
				json.sortColumn = self._sortColumn;
			}
		}

		// Add toggleable
		if (self._isToggleable !== undefined) {
			json.toggleable = self.isToggleable();
			json.toggledHiddenByDefault = self.isToggledHiddenByDefault?.() || false;
		}

		// Add width
		const width = self.getWidth?.();
		if (width) {
			json.width = width;
		}

		// Add wrap
		if (self._canWrap !== undefined && self.canWrap?.()) {
			json.wrap = true;
		}

		// Add color
		const color = self.getColor?.();
		if (color) {
			json.color = color;
		}

		// Add grid span full
		if (self._gridSpanFull) {
			json.gridSpanFull = true;
		}

		return json;
	}
}

// Apply column-specific mixins
const ColumnWithMixins = CanHaveDeeplink(
	HasColor(
		CanWrap(
			HasWidth(CanBeToggled(CanBeSortable(CanBeDisabled(CanBeHidden(HasState(HasLabel(HasName(BaseColumn)))))))),
		),
	),
);

export class Column extends ColumnWithMixins {
	constructor(name: string) {
		super();
		this.name(name);
	}

	static make(name: string): Column {
		const column = new Column(name);
		column.configure();
		return column;
	}

	private static _configurator = makeConfigurable<Column>();

	/**
	 * Register a callback that mutates every column in the panel (all column types).
	 * Applied during global configuration, before serialization.
	 */
	static configureUsing(cb: (column: Column) => void): typeof Column {
		Column._configurator.register(cb);
		return Column;
	}

	/** Apply all registered global configuration callbacks to a column. */
	static applyConfiguration(column: Column): void {
		Column._configurator.apply(column);
	}

	/** Remove all registered global configuration callbacks. */
	static clearConfigurations(): void {
		Column._configurator.clear();
	}
}
