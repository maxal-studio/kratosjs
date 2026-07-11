import type { KratosRequest, KratosReply, KratosHandler } from '../http/types';

/**
 * v1 compatibility aliases.
 *
 * In v2 the request/response types are framework-neutral: handlers receive
 * {@link KratosRequest} and {@link KratosReply} on every HTTP adapter, and the
 * media helpers (`transformMediaFieldsForStorage`, `formatMediaKey`,
 * `resolveMediaUrl`) plus `reply.redirectTo` are always present — no middleware
 * attachment step. The framework-native request/response are available as
 * `req.raw` / `reply.raw`.
 */

/** @deprecated Use {@link KratosRequest} from '@maxal_studio/kratosjs'. */
export type KratosJsRequest = KratosRequest;

/** @deprecated Use {@link KratosReply} from '@maxal_studio/kratosjs'. */
export type KratosJsResponse = KratosReply;

/** @deprecated Use {@link KratosHandler} from '@maxal_studio/kratosjs'. */
export type KratosJsRequestHandler = KratosHandler;
