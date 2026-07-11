import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runHttpAdapterContractSuite } from '@maxal_studio/kratosjs/testing';
import { HapiAdapter } from '../src/index.js';

// The Hapi adapter must pass the exact same contract suite as the express and
// fastify adapters and the framework-free InMemoryHttpAdapter reference in core.
runHttpAdapterContractSuite({
	name: 'HapiAdapter',
	createAdapter: () => new HapiAdapter(),
	test: { describe, it, expect, beforeAll, afterAll },
});
