import { recommendedVue2Library } from '@nextcloud/eslint-config'

export default [
	{
		ignores: ['dist/**', 'node_modules/**', 'src/**/*.d.ts'],
	},
	...recommendedVue2Library,
	{
		rules: {
			'no-unused-vars': ['error', {
				varsIgnorePattern: '^(t|n)$',
				argsIgnorePattern: '^_',
				ignoreRestSiblings: true,
			}],
			curly: ['error', 'multi-line'],
			'jsdoc/require-jsdoc': 'off',
			'jsdoc/check-tag-names': 'off',
			'vue/first-attribute-linebreak': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'n/no-missing-import': 'off',
		},
	},
]
