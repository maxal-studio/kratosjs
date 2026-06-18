import { ApiError, apiPost } from './http';
import { deriveApiBaseUrl } from './urls';

export interface ActionResult {
	success: boolean;
	message?: string;
	data?: any;
	redirect?: string; // Redirect path if present
	[key: string]: any; // Allow additional fields (like redirect)
}

async function runAction(
	apiUrl: string,
	actionName: string,
	recordIds: string[],
	formData: any,
	isBulk: boolean,
): Promise<ActionResult> {
	try {
		const result = await apiPost<any>(
			`${apiUrl}/actions`,
			{
				action: actionName,
				data: { recordIds, formData: formData || {} },
				...(isBulk ? { isBulk: true } : {}),
			},
			deriveApiBaseUrl(apiUrl),
		);
		return {
			...result,
			success: result.success !== false,
			message: result.message,
			data: result.data,
			redirect: result.redirect,
		};
	} catch (error: any) {
		const fallback = isBulk ? 'Failed to execute bulk action' : 'Failed to execute action';
		return {
			success: false,
			message: error instanceof ApiError ? error.message : error?.message || fallback,
		};
	}
}

/**
 * Execute a single row action
 * @param apiUrl - The base API URL for the resource (e.g., http://localhost:3001/api/users)
 * @param actionName - The name of the action to execute
 * @param recordId - The record ID (backend will populate the full record)
 * @param formData - Optional form data from the action form
 */
export function executeAction(
	apiUrl: string,
	actionName: string,
	recordId: string,
	formData?: any,
): Promise<ActionResult> {
	return runAction(apiUrl, actionName, [recordId], formData, false);
}

/**
 * Execute a bulk action on multiple rows
 * @param apiUrl - The base API URL for the resource (e.g., http://localhost:3001/api/users)
 * @param actionName - The name of the action to execute
 * @param recordIds - Array of record IDs (backend will populate the full records)
 * @param formData - Optional form data from the action form
 */
export function executeBulkAction(
	apiUrl: string,
	actionName: string,
	recordIds: string[],
	formData?: any,
): Promise<ActionResult> {
	return runAction(apiUrl, actionName, recordIds, formData, true);
}
