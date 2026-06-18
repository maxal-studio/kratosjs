import { SerializedAction } from '../../types';
import { FormBuilder, SerializedForm } from '../../../formbuilder';
import { makeConfigurable } from '../../../utils/configurable';

export type ActionHandler = (row: any) => Promise<{ success: boolean; message?: string; data?: any }>;
export type ActionCallback = (record?: any) => void | Promise<void>;

/**
 * Base Action class
 */
export class Action {
	protected _name: string;
	protected _label?: string;
	protected _icon?: string;
	protected _color?: string;
	protected _requiresConfirmation: boolean = false;
	protected _modalHeading?: string;
	protected _modalDescription?: string;
	protected _actionCallback?: ActionCallback;
	protected _handler?: ActionHandler;
	protected _form?: SerializedForm;
	protected _export?: string;

	constructor(name: string) {
		this._name = name;
	}

	static make(name: string): Action {
		return new Action(name);
	}

	/**
	 * Set action label
	 */
	label(label: string): this {
		this._label = label;
		return this;
	}

	/**
	 * Set action icon
	 */
	icon(icon: string): this {
		this._icon = icon;
		return this;
	}

	/**
	 * Set action color
	 */
	color(color: string): this {
		this._color = color;
		return this;
	}

	/**
	 * Require confirmation before executing
	 */
	requiresConfirmation(condition: boolean = true): this {
		this._requiresConfirmation = condition;
		return this;
	}

	/**
	 * Set confirmation modal heading
	 */
	modalHeading(heading: string): this {
		this._modalHeading = heading;
		this._requiresConfirmation = true;
		return this;
	}

	/**
	 * Set confirmation modal description
	 */
	modalDescription(description: string): this {
		this._modalDescription = description;
		this._requiresConfirmation = true;
		return this;
	}

	/**
	 * Set form schema for the action
	 */
	form(formBuilder: FormBuilder): this {
		this._form = formBuilder.toJSON();
		return this;
	}

	/**
	 * Mark this action as a file export/download in the given format (e.g. 'csv').
	 * The frontend triggers a download from the resource's export endpoint instead
	 * of the standard action request/toast flow.
	 */
	exportsTo(format: string): this {
		this._export = format;
		return this;
	}

	getExport(): string | undefined {
		return this._export;
	}

	/**
	 * Set a synchronous action callback
	 */
	action(callback: ActionCallback): this;
	/**
	 * Set an async action handler that returns a result
	 */
	action(handler: ActionHandler): this;
	action(callbackOrHandler: ActionCallback | ActionHandler): this {
		// Check if it's a handler (returns Promise with success/message)
		if (callbackOrHandler.constructor.name === 'AsyncFunction' || callbackOrHandler.length === 1) {
			this._handler = callbackOrHandler as ActionHandler;
		} else {
			this._actionCallback = callbackOrHandler as ActionCallback;
		}
		return this;
	}

	getName(): string {
		return this._name;
	}

	getLabel(): string | undefined {
		return this._label;
	}

	getIcon(): string | undefined {
		return this._icon;
	}

	getColor(): string | undefined {
		return this._color;
	}

	getRequiresConfirmation(): boolean {
		return this._requiresConfirmation;
	}

	getModalHeading(): string | undefined {
		return this._modalHeading;
	}

	getModalDescription(): string | undefined {
		return this._modalDescription;
	}

	getActionCallback(): ActionCallback | undefined {
		return this._actionCallback;
	}

	getHandler(): ActionHandler | undefined {
		return this._handler;
	}

	hasHandler(): boolean {
		return this._handler !== undefined;
	}

	getForm(): SerializedForm | undefined {
		return this._form;
	}

	toJSON(): SerializedAction {
		return {
			type: 'action',
			name: this._name,
			label: this._label,
			icon: this._icon,
			color: this._color,
			requiresConfirmation: this.getRequiresConfirmation(),
			modalHeading: this._modalHeading,
			modalDescription: this._modalDescription,
			form: this._form,
			...(this._export ? { export: this._export } : {}),
		};
	}

	private static _configurator = makeConfigurable<Action>();

	/**
	 * Register a callback that mutates every action (and bulk action) in the panel.
	 * Applied during global configuration, before serialization.
	 * @example
	 * Action.configureUsing((action) => {
	 *   if (action.getColor() === 'danger') action.requiresConfirmation();
	 * });
	 */
	static configureUsing(cb: (action: Action) => void): typeof Action {
		this._configurator.register(cb);
		return this;
	}

	/** Apply all registered global configuration callbacks to an action. */
	static applyConfiguration(action: Action): void {
		Action._configurator.apply(action);
	}

	/** Remove all registered global configuration callbacks. */
	static clearConfigurations(): void {
		Action._configurator.clear();
	}
}
