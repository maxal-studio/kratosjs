import type { DriverKind } from '../panel/OrmManager';

/**
 * Primary-key property definitions for an EntitySchema, per database driver.
 *
 * Plugin entities are built as factories so the same plugin runs on MongoDB
 * and SQL drivers:
 *
 * @example
 * ```typescript
 * export function createLogEntity(driver: DriverKind) {
 *   return new EntitySchema({
 *     name: 'Log',
 *     properties: {
 *       ...idProps(driver),
 *       message: { type: 'string' },
 *     },
 *   });
 * }
 * ```
 */
export function idProps(driver: DriverKind): Record<string, any> {
	return driver === 'mongo'
		? {
				_id: { type: 'ObjectId', primary: true },
				id: { type: 'string', serializedPrimaryKey: true },
			}
		: { id: { type: 'number', primary: true, autoincrement: true } };
}
