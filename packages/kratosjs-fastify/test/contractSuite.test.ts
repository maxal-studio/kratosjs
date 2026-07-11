import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runHttpAdapterContractSuite } from '@maxal_studio/kratosjs/testing';
import { FastifyAdapter } from '../src/index.js';

// The Fastify adapter must pass the exact same contract suite as the express
// adapter and the framework-free InMemoryHttpAdapter reference in core.
runHttpAdapterContractSuite({
	name: 'FastifyAdapter',
	createAdapter: () => new FastifyAdapter(),
	test: { describe, it, expect, beforeAll, afterAll },
});
