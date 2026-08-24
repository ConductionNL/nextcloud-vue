const {
	defineConfig,
} = require('@eslint/config-helpers')

const js = require('@eslint/js')

const {
	FlatCompat,
} = require('@eslint/eslintrc')

// The library eats its own dog food: the Vue-3 deprecation gate, the modern
// language level and the SFC parser wiring all come from the preset this
// package now PUBLISHES at `@conduction/nextcloud-vue/eslint`. If the preset
// ever stops arming `vue/no-deprecated-*`, or the object-form parser regresses
// into 385 false `vue/valid-v-for` positives, this repo's own `npm run lint`
// is the first thing that breaks — which is the only kind of guarantee worth
// shipping to fourteen apps.
const {
	conductionVue3Fixes,
} = require('./eslint/index.js')

const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
})

module.exports = defineConfig([{
	ignores: [
		'dist/**',
		'node_modules/**',
		// Ambient type declarations. They are checked by `npm run test:types`
		// (tsd) and by `tsc`, not by ESLint: to a JS-configured `no-unused-vars`
		// every parameter name in a `.d.ts` signature is an unused binding, so
		// linting them produces one error per declared argument and zero
		// findings. The `src/**` entry predates this; `eslint/**` and
		// `testing/**` join it now that those directories are linted too.
		'src/**/*.d.ts',
		'eslint/**/*.d.ts',
		'testing/**/*.d.ts',
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
	extends: compat.extends('@nextcloud/eslint-config/vue3'),

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

		jsdoc: {
			// `@event` documents a *Vue event name*, not a JS namepath. Vue names
			// its `v-model` / `.sync` events `update:content`, `update:selected-id`,
			// … and a colon is not legal in a JSDoc namepath, so the default
			// namepath parsing reports every one of them as a syntax error.
			//
			// Quoting the name (`@event 'update:content'`) satisfies the parser but
			// BREAKS the docs pipeline: at `$emit()` call sites vue-docgen-api reads
			// the event's name straight off this tag, so the quotes end up in the
			// generated name and `npm run check:jsdoc` then scores the real event as
			// undocumented. Declaring the tag's name as free text is the accurate
			// description of how the tag is used here, and it keeps `valid-types`
			// fully active on every type expression and every other namepath tag.
			structuredTags: {
				event: { name: 'text', type: true },
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

		// This library's PUBLIC event API is kebab-case (`row-click`,
		// `view-mode-change`, `update:selected-id`, …). Every consuming app —
		// openbuild, launchpad, procest, … — binds those names, and each one is
		// documented with an `@event` tag that the docs pipeline publishes.
		//
		// `@nextcloud/eslint-config/vue3` leaves this rule at its bare default,
		// which is `camelCase`; renaming 189 emissions to satisfy it would be a
		// breaking change to that published surface for zero behavioural gain.
		// So the convention is declared explicitly — the same shape the Vue-2
		// `@nextcloud` preset shipped — which keeps the rule actively enforcing
		// kebab-case rather than being switched off.
		'vue/custom-event-name-casing': ['error', 'kebab-case', {
			// `update:xxx` / `update:xxx-yyy` v-model event names.
			ignores: ['/^[a-z]+(?:-[a-z]+)*:[a-z]+(?:-[a-z]+)*$/u'],
		}],

		// NOTE: `vue/v-on-event-hyphenation` (with `update:modelValue` excluded)
		// and the whole `vue/no-deprecated-*` family now arrive from
		// `conductionVue3Fixes`, spread immediately below. They were moved out of
		// this block so the published preset — not this file — is the single
		// definition every app shares.
	},
},
// The shared preset: modern language level, the object-form SFC parser, the
// armed Vue-3 deprecation family, and the `update:modelValue` carve-out.
// Spread AFTER the `@nextcloud/eslint-config/vue3` compat block so it wins.
...conductionVue3Fixes,
{
	// Wherever `@vue/eslint-config-typescript` applies — `.ts` files, and now
	// `.vue` script blocks too — it switches the core `no-unused-vars` off and
	// enables the `@typescript-eslint` one in its place, at bare defaults. That
	// silently drops this project's exception set, so restate it on the rule
	// that actually runs: `t`/`n` i18n imports, `_`-prefixed placeholder
	// arguments, and rest-sibling omissions
	// (`const { handler: _ignored, ...rest } = entry`).
	//
	// It has to live in a file-scoped block rather than the shared `rules`
	// above: the `@typescript-eslint` plugin is only registered for these
	// extensions, and a non-`off` rule referencing an unregistered plugin is a
	// hard config error.
	files: ['**/*.vue', '**/*.ts', '**/*.cts', '**/*.mts', '**/*.tsx'],
	rules: {
		'@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^(t|n)$', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
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
	// consuming apps depend on it — Buildiq's builder.js PUTs the very same
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
