import { recommendedVue2Library } from '@nextcloud/eslint-config'
import tseslint from 'typescript-eslint'

export default [
	{
		ignores: ['dist/**', 'node_modules/**', 'src/**/*.d.ts'],
	},
	...recommendedVue2Library,
	{
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		rules: {
			'no-unused-vars': ['error', {
				varsIgnorePattern: '^(t|n)$',
				argsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_',
				ignoreRestSiblings: true,
			}],
			'@typescript-eslint/no-unused-vars': ['error', {
				varsIgnorePattern: '^(t|n)$',
				argsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_',
				ignoreRestSiblings: true,
			}],
			curly: ['error', 'multi-line'],
			'no-console': ['error', {
				allow: [
					'assert', 'count', 'countReset', 'debug', 'dir', 'dirxml',
					'error', 'group', 'groupCollapsed', 'groupEnd', 'info',
					'table', 'time', 'timeEnd', 'timeLog', 'trace', 'warn',
				],
			}],
			'jsdoc/require-jsdoc': 'off',
			'jsdoc/check-tag-names': 'off',
			'vue/first-attribute-linebreak': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'n/no-missing-import': 'off',
		},
	},
]
