import { createServerRenderer } from '@maxal_studio/kratosjs-react/server';
import { pluginClients } from 'virtual:kratos-client';

const pages = import.meta.glob('./pages/**/*.tsx');

export const render = createServerRenderer({ pages, plugins: pluginClients });
