import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runHttpAdapterContractSuite } from '@maxal_studio/kratosjs/testing';
import { ExpressAdapter } from '../src/index.js';

// The Express adapter must pass the exact same contract suite as the
// framework-free InMemoryHttpAdapter reference in core.
runHttpAdapterContractSuite({
	name: 'ExpressAdapter',
	createAdapter: () => new ExpressAdapter(),
	test: { describe, it, expect, beforeAll, afterAll },
});
