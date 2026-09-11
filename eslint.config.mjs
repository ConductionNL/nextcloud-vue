/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * ESLint 10 and `@nextcloud/eslint-config` 9: the stack every fleet app already
 * runs.
 *
 * WHY THIS FILE REPLACED `eslint.config.js`
 * -----------------------------------------
 * This repository ran ESLint 8, which is end of life, with the eslintrc-era
 * `@nextcloud/eslint-config` 8 pulled in through `FlatCompat` and patched by
 * `@conduction/nextcloud-vue/eslint`. The fleet had moved on: all 21 apps run
 * ESLint 10 with `@nextcloud/eslint-config` 9, and not one imports that preset.
 * launchpad's config records why, measured with `--print-config`: v9's own
 * `recommended` already enables all 21 `vue/no-deprecated-*` rules and leaves
 * off the two the preset had to disable, so its job is done upstream.
 *
 * A previous attempt at this migration left a DEAD `eslint.config.mjs` here.
 * ESLint 8 only ever looked for `eslint.config.js`, so it never ran, and it
 * extended `recommendedVue2Library`: the Vue 2 variant, in a Vue 3 library.
 * That is exactly the mistake the preset was written to catch in apps.
 *
 * It has to be `.mjs`. `@nextcloud/eslint-config` 9 is `"type": "module"`, and
 * this package is not, so a `.js` config would be CommonJS and could not
 * import it.
 *
 * WHAT IS NOT HERE ANY MORE, AND WHY
 * ----------------------------------
 * Rules for `import/*`, `n/*` and `promise/*` are gone because those plugins
 * are gone: v9 does not ship them, and in flat config a rule naming a plugin
 * that is not registered is a hard error that stops ESLint running at all, not
 * a finding. `@nextcloud/no-deprecations` / `no-removed-apis` went the same way.
 * Each is noted at the block that used to carry it.
 */
import { recommendedLibrary } from '@nextcloud/eslint-config'
import globals from 'globals'

/**
 * Test files, EXACTLY as v9's documentation blocks define them. The jsdoc
 * plugin is registered only outside this list, so a jsdoc block scoped any
 * wider than v9's own reaches a file where the plugin does not exist and ESLint
 * refuses to run. Copied verbatim for that reason, `*.cy.*` included.
 */
const TEST_GLOBS = [
	'**/*.test.*',
	'**/*.spec.*',
	'**/*.cy.*',
	'**/test/**',
	'**/tests/**',
	'**/__tests__/**',
	'**/__mocks__/**',
]

