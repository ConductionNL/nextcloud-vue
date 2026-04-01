const {
	defineConfig,
} = require('@eslint/config-helpers')

const js = require('@eslint/js')

const {
	FlatCompat,
} = require('@eslint/eslintrc')

const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
})

module.exports = defineConfig([{
	ignores: ['dist/**', 'node_modules/**', 'src/**/*.d.ts'],
}, {
	extends: compat.extends('@nextcloud'),

	settings: {
		'import/resolver': {
			alias: {
				map: [
					['@', './src'],
					['@floating-ui/dom-actual', './node_modules/@floating-ui/dom'],
				],
				extensions: ['.js', '.ts', '.vue', '.json', '.css'],
			},
		},
	},

	rules: {
		// Allow unused i18n functions (t, n) — imported for future translation wiring
		'no-unused-vars': ['error', { varsIgnorePattern: '^(t|n)$', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
		'jsdoc/require-jsdoc': 'off',
		// Vue components use custom @slot and @eventname="handler" documentation patterns
		// that are not standard JSDoc tags — disable the tag name check entirely.
		'jsdoc/check-tag-names': 'off',
		'vue/first-attribute-linebreak': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'n/no-missing-import': 'off',
		'import/namespace': 'off', // disable namespace checking to avoid parser requirement
		'import/default': 'off', // disable default import checking to avoid parser requirement
		'import/no-named-as-default': 'off', // disable named-as-default checking to avoid parser requirement
		'import/no-named-as-default-member': 'off', // disable named-as-default-member checking to avoid parser requirement
		// @nextcloud/eslint-plugin walks up the directory tree looking for appinfo/info.xml.
		// On Windows this loop is infinite when no appinfo/ exists (bug: checks path.sep='\'
		// but Windows root is 'C:\', so the termination condition never triggers).
		// nextcloud-vue is a library, not a Nextcloud app, so these rules don't apply anyway.
		'@nextcloud/no-deprecations': 'off',
		'@nextcloud/no-removed-apis': 'off',
	},
}])
