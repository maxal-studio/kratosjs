import { SerializedAction } from '@maxal_studio/kratosjs';

/**
 * Built-in row actions are derived from the resource capability flags
 * (canView / canEdit / canDelete). The `view` / `edit` / `delete` names are
 * handled by name in useTableActions (delete shows its own confirmation), so
 * these descriptors only carry the label/icon/color used to render the buttons.
 */
export const VIEW_ACTION: SerializedAction = { type: 'action', name: 'view', label: 'View', icon: 'Eye' };
export const EDIT_ACTION: SerializedAction = { type: 'action', name: 'edit', label: 'Edit', icon: 'Pencil' };
export const DELETE_ACTION: SerializedAction = {
	type: 'action',
	name: 'delete',
	label: 'Delete',
	icon: 'Trash2',
	color: 'text-red-600',
};

export const BUILT_IN_ACTION_NAMES = ['view', 'edit', 'delete'];

/**
 * Build the effective row actions for a table: built-in view/edit (from
 * capabilities), then custom actions, then delete last. Any custom action that
 * reuses a built-in name is dropped to avoid duplicates.
 */
export function buildRowActions(
	customActions: SerializedAction[] | undefined,
	caps: { canView: boolean; canEdit: boolean; canDelete: boolean },
): SerializedAction[] {
	const custom = (customActions || []).filter(action => !BUILT_IN_ACTION_NAMES.includes(action.name));
	const result: SerializedAction[] = [];
	if (caps.canView) result.push(VIEW_ACTION);
	if (caps.canEdit) result.push(EDIT_ACTION);
	result.push(...custom);
	if (caps.canDelete) result.push(DELETE_ACTION);
	return result;
}
