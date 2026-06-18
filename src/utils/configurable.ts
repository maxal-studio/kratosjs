/**
 * Global configuration registry for builder classes.
 *
 * Mirrors Filament's `Table::configureUsing()` / `Form::configureUsing()` /
 * `Action::configureUsing()` / `Field::configureUsing()`: plugins register
 * callbacks that mutate every instance of a builder family. Callbacks are applied
 * after a resource has defined its schema and before serialization (see
 * `Panel.createResourceInstance`), so they can inject into already-built
 * collections (columns, actions) and override per-resource settings.
 */
export interface Configurator<T> {
	/** Register a configuration callback. */
	register(cb: (instance: T) => void): void;
	/** Apply all registered callbacks to an instance, in registration order. */
	apply(instance: T): void;
	/** Remove all registered callbacks (used by tests and hot reload). */
	clear(): void;
}

export function makeConfigurable<T>(): Configurator<T> {
	const callbacks: Array<(instance: T) => void> = [];
	return {
		register(cb) {
			callbacks.push(cb);
		},
		apply(instance) {
			for (const cb of callbacks) {
				cb(instance);
			}
		},
		clear() {
			callbacks.length = 0;
		},
	};
}
