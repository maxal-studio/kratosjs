import { Request } from 'express';
import { RegisteredResource } from '../types';

/**
 * Get the panel resource from the request, throwing if not found.
 * Safe to use in handlers that run after the resolveResource middleware.
 */
export function getPanelResource(req: Request): RegisteredResource {
	const resource = req.panelResource;
	if (!resource) {
		throw new Error('Resource not found - ensure resolveResource middleware is applied');
	}
	return resource;
}
