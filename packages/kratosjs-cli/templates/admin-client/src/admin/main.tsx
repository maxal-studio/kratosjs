import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import { pluginClients } from 'virtual:kratos-client';
import '@maxal_studio/kratosjs-react/styles.css';

// `virtual:kratos-client` auto-imports every installed plugin's client manifest
// (any dependency whose package.json declares a `kratosjs.client` entry).

mountAdminPanel({
	plugins: pluginClients,
});
