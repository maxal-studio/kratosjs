'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.createComponentConfig = createComponentConfig;
const vite_1 = require('vite');
const plugin_react_1 = __importDefault(require('@vitejs/plugin-react'));
/**
 * Vite config for bundling individual components
 * This is used dynamically by ComponentBundler to bundle each component
 */
function createComponentConfig(entry, outputDir, componentName) {
	return (0, vite_1.defineConfig)({
		plugins: [(0, plugin_react_1.default)()],
		build: {
			lib: {
				entry,
				name: componentName,
				fileName: () => `${componentName}.js`,
				formats: ['es'],
			},
			outDir: outputDir,
			emptyOutDir: false, // Don't empty, we're building multiple components
			rollupOptions: {
				external: ['react', 'react-dom', 'react-hook-form', '@maxal_studio/kratosjs-react'],
				output: {
					format: 'es',
					entryFileNames: '[name].js',
				},
			},
		},
		resolve: {
			dedupe: ['react', 'react-dom', 'react-hook-form'],
		},
	});
}
