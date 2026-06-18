import { Resolvable, SerializedComponent } from './types';
import { HasName } from './concerns/HasName';
import { HasLabel } from './concerns/HasLabel';
import { HasState } from './concerns/HasState';
import { CanBeHidden } from './concerns/CanBeHidden';
import { CanBeDisabled } from './concerns/CanBeDisabled';
import { HasExtraAttributes } from './concerns/HasExtraAttributes';

/**
 * Base Component class with mixins applied
 */
class BaseComponent {
	protected componentType: string = 'component';

	protected evaluate<T>(value: Resolvable<T>): T {
		return typeof value === 'function' ? (value as () => T)() : value;
	}

	configure(): this {
		// Hook for subclasses to configure themselves after instantiation
		return this;
	}

	getType(): string {
		return this.componentType;
	}

	/**
	 * Child components nested inside this component. Container components
	 * (Section, Group, Tabs, Tab, Repeater) override this. The base traversal
	 * utilities use it to discover descendants generically — so any plugin
	 * container that overrides this is automatically understood by the core.
	 */
	getChildComponents(): Component[] {
		return [];
	}

	/**
	 * Whether this is a pure layout container that holds no value of its own
	 * (e.g. Section, Group, Tabs, Tab). Fields and value-bearing containers
	 * (Repeater) return false.
	 */
	isLayoutComponent(): boolean {
		return false;
	}

	/**
	 * How child values are scoped relative to this component:
	 * - 'inherit' (default for layout containers): children write to the parent scope.
	 * - 'array': children form an item template; values live under this component's
	 *   own name as an array (Repeater).
	 * Leaf fields return undefined.
	 */
	getChildScope(): 'inherit' | 'array' | undefined {
		return undefined;
	}

	/**
	 * Serialize component to JSON
	 * Subclasses should override this to add their specific properties
	 */
	toJSON(): SerializedComponent {
		const self = this as any;

		const json: SerializedComponent = {
			type: this.getType(),
			name: self.getName(),
		};

		// Add label if present
		const label = self.getLabel?.();
		if (label !== undefined) {
			json.label = label;
		}

		// Add state path if present
		const statePath = self.getStatePath?.();
		if (statePath !== undefined) {
			json.statePath = statePath;
		}

		// Add default state if present
		if (self.hasDefaultState?.()) {
			json.default = self.getDefaultState();
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

		// Add extra attributes
		const extraAttributes = self.getExtraAttributes?.();
		if (extraAttributes && Object.keys(extraAttributes).length > 0) {
			json.extraAttributes = extraAttributes;
		}

		// Declarative children contract — serialize nested components under the
		// canonical `schema` key plus the layout/scope metadata the shared
		// traversal walkers (backend + frontend) rely on.
		const children = this.getChildComponents();
		if (children.length > 0) {
			json.schema = children.map(child => child.toJSON());
		}
		if (this.isLayoutComponent()) {
			json.isLayout = true;
		}
		const childScope = this.getChildScope();
		if (childScope) {
			json.childScope = childScope;
		}

		return json;
	}
}

// Apply all mixins to create the Component class
const ComponentWithMixins = HasExtraAttributes(CanBeDisabled(CanBeHidden(HasState(HasLabel(HasName(BaseComponent))))));

/**
 * Component class with all mixins applied
 */
export class Component extends ComponentWithMixins {
	constructor(name: string) {
		super();
		this.name(name);
		this.statePath(name);
	}

	static make(name: string): Component {
		const instance = new this(name);
		instance.configure();
		return instance;
	}
}
