// Core SERVER framework strings (English). Namespace: `core`.
//
// These are framework-originated strings the BACKEND emits — controller
// fallbacks, access/permission messages, and validation messages (filled in by
// the validation engine; see `src/validation/messages.ts`). The React package
// ships its own separate `core` catalog for UI chrome (buttons, loading, etc.).
//
// Authored as a `.ts` module (not JSON) because tsc does not copy `.json` into
// `dist`. App/plugin catalogs may be JSON or TS — they're imported objects.

import { defaultValidationMessages } from '../../../validation/messages';

const en = {
	// Generic action results (CrudController fallbacks).
	'action.completed': 'Action completed successfully',
	'action.failed': 'Action failed',
	'action.name_required': 'Action name is required',
	'action.data_required': 'Action data is required',
	'action.handler_not_found': 'Action handler "{action}" not found',
	'action.no_permission': 'You do not have permission to perform this action',
	'action.no_permission_bulk': 'You do not have permission to act on these records',
	'action.no_valid_records': 'No valid records found',

	// Records / access.
	'record.not_found': 'Record not found',
	'record.access_denied_view': 'Access denied to view this record',
	'record.created': 'Record created successfully',
	'record.updated': 'Record updated successfully',
	'record.deleted': 'Record deleted successfully',
	'request.ids_required': 'ids array is required',

	// Export.
	'export.no_exporter': 'No exporter registered for format "{format}"',
	'export.no_permission': 'You do not have permission to export this resource',

	// Access.
	'access.operation_disabled': '{operation} operation is disabled for this resource',

	// Relations.
	'relation.not_found': 'Relation not found',
	'relation.related_not_found': 'Related resource not found',
	'relation.update_unsupported':
		'Update relation not supported. Update the related record directly using its resource endpoint.',

	// Media.
	'media.no_permission_manage': 'You do not have permission to manage media for this resource',
	'media.file_required': 'File data is required',
	'media.no_permission_upload': 'You do not have permission to upload this file',
	'media.adapter_not_found': 'Media adapter not found',
	'media.key_required': 'File key is required',
	'media.no_permission_delete': 'You do not have permission to delete this file',
	'media.deleted': 'File deleted successfully',

	// Pages.
	'page.not_found': 'Page "{slug}" not found',
	'page.access_denied': 'Access denied to this page',

	// Resource resolution.
	'resource.not_found': 'Resource "{slug}" not found',

	// Auth flow.
	'auth.invalid_credentials': 'Invalid credentials',
	'auth.invalid_challenge': 'Invalid challenge',
	'auth.verification_failed': 'Verification failed',
	'auth.provider_required': 'Provider name is required',
	'auth.challenge_fields_required': 'challengeToken and type are required',
	'auth.user_lookup_not_configured': 'User lookup function not configured',
	'auth.no_token': 'No token provided',
	'auth.invalid_token': 'Invalid or expired token',
	'auth.invalid_refresh_token': 'Invalid or expired refresh token',
	'auth.refresh_token_required': 'Refresh token is required',
	'auth.logged_out': 'Logged out successfully',
	'auth.missing_oauth_params': 'Missing code or state parameter',
	'auth.invalid_state': 'Invalid state parameter',
	'auth.oauth_failed': 'OAuth authentication failed',
	'auth.unauthorized_no_token': 'Unauthorized - No token provided',
	'auth.unauthorized_invalid_token': 'Unauthorized - Invalid or expired token',

	// Validation messages (shared shape with the client; rendered via `t()`).
	...defaultValidationMessages,
	'record.deleted_count': '{count} record(s) deleted successfully',
	'auth.provider_not_found': 'Provider "{provider}" not found',
	'auth.provider_no_oauth': 'Provider "{provider}" does not support OAuth',
	'auth.provider_no_oauth_callback': 'Provider "{provider}" does not support OAuth callback',
	'search.failed': 'Failed to perform global search',
};

export default en;
export type CoreCatalog = typeof en;
