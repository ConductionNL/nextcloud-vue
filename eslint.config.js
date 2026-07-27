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
		// Generated NL-government icon catalogues (data:image/svg+xml URIs).
		// Multi-MB data-only modules produced by scripts/generate-nl-icons.mjs;
		// linting the inlined SVG URIs is not actionable. See icons/ATTRIBUTION.md.
		'src/icons/rvo.js',
		'src/icons/openGemeenten.js',
		'src/icons/denHaag.js',
		'src/icons/index.js',
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

		// --- Vue-2 rules that are INVERTED under Vue 3 ---
		// The `@nextcloud` preset is the Vue-2 config; these three rules
		// forbid syntax that Vue 3 requires or explicitly supports. Switching
		// wholesale to `@nextcloud/eslint-config/vue3` was tried and pulls in
		// an unrelated stricter rule set (775 errors), so the three are
		// disabled individually instead.
		//
		// Vue 3 supports multi-root components (fragments).
		'vue/no-multiple-template-root': 'off',
		// Vue 3 REQUIRES the key on <template v-for>, not on its children —
		// the exact opposite of the Vue-2 rule.
		'vue/no-v-for-template-key': 'off',
		// Vue 3 supports named v-model arguments (`v-model:open="x"`), which
		// replaced Vue 2's `.sync` modifier.
		'vue/no-v-model-argument': 'off',
	},
}, {
	// The barrel does `export * from '@nextcloud/vue'` and then re-exports a
	// corrected `NcSelectTags` by name. Per the ES module spec an explicit
	// named export SHADOWS the same name arriving via `export *` — that
	// precedence is the whole mechanism the override relies on, and it is
	// documented at the export site. `import/export` does not model star-export
	// precedence and reports it as a duplicate.
	files: ['src/index.js'],
	rules: {
		'import/export': 'off',
	},
}, {
	// `@nextcloud/vue` is a PEER dependency loaded through a guarded
	// `try { require(...) } catch` so the composable degrades to a plain
	// textarea when the host has not installed it. The resolver cannot follow
	// the package's ESM-only `exports` map from a CJS require, so it reports
	// the peer as missing.
	files: ['src/composables/cnFormFieldRenderer.js'],
	rules: {
		'n/no-missing-require': 'off',
	},
}, {
	// The manifest editor's contract IS in-place mutation of the passed
	// object. `CnPageConfigModal`'s `page` prop documents it literally ("the
	// working manifest's page, mutated in place"), `useManifestEditor` makes
	// the live manifest deeply reactive so those in-place edits render, and
	// consuming apps depend on it — OpenBuild's builder.js PUTs the very same
	// manifest object back after the editor has mutated it.
	//
	// `vue/no-mutating-props` is therefore reporting the architecture, not a
	// defect. Refactoring these 27 sites to emit-and-copy would change a
	// documented public contract and is out of scope for the Vue-3 migration;
	// the rule is scoped off for exactly the editor surfaces that rely on it
	// rather than disabled library-wide.
	files: [
		'src/components/CnMenuTreeNode/CnMenuTreeRow.vue',
		'src/components/CnPageTreeNode/CnPageTreeRow.vue',
		'src/components/CnSchemaFormDialog/CnSchemaSecurityTab.vue',
		'src/dialogs/CnEditSettingsModal.vue',
		'src/dialogs/CnEditSetupModal.vue',
		'src/dialogs/CnEditSupportModal.vue',
		'src/dialogs/CnEditWalkthroughModal.vue',
		'src/dialogs/CnPageConfigModal.vue',
		'src/dialogs/CnWidgetStyleEditorModal.vue',
	],
	rules: {
		'vue/no-mutating-props': 'off',
	},
}, {
	// The Phase K / K2 integration-leaf template-ES2020 guard (ADR-019) was
	// REMOVED with the Vue-3 migration. It forbade `?.` and `??` inside
	// <template> because Vue 2 transpiled template expressions through buble
	// (vue-template-compiler → vue-template-es2015-compiler), which rejected
	// both. Vue 3's compiler handles them natively — verified against
	// @vue/compiler-sfc — so the restriction no longer serves any purpose.
	//
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
