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
	ignores: [
		'dist/**',
		'node_modules/**',
		'src/**/*.d.ts',
		// Generated AJV validator bundle (gitignored build artifact from
		// `npm run build:validators`). Lint chokes on its 100KB+ minified
		// single line and reports thousands of stylistic errors — they're
		// not actionable on generated code.
		'src/utils/validateManifestV2.compiled.js',
	],
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
}, {
	// Phase K / K2 — integration-leaf template-ES2020 guard (ADR-019).
	//
	// Vue 2 transpiles every <template> expression through buble
	// (vue-template-compiler → vue-template-es2015-compiler), which does
	// NOT understand optional chaining (`?.`) or nullish coalescing
	// (`??`). Such syntax passes jest but breaks `npm run build` — the
	// rollout's biggest near-miss (a template-side `obj?.field` in
	// CnContactsCard.vue). `vue/no-restricted-syntax` runs against the
	// template AST produced by vue-eslint-parser, so these selectors fire
	// at lint time, before build.
	//
	// SCOPED to src/integrations/builtin/**/*.vue on purpose: the rest of
	// the library has plenty of legitimate `?.`/`??` in <script> blocks
	// (which buble never sees), and a fleet-wide rule would be noise. The
	// `VElement[name='template']` ancestor restriction in each selector
	// keeps the rule template-only even within these files.
	files: ['src/integrations/builtin/**/*.vue'],
	rules: {
		'vue/no-restricted-syntax': ['error',
			{
				// Optional chaining (a?.b, a?.(), a?.[b]) inside a <template>.
				selector: "VElement[name='template'] ChainExpression",
				message: 'Optional chaining (?.) is not allowed in <template> — Vue 2\'s buble transpiler rejects it and `npm run build` breaks (it passes jest). Move the expression into a computed/method, or use an explicit (a && a.b) form.',
			},
			{
				// Belt-and-braces: a bare optional MemberExpression that
				// some parser versions emit without the ChainExpression wrapper.
				selector: "VElement[name='template'] MemberExpression[optional=true]",
				message: 'Optional chaining (?.) is not allowed in <template> — Vue 2\'s buble transpiler rejects it. Use an explicit (a && a.b) form.',
			},
			{
				// Optional call: a?.()
				selector: "VElement[name='template'] CallExpression[optional=true]",
				message: 'Optional call (?.()) is not allowed in <template> — Vue 2\'s buble transpiler rejects it. Guard the call explicitly.',
			},
			{
				// Nullish coalescing (a ?? b) inside a <template>.
				selector: "VElement[name='template'] LogicalExpression[operator='??']",
				message: 'Nullish coalescing (??) is not allowed in <template> — Vue 2\'s buble transpiler rejects it and `npm run build` breaks. Use an explicit (a == null ? b : a) form or a computed.',
			},
		],
	},
}, {
	// CLI scripts are Node.js executables — process.exit(), CJS require(), and
	// minimal JSDoc are intentional and appropriate for build tools.
	files: ['src/cli/**/*.js', 'src/cli/**/*.cjs'],
	rules: {
		'n/no-process-exit': 'off',
		'n/no-missing-require': 'off',
		'import/extensions': 'off',
		'jsdoc/require-param-description': 'off',
		'jsdoc/escape-inline-tags': 'off',
		'jsdoc/reject-function-type': 'off',
	},
}])
