import { Request, Response } from 'express';
import { AuthUser } from '../auth/types';
import { RegisteredResource } from './types';
import { SerializedForm } from '../formbuilder/types';
import { Panel } from '../Panel';

/**
 * KratosJs-specific extensions to Express Request
 * These properties are attached by various middleware and helpers
 */
declare module 'express-serve-static-core' {
	interface Request {
		/**
		 * Authenticated user (attached by authMiddleware)
		 */
		authUser?: AuthUser;

		/**
		 * The registered resource for the current route (attached by Panel.resolveResource)
		 */
		panelResource?: RegisteredResource;

		/**
		 * Panel instance (can be attached by plugins for custom routes)
		 */
		panel?: Panel;

		/**
		 * Transform media fields in data to storage format (attached by Panel.attachMediaHelpers)
		 * @param data - The data object containing media fields
		 * @param formSchema - The form schema to identify file upload fields
		 */
		transformMediaFieldsForStorage?: (data: Record<string, any>, formSchema: SerializedForm) => Promise<void>;

		/**
		 * Format a media key with bucket information (attached by Panel.attachMediaHelpers)
		 * @param key - The media key
		 * @param bucketName - Optional bucket name
		 * @returns Object with formatted key and bucket
		 */
		formatMediaKey?: (key: string, bucketName?: string) => Promise<{ key: string; bucket: string }>;

		/**
		 * Resolve media value to a URL (attached by Panel.attachMediaHelpers)
		 * @param mediaValue - The media value (can be object or string)
		 * @returns Resolved URL or undefined
		 */
		resolveMediaUrl?: (mediaValue: any) => Promise<string | undefined>;
	}

	interface Response {
		/**
		 * Redirect helper that returns a JSON response with redirect field
		 * (attached by Panel.attachMediaHelpers via attachRedirectHelper)
		 * @param path - The path to redirect to
		 * @param data - Optional additional data to include in response
		 */
		redirectTo(path: string, data?: Record<string, any>): void;
	}
}

/**
 * Type-safe KratosJs Request with all properties guaranteed to be present
 * Use this type when you need to access KratosJs-specific request properties
 * that are guaranteed to be attached by middleware
 *
 * Note: authUser may still be optional as some routes use optionalAuthMiddleware
 */
export type KratosJsRequest = Request & {
	/**
	 * Authenticated user (present after authMiddleware or optionalAuthMiddleware)
	 */
	authUser?: AuthUser;

	/**
	 * The registered resource for the current route
	 */
	panelResource?: RegisteredResource;

	/**
	 * Panel instance (can be attached by plugins for custom routes)
	 */
	panel?: Panel;

	/**
	 * Transform media fields in data to storage format (always present after attachMediaHelpers)
	 */
	transformMediaFieldsForStorage: (data: Record<string, any>, formSchema: SerializedForm) => Promise<void>;

	/**
	 * Format a media key with bucket information (always present after attachMediaHelpers)
	 */
	formatMediaKey: (key: string, bucketName?: string) => Promise<{ key: string; bucket: string }>;

	/**
	 * Resolve media value to a URL (always present after attachMediaHelpers)
	 */
	resolveMediaUrl: (mediaValue: any) => Promise<string | undefined>;
};

/**
 * Type-safe KratosJs Response with all methods guaranteed to be present
 * Use this type when you need to access KratosJs-specific response methods
 */
export type KratosJsResponse = Response & {
	/**
	 * Redirect helper that returns a JSON response with redirect field
	 * (always present after attachMediaHelpers)
	 */
	redirectTo(path: string, data?: Record<string, any>): void;
};

/**
 * KratosJs Request Handler type
 * Use this type for route handlers registered via panel.registerRoute()
 * All KratosJs properties (media helpers, redirectTo, etc.) are guaranteed to be available
 *
 * @example
 * ```typescript
 * panel.registerRoute('get', '/my-route', async (req: KratosJsRequest, res: KratosJsResponse) => {
 *   // req.transformMediaFieldsForStorage is available
 *   // res.redirectTo is available
 *   res.json({ message: 'Hello' });
 * });
 * ```
 */
export type KratosJsRequestHandler = (
	req: KratosJsRequest,
	res: KratosJsResponse,
	next?: () => void,
) => void | Promise<void>;
