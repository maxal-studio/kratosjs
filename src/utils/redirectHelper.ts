import { Response } from 'express';

/**
 * Attach redirect helper to Express Response object
 * Usage: res.redirectTo('/page/permissions?role=editor', { message: 'Success' })
 *
 * @param res - Express Response object
 */
export function attachRedirectHelper(res: Response): void {
	res.redirectTo = (path: string, data?: Record<string, any>) => {
		res.json({
			redirect: path,
			...data,
		});
	};
}
