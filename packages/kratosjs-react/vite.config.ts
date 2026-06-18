import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Vite config for building only the CSS with Tailwind
export default defineConfig({
	plugins: [tailwindcss()],
	build: {
		outDir: 'dist',
		emptyOutDir: false, // Don't clear dist folder (tsc already created .js/.d.ts files)
		rollupOptions: {
			input: './src/styles.css',
			output: {
				assetFileNames: 'styles.css',
			},
		},
	},
});
