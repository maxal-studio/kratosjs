// Exported via the `@maxal_studio/kratosjs/testing` subpath (kept out of the main
// barrel). The contract suite does NOT import vitest — the calling test file
// injects { describe, it, expect, beforeAll, afterAll } via config.test.
export { InMemoryHttpAdapter } from './InMemoryHttpAdapter';
export { runHttpAdapterContractSuite, createStubPanel } from './contractSuite';
export type { HttpContractSuiteConfig, ContractSuiteTestTools } from './contractSuite';
