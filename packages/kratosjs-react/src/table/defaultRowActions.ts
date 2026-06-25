import { SerializedAction } from '@maxal_studio/kratosjs';
import { translate } from '../i18n/activeLocale';

/**
 * Built-in row actions are derived from the resource capability flags
 * (canView / canEdit / canDelete). The `view` / `edit` / `delete` names are
 * handled by name in useTableActions (delete shows its own confirmation), so
 * these descriptors only carry the label/icon/color used to render the buttons.
 */
export const BUILT_IN_ACTION_NAMES = ['view', 'edit', 'delete'];

/**
 * Build the effective row actions for a table: built-in view/edit (from
 * capabilities), then custom actions, then delete last. Any custom action that
 * reuses a built-in name is dropped to avoid duplicates.
 *
 * Built-in labels are translated here (per call, at render time) so they follow
 * the active locale instead of freezing at module load.
 */
export function buildRowActions(
	customActions: SerializedAction[] | undefined,
	caps: { canView: boolean; canEdit: boolean; canDelete: boolean },
): SerializedAction[] {
	const custom = (customActions || []).filter(action => !BUILT_IN_ACTION_NAMES.includes(action.name));
	const result: SerializedAction[] = [];
	if (caps.canView) {
		result.push({ type: 'action', name: 'view', label: translate('core:common.view'), icon: 'Eye' });
	}
	if (caps.canEdit) {
		result.push({ type: 'action', name: 'edit', label: translate('core:common.edit'), icon: 'Pencil' });
	}
	result.push(...custom);
	if (caps.canDelete) {
		result.push({
			type: 'action',
			name: 'delete',
			label: translate('core:common.delete'),
			icon: 'Trash2',
			color: 'text-red-600',
		});
	}
	return result;
}
