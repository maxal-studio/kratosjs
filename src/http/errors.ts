import { ValidationError } from '../resource/types';

/**
 * The minimal response surface handleError needs. Both {@link import('./types').KratosReply}
 * and an Express Response satisfy it structurally, so the v1 express path keeps working
 * while the neutral pipeline uses the same implementation.
 */
export interface ErrorReplyTarget {
	status(code: number): { json(payload: unknown): unknown };
}

/**
 * Format an error into the appropriate HTTP response.
 * ValidationError → 400 with structured fields (client renders in active locale);
 * '... not found' messages → 404; anything else → 500.
 * Also used as the outer catch of every composed route handler.
 */
export function handleError(reply: ErrorReplyTarget, error: any): void {
	if (error instanceof ValidationError) {
		reply.status(400).json({
			message: error.message,
			field: error.field,
			rule: error.rule,
			// Structured fields let the client render the message in the active locale.
			...(error.messageKey ? { messageKey: error.messageKey } : {}),
			...(error.params ? { params: error.params } : {}),
		});
	} else if (error?.message?.includes('not found')) {
		reply.status(404).json({
			message: error.message,
		});
	} else {
		reply.status(500).json({
			message: error?.message || 'Internal server error',
		});
	}
}
