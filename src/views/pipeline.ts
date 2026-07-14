import type { KratosHandler, KratosMiddleware, KratosReply, KratosRequest } from '../http/types';
import type { Panel } from '../Panel';
import { composeHandler, localeContextStep, contextRunnerStep } from '../http/pipeline';
import { handleError } from '../http/errors';
import { authMiddleware, optionalAuthMiddleware } from '../auth/middleware';
import { ValidationError } from '../resource/types';
import type { BufferedRoute, KratosViewReply, ViewReplyOptions } from './types';
import { FLASH_COOKIE, VIEW_HEADER } from './protocol';
import { encodeFlash } from './flash';

/** True when the request came from the client router (expects a JSON page, not HTML). */
function isViewRequest(req: KratosRequest): boolean {
	return req.header(VIEW_HEADER) === 'true';
}

/** Build the `{ field: message }` error bag from a ValidationError. */
function errorBag(error: ValidationError): Record<string, string> {
	const key = error.field ?? '_error';
	return { [key]: error.message };
}

/**
 * Wrap the neutral reply into a {@link KratosViewReply} by delegation, adding
 * `view()` and `back()`. The base reply's methods keep working (they close over
 * the original reply), so `reply.status().json()` and chaining are unaffected.
 */
function createViewReply(panel: Panel, req: KratosRequest, reply: KratosReply): KratosViewReply {
	const viewReply = Object.create(reply) as KratosViewReply;

	viewReply.view = (component: string, props: Record<string, unknown> = {}, options?: ViewReplyOptions) =>
		panel.getViewService().handleView(req, reply, component, props, options);

	viewReply.back = data => {
		const referer = req.header('referer') || '/';
		if (data?.errors) {
			reply.cookie(FLASH_COOKIE, encodeFlash({ errors: data.errors }), {
				httpOnly: true,
				path: '/',
				sameSite: 'lax',
				maxAge: 15_000,
			});
		}
		reply.redirect(referer, 303);
	};

	return viewReply;
}

/**
 * Error handling for the terminal route handler. A ValidationError thrown while
 * serving a client-router request becomes a 422 error bag so `useForm` can render
 * it; everything else falls through to the shared {@link handleError} (e.g. 400 for
 * JSON API routes). A no-JS form flow uses `reply.back({ errors })` explicitly.
 */
async function handleRouteError(req: KratosRequest, reply: KratosReply, error: unknown): Promise<void> {
	if (reply.sent) {
		console.error('[kratosjs] Unhandled route error after response was sent:', error);
		return;
	}
	if (error instanceof ValidationError && isViewRequest(req)) {
		reply.status(422).json({ errors: errorBag(error), message: error.message });
		return;
	}
	handleError(reply, error);
}

/**
 * Compose a `panel.route(...)` route into a neutral handler.
 *
 * Bare routes (public views / custom routes) get: ORM context → locale → request
 * context → user middleware → handler, with a view-capable reply and view-aware
 * error handling. Admin-marked routes ({@link adminRoute}) additionally insert the
 * auth step before the request context (base-path prefixing is done by the caller).
 */
export function composeRoute(panel: Panel, route: BufferedRoute): KratosHandler {
	const steps: KratosMiddleware[] = [];

	steps.push(panel.ormContextStep());
	steps.push(localeContextStep(panel));

	if (route.admin) {
		const authManager = panel.getAuthManager();
		if (route.admin.auth === 'optional') {
			steps.push(optionalAuthMiddleware(authManager));
		} else if (authManager) {
			// Required auth, but only when auth is configured (v1 registerRoute parity).
			steps.push(authMiddleware(authManager));
		}
	}

	steps.push(contextRunnerStep(panel));

	// All but the last handler act as middleware; they receive the neutral reply.
	const userMiddlewares = route.handlers.slice(0, -1) as unknown as KratosMiddleware[];
	const userHandler = route.handlers[route.handlers.length - 1];
	steps.push(...userMiddlewares);

	const finalHandler: KratosHandler = async (req, reply) => {
		const viewReply = createViewReply(panel, req, reply);
		try {
			await userHandler(req, viewReply, async () => {});
		} catch (error) {
			await handleRouteError(req, reply, error);
		}
	};

	return composeHandler(steps, finalHandler);
}
