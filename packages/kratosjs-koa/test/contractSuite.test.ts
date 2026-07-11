import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runHttpAdapterContractSuite } from '@maxal_studio/kratosjs/testing';
import { KoaAdapter } from '../src/index.js';

// The Koa adapter must pass the exact same contract suite as the express, fastify,
// and hapi adapters and the framework-free InMemoryHttpAdapter reference in core.
runHttpAdapterContractSuite({
	name: 'KoaAdapter',
	createAdapter: () => new KoaAdapter(),
	test: { describe, it, expect, beforeAll, afterAll },
});