export default [
	{
		ignores: [
			'dist/**',
			'node_modules/**',
			// Ambient type declarations are checked by `npm run test:types`
			// (tsd) and by `tsc`, not by ESLint: every parameter name in a
			// `.d.ts` signature reads as an unused binding.
			'src/**/*.d.ts',
			'eslint/**/*.d.ts',
			'testing/**/*.d.ts',
			// Generated AJV validator bundle (gitignored build artifact from
			// `npm run build:validators`): a 100KB+ minified single line.
			'src/utils/validateManifestV2.compiled.js',
			// Generated NL-government icon catalogues: multi-MB data URIs
			// produced by scripts/generate-nl-icons.mjs. See icons/ATTRIBUTION.md.
			'src/icons/rvo.js',
			'src/icons/openGemeenten.js',
			'src/icons/denHaag.js',
			'src/icons/index.js',
			// 🔴 DELIBERATELY INVALID CODE. The fixtures
			// `tests/eslint/preset.spec.js` LINTS to prove the deprecated preset
			// still flags Vue-2 idioms. `--fix` over `tests/` once repaired all
			// three, and five assertions went green-to-red because the preset
			// then had nothing to report.
			'tests/fixtures/eslint-preset/**',
		],
	},

	// GLOBALS FOR CODE THAT DOES NOT RUN IN A BROWSER.
	//
	// v9 assumes browser code. Without these, ESLint 10 reported 27,989
	// `no-undef` errors, and 27,811 of them were jest's own globals: `expect`
	// alone accounted for 15,284. None was a defect; every one was this block
	// missing. The rest were Node's `require`, `module` and `process` in the
	// CommonJS tooling this package runs on (it has no `"type": "module"`).
	{
		files: [...TEST_GLOBS, 'tests/**', 'src/**/__tests__/**'],
		languageOptions: {
			globals: { ...globals.jest, ...globals.node },
		},
	},
	{
		files: [
			'eslint/**', 'testing/**', 'scripts/**', 'e2e/**', 'src/cli/**',
			'**/*.cjs', '*.config.js', '*.config.mjs', '*.config.cjs',
		],
		languageOptions: {
			globals: { ...globals.node },
		},
	},

	// The Vue 3 LIBRARY variant. Not `recommended`, which assumes an app with
	// an appinfo/, and not `recommendedVue2Library`, which the abandoned
	// migration picked.
	...recommendedLibrary,

	{
		// 🔴 SCOPED to `.vue`. v9 registers the vue plugin for `**/*.vue` alone,
		// and a `vue/*` rule in an unscoped block reaches plain `.js` and stops
		// ESLint running ("could not find plugin vue").
		files: ['**/*.vue'],
		rules: {
			// This library's PUBLIC event API is kebab-case (`row-click`,
			// `update:selected-id`, …). Every consuming app binds those names
			// and each is documented with an `@event` tag the docs pipeline
			// publishes. Renaming 189 emissions to camelCase would break that
			// surface for zero behavioural gain, so the convention is declared
			// explicitly and kept ENFORCING rather than switched off.
			'vue/custom-event-name-casing': ['error', 'kebab-case', {
				// `update:` events are Vue's own v-model convention and keep the
				// prop's spelling after the colon, so BOTH halves are exempt:
				// `update:selected-id` because the prop is kebab in the template,
				// and `update:modelValue` because that is the name Vue itself
				// defines. Hyphenating the latter would rename the v-model event
				// of every component in the library.
				ignores: ['/^update:[a-zA-Z]+(?:[-A-Z][a-zA-Z]*)*$/u'],
			}],
			'vue/first-attribute-linebreak': 'off',

			// SLOT NAMES ARE PUBLISHED API, and this library's are kebab-case:
			// `#action-items`, `#mass-actions`, `#title-icon`. Every consuming app
			// binds them by name and every one is documented under that name, so
			// camelCasing 94 of them would be a breaking change to 21 apps for a
			// naming preference. The convention is deliberate and consistent, which
			// is the thing a casing rule is there to protect.
			'vue/slot-name-casing': 'off',

			// A BOOLEAN PROP DEFAULTING TO TRUE IS THIS LIBRARY'S API, not an
			// oversight. 142 of the 152 findings are `default: true`, and they are
			// the `show*` family: showActions, showRefresh, showTitle, and their
			// kin. Vue's guidance is that presence should mean true, and it is good
			// guidance for new props. Applying it here would INVERT the behaviour
			// every consuming app relies on, and the alternative spelling
			// (`hideActions`) renames the same public surface. Either way it is a
			// breaking change to 21 apps in exchange for a default's direction.
			'vue/no-boolean-default': 'off',
		},
	},

	{
		// 🔴 SCOPED, and the ignores are part of the scope. v9 registers the
		// jsdoc plugin ONLY inside its documentation blocks, and every one of
		// those carries a test-file ignore list. A `jsdoc/*` rule reaching a
		// file where the plugin is not registered stops ESLint outright
		// ("The jsdoc plugin is not defined"), which launchpad measured taking
		// out all of tests/ at once.
		files: ['**/*.js', '**/*.mjs', '**/*.cjs', '**/*.ts', '**/*.vue'],
		ignores: TEST_GLOBS,
		settings: {
			jsdoc: {
				// `@event` documents a Vue event NAME, not a JS namepath.
				// `update:content` has a colon, which is illegal in a namepath,
				// and quoting it breaks vue-docgen-api, which reads the name
				// straight off this tag. Declaring the tag's name as free text
				// keeps `valid-types` active on everything else.
				structuredTags: {
					event: { name: 'text', type: true },
				},
			},
		},
		rules: {
			'jsdoc/require-jsdoc': 'off',
			// Vue components use `@slot` and `@event` documentation patterns
			// that are not standard JSDoc tags.
			'jsdoc/check-tag-names': 'off',
		},
	},

	{
		// v9 turns the CORE `no-unused-vars` off for `.ts` and `.vue` and drives
		// `@typescript-eslint/no-unused-vars` there instead, at bare defaults.
		// Restate this project's exceptions on the rule that actually runs:
		// `t`/`n` i18n imports, `_`-prefixed placeholder arguments, and
		// rest-sibling omissions.
		//
		// 🔴 SCOPED: `@typescript-eslint` is registered only for these
		// extensions, and naming it for a plain `.js` file is a hard config
		// error.
		files: ['**/*.vue', '**/*.ts', '**/*.cts', '**/*.mts', '**/*.tsx'],
		rules: {
			'@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^(t|n)$', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
			'@typescript-eslint/no-explicit-any': 'off',
		},
	},

	{
		// The same exceptions on the core rule, for plain JavaScript, where v9
		// keeps it on. NOT `.ts`: the core rule reads parameter names inside a
		// function TYPE as bindings and reports them unused.
		files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
		rules: {
			'no-unused-vars': ['error', { varsIgnorePattern: '^(t|n)$', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
		},
	},

	{
		// The manifest editor's contract IS in-place mutation of the passed
		// object. `CnPageConfigModal`'s `page` prop says so literally ("the
		// working manifest's page, mutated in place"), and Buildiq's builder.js
		// PUTs the same object back after the editor has mutated it.
		// `vue/no-mutating-props` is reporting the architecture here, not a
		// defect, so it is scoped off for exactly these surfaces rather than
		// disabled library-wide.
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
	},

	{
		// CLI scripts are Node executables: `process.exit()`, CJS `require()`
		// and minimal JSDoc are intentional for build tools. The `n/*` and
		// `import/*` relaxations that used to live here went with their
		// plugins; the JSDoc ones remain.
		files: ['src/cli/**/*.js', 'src/cli/**/*.cjs'],
		rules: {
			'no-console': 'off',
			'jsdoc/require-param-description': 'off',
			'jsdoc/escape-inline-tags': 'off',
			'jsdoc/reject-function-type': 'off',
		},
	},

	{
		// TEST CODE, which is not application code and is not linted as if it
		// were.
		//
		// 🔴 `var` IS LOAD-BEARING IN A JEST SPEC, AND `--fix` HAS ALREADY BROKEN
		// TWO SUITES PROVING IT. A `jest.mock()` factory is hoisted above every
		// declaration and may only close over `mock`-prefixed variables. Those
		// are `var` on purpose: `var` hoists and reads as undefined, while
		// `let`/`const` sit in the temporal dead zone and the same read THROWS.
		// Running `--fix` rewrote 18 of them; two suites then failed to LOAD,
		// and a suite that cannot load reports zero failing tests, so the run
		// said "7878 passed" while 42 tests had silently stopped existing.
		//
		// `import/first` and `promise/param-names` used to be turned off here
		// for the same class of reason. Both plugins are gone.
		files: ['tests/**/*.js', 'tests/**/*.vue', 'src/**/__tests__/**/*.js'],
		rules: {
			'no-var': 'off',
		},
	},
]
