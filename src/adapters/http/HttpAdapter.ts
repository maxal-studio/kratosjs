import { Panel } from '../../Panel';

/**
 * Abstract base class for HTTP server adapters
 * Implement this class to support different HTTP frameworks (Express, Fastify, etc.)
 */
export abstract class HttpAdapter {
	/**
	 * Create a new HTTP adapter instance
	 * @param panel - The Panel instance
	 * @param basePath - Base URL path for all routes
	 */
	constructor(
		protected panel: Panel,
		protected basePath: string,
	) {
		// setupDefaultMiddlewares() should be called by derived classes after app initialization
	}

	/**
	 * Get the underlying server instance
	 * @returns The server app instance (Express, Fastify, etc.)
	 */
	abstract getApp(): any;

	/**
	 * Register a route with the HTTP server
	 * @param method - HTTP method (get, post, put, patch, delete)
	 * @param path - Route path (will be prepended with basePath)
	 * @param handlers - Route handler functions
	 */
	abstract registerRoute(method: string, path: string, ...handlers: any[]): void;

	/**
	 * Mount a router at a specific path
	 * @param path - Mount path
	 * @param router - Router instance to mount
	 */
	abstract mountRouter(path: string, router: any): void;

	/**
	 * Serve static files from a directory
	 * @param path - URL path to serve files from
	 * @param directory - Directory path to serve files from
	 */
	abstract useStatic(path: string, directory: string): void;

	/**
	 * Whether a static mount has already been registered at the given URL path.
	 */
	abstract hasStaticMount(path: string): boolean;

	/**
	 * Start the HTTP server
	 * @param port - Port number to listen on
	 * @param callback - Optional callback function called when server starts
	 */
	abstract start(port: number, callback?: () => void): void;

	/**
	 * Setup default middlewares (cors, cookie parser, body parser, etc.)
	 * Called automatically in constructor
	 */
	abstract setupDefaultMiddlewares(): void;

	/**
	 * Get all registered routes from the HTTP server
	 * @returns Array of route objects with method and path
	 */
	abstract getRegisteredRoutes(): Array<{ method: string; path: string }>;
}
