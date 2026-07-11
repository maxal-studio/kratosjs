import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InMemoryHttpAdapter, runHttpAdapterContractSuite } from '../src/http/testing';

// The reference adapter (bare node:http) must pass the full contract suite —
// this is what proves the KratosHttpAdapter contract is complete without
// depending on any HTTP framework.
runHttpAdapterContractSuite({
	name: 'InMemoryHttpAdapter',
	createAdapter: () => new InMemoryHttpAdapter(),
	test: { describe, it, expect, beforeAll, afterAll },
});
