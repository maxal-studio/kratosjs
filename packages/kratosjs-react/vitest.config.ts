import { defineConfig } from 'vitest/config';

// Test config kept separate from vite.config.ts: that file builds only styles.css
// (rollup input is a CSS file) and must not be picked up by vitest.
export default defineConfig({
	test: {
		environment: 'jsdom',
		setupFiles: ['./src/test/setup.ts'],
		include: ['src/**/*.test.{ts,tsx}'],
	},
});
