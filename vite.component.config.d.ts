/**
 * Vite config for bundling individual components
 * This is used dynamically by ComponentBundler to bundle each component
 */
export declare function createComponentConfig(
	entry: string,
	outputDir: string,
	componentName: string,
): import('vite', { with: { 'resolution-mode': 'import' } }).UserConfig;
