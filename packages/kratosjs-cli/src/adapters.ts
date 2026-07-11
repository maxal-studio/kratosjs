import { kratosExpressDep, kratosFastifyDep, kratosHapiDep, kratosKoaDep } from './versions';

export type AdapterKey = 'express' | 'fastify' | 'hapi' | 'koa';

export interface AdapterDescriptor {
	key: AdapterKey;
	label: string;
	/** npm package name providing the adapter */
	packageName: string;
	/** Resolve the dependency range/link (honors --local) */
	dep: (local: boolean) => string;
	/** Import line for the adapter class */
	adapterImport: string;
	/** Expression passed to .httpAdapter(...) */
	adapterNew: string;
}

export const ADAPTERS: Record<AdapterKey, AdapterDescriptor> = {
	express: {
		key: 'express',
		label: 'Express (default)',
		packageName: '@maxal_studio/kratosjs-express',
		dep: kratosExpressDep,
		adapterImport: "import { ExpressAdapter } from '@maxal_studio/kratosjs-express';",
		adapterNew: 'new ExpressAdapter()',
	},
	fastify: {
		key: 'fastify',
		label: 'Fastify',
		packageName: '@maxal_studio/kratosjs-fastify',
		dep: kratosFastifyDep,
		adapterImport: "import { FastifyAdapter } from '@maxal_studio/kratosjs-fastify';",
		adapterNew: 'new FastifyAdapter()',
	},
	hapi: {
		key: 'hapi',
		label: 'Hapi',
		packageName: '@maxal_studio/kratosjs-hapi',
		dep: kratosHapiDep,
		adapterImport: "import { HapiAdapter } from '@maxal_studio/kratosjs-hapi';",
		adapterNew: 'new HapiAdapter()',
	},
	koa: {
		key: 'koa',
		label: 'Koa',
		packageName: '@maxal_studio/kratosjs-koa',
		dep: kratosKoaDep,
		adapterImport: "import { KoaAdapter } from '@maxal_studio/kratosjs-koa';",
		adapterNew: 'new KoaAdapter()',
	},
};

export const ADAPTER_KEYS = Object.keys(ADAPTERS) as AdapterKey[];
