import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';
// Plugin client manifests (fields, columns, widgets, blocks, slots, SSR pages) are
// auto-discovered from installed plugins via the `kratosjs.client` package.json field.
import { pluginClients } from 'virtual:kratos-client';

mountAdminPanel({ plugins: pluginClients });
