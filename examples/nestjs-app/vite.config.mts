import { defineConfig } from 'vite';
import { kratosAdminVite } from '@maxal_studio/kratosjs/vite';

// The admin UI path (base) is driven entirely from the backend `panel.panelPath()`
// — no `base` needed here. See the KratosJs "HTTP Adapters" docs.
export default defineConfig(kratosAdminVite());
