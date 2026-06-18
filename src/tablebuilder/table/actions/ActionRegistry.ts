import { ActionHandler } from './Action';
import { BulkActionHandler } from './BulkAction';

/**
 * Global registry for action handlers
 * Stores action handlers that can be executed on the backend
 */
class ActionRegistryClass {
	private handlers: Map<string, ActionHandler | BulkActionHandler> = new Map();

	/**
	 * Register an action handler
	 */
	registerAction(name: string, handler: ActionHandler | BulkActionHandler): void {
		this.handlers.set(name, handler);
	}

	/**
	 * Get an action handler by name
	 */
	getActionHandler(name: string): ActionHandler | BulkActionHandler | undefined {
		return this.handlers.get(name);
	}

	/**
	 * Check if an action handler exists
	 */
	hasActionHandler(name: string): boolean {
		return this.handlers.has(name);
	}

	/**
	 * Remove an action handler
	 */
	unregisterAction(name: string): void {
		this.handlers.delete(name);
	}

	/**
	 * Clear all action handlers
	 */
	clear(): void {
		this.handlers.clear();
	}

	/**
	 * Get all registered action names
	 */
	getRegisteredActions(): string[] {
		return Array.from(this.handlers.keys());
	}
}

// Export singleton instance
export const ActionRegistry = new ActionRegistryClass();
