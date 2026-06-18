import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier';

export default defineConfig([
	{
		files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
		plugins: { prettier: eslintPluginPrettier },
		extends: [js.configs.recommended, eslintConfigPrettier],
		rules: {
			'prettier/prettier': 'error',
		},
	},
	{
		files: ['**/*.js'],
		languageOptions: { sourceType: 'commonjs' },
	},
	{
		files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
		languageOptions: { globals: globals.browser },
		plugins: {
			prettier: eslintPluginPrettier,
		},
		rules: {
			'prettier/prettier': 'error',
		},
		extends: [js.configs.recommended, eslintConfigPrettier],
	},
	tseslint.configs.recommended,
	{
		files: ['**/*.{ts,mts,cts}'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-function-type': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-empty-object-type': 'off',
			'@typescript-eslint/no-unsafe-declaration-merging': 'off',
		},
	},
]);
