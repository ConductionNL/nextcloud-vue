/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * `@conduction/nextcloud-vue/eslint` — the shared flat-config ESLint preset
 * for every Conduction Nextcloud app.
 *
 * WHY THIS LIVES IN nc-vue (not in each app)
 * ------------------------------------------
 * Fourteen apps consume this library and every one of them was carrying its
 * own hand-rolled lint config. That is not a cosmetic duplication — it is a
 * correctness gap, and it has already shipped bugs:
 *
 *   - openconnector finished its Vue 3 migration with a lint config that still
 *     extended the **Vue 2** preset. `npx eslint --print-config` showed that
 *     not one `vue/no-deprecated-*` rule was active, so four `beforeDestroy`
 *     hooks survived the migration untouched. Vue 3 does not call, warn about,
 *     or error on `beforeDestroy`; it silently ignores the hook name. Each
 *     surviving hook was therefore a live memory leak — a 1 Hz `setInterval`
 *     per mounted `CircuitBreakerBadge`, and `releaseLiveSubscription()` in a
 *     mixin backing four detail pages — with zero console output.
 *   - the same config pinned `ecmaVersion: 6`, which left
 *     `eslint-plugin-import` unable to parse `?.`, `??` and object spread and
 *     manufactured 20 warnings about code that was perfectly valid.
 *
 * A shared preset turns "did this app remember to arm the Vue 3 rules?" from a
 * per-repo judgement call into a one-line import. Every surviving Vue-2 idiom
 * becomes a build failure, once, everywhere.
 *
 * WHAT IT GUARANTEES
 * ------------------
 *  1. The whole `vue/no-deprecated-*` family is ARMED at `error`. The list is
 *     written out explicitly rather than inherited from
 *     `plugin:vue/vue3-essential`, because two of the rules
 *     (`no-deprecated-delete-set`, `no-deprecated-model-definition`) are NOT in
 *     that preset, and because an explicit list is what makes the guarantee
 *     auditable — `--print-config` shows them by name.
 *  2. `ecmaVersion: 'latest'` / `sourceType: 'module'`, set on BOTH
 *     `languageOptions` and `languageOptions.parserOptions`, so
 *     `eslint-plugin-import` (which reads `context.parserOptions`) can parse
 *     optional chaining, nullish coalescing and spread instead of inventing
 *     warnings about them. `'latest'` and not a pinned year: a shared preset
 *     that pins can only ever LOWER a consumer — see {@link ECMA_LANGUAGE_LEVEL}.
 *  3. `vue/v-on-event-hyphenation` configured with
 *     `ignore: ['update:modelValue']` — see the block comment on the rule.
 *  4. `parserOptions.parser` in vue-eslint-parser's documented OBJECT form,
 *     which is the difference between a working gate and 385 false positives —
 *     see the block comment on {@link vueSfcParserOptions}.
 *
 * USAGE
 * -----
 * Standalone (a new app, or one adopting the Conduction baseline wholesale):
 *
 * ```js
 * // eslint.config.js
 * const { conductionVue3 } = require('@conduction/nextcloud-vue/eslint')
 *
 * module.exports = [
 *   { ignores: ['dist/**', 'node_modules/**'] },
 *   ...conductionVue3,
 *   { name: 'app/overrides', rules: {} },
 * ]
 * ```
 *
 * On top of an existing `@nextcloud/eslint-config/vue3` setup — spread the
 * FIX layer last so it wins, without re-registering the `vue` plugin:
 *
 * ```js
 * const { FlatCompat } = require('@eslint/eslintrc')
 * const { conductionVue3Fixes } = require('@conduction/nextcloud-vue/eslint')
 *
 * module.exports = [
 *   ...compat.extends('@nextcloud/eslint-config/vue3'),
 *   ...conductionVue3Fixes,
 * ]
 * ```
 *
 * IMPORT SPELLING (verified against a packed install, not the source tree)
 * -----------------------------------------------------------------------
 * This package deliberately ships NO `exports` map — several existing deep
 * subpaths (`.../src/composables`, `.../src/icons/rvo.js`, `.../src/types`)
 * depend on its absence. Node's NATIVE ESM resolver does not do directory-index
 * or extension-adding resolution, so:
 *
 *   - `eslint.config.js`  (CommonJS)  → `require('@conduction/nextcloud-vue/eslint')`   ✓
 *   - `eslint.config.mjs` (native ESM) → `import … from '@conduction/nextcloud-vue/eslint/index.js'` ✓
 *     (the extensionless form throws `ERR_UNSUPPORTED_DIR_IMPORT`)
 *   - webpack / vite / Playwright's esbuild loader resolve either spelling.
 *
 * PEER REQUIREMENTS
 * -----------------
 * `eslint`, `eslint-plugin-vue` and `vue-eslint-parser` are OPTIONAL peer
 * dependencies: they are only needed by consumers that actually import this
 * subpath, so declaring them as hard peers would force an install cost on
 * every runtime consumer of the component library. `@babel/eslint-parser` and
 * `@typescript-eslint/parser` are resolved opportunistically — when absent the
 * preset degrades to ESLint's bundled `espree` rather than throwing, so an app
 * with no TypeScript still gets the deprecation gate.
 *
 * @module eslint
 */

const pluginVue = require('eslint-plugin-vue')
const vueParser = require('vue-eslint-parser')

/**
 * The ECMAScript syntax FLOOR every Conduction app may rely on.
 *
 * 2022 is the level that makes `?.`, `??`, `??=`, class fields, private methods
 * and static blocks parseable. It is deliberately a named export: an app that
 * must reconfigure a parser of its own and needs a NUMBER (some third-party
 * tooling refuses the `'latest'` string) should reuse this constant instead of
 * re-guessing one — guessing is how `ecmaVersion: 6` survived a Vue 3 migration
 * and produced 20 phantom `import/*` warnings.
 *
 * It is a FLOOR, not the value the preset sets. See
 * {@link ECMA_LANGUAGE_LEVEL}.
 *
 * @type {number}
 */
const ECMA_VERSION = 2022

/**
 * The ECMAScript level the preset actually configures — `'latest'`, never a
 * pinned year.
 *
 * READ THIS BEFORE PINNING A NUMBER HERE AGAIN.
 *
 * A shared preset that pins a year can only ever LOWER a consumer. openconnector
 * adopted this preset over a config that carried a top-level
 * `ecmaVersion: 'latest'`, and the adoption silently downgraded it to 2022. It
 * was harmless in that repository — but the harm is not hypothetical, it is the
 * SAME failure the pin was introduced to fix: openconnector's older
 * `ecmaVersion: 6` left `eslint-plugin-import` unable to parse `?.`, `??` and
 * object spread, and it manufactured 20 warnings about perfectly valid code.
 *
 * Measured against this repository's ESLint (8.57 / espree 9.6), with the
 * ES2024 `v` (unicodeSets) regexp flag as the probe:
 *
 * ```
 * ecmaVersion: 2022     → FATAL "Parsing error: Invalid regular expression flag"
 * ecmaVersion: 'latest' → clean
 * ```
 *
 * A parse error is not a soft downgrade: ESLint reports a `fatal` message and
 * every other rule on that file is skipped, so the deprecation gate this preset
 * exists to arm goes SILENT on exactly the files using modern syntax.
 *
 * `'latest'` is ESLint's own supported spelling for "whatever this ESLint can
 * parse" and moves forward with the consumer's toolchain instead of against it.
 * A consumer that genuinely wants a pin can spread its own layer after the
 * preset — flat config's last-wins ordering makes that a one-liner, and it is
 * the consumer's call to make, not the shared preset's.
 *
 * @type {string}
 */
const ECMA_LANGUAGE_LEVEL = 'latest'

/**
 * Resolve an optional module path, returning `null` when it is not installed.
 *
 * Used for the two SFC script parsers: a consumer without TypeScript should
 * still get the deprecation gate rather than a hard config error.
 *
 * @param {string} id Module id to resolve.
 * @return {string|null} Absolute path, or null when unresolvable.
 */
function resolveOptional(id) {
	try {
		return require.resolve(id)
	} catch (e) {
		return null
	}
}

const babelParserPath = resolveOptional('@babel/eslint-parser')
const tsParserPath = resolveOptional('@typescript-eslint/parser')
const espreePath = resolveOptional('espree')

/**
 * `parserOptions` for `<script>` blocks inside `.vue` files.
 *
 * READ THIS BEFORE COLLAPSING `parser` BACK TO A STRING.
 *
 * `@nextcloud/eslint-config/vue3` sets `parserOptions.parser` to the bare
 * string `'@typescript-eslint/parser'`. `vue-eslint-parser` then routes the
 * TEMPLATE expressions through that parser as well, and its scope analysis
 * does not carry `v-for` iteration variables into the template's variable
 * scope. Every `:key` in a `v-for` then looks like a reference to something the
 * loop never declared, and `vue/valid-v-for` reports hundreds of false
 * positives on code as plain as
 * `v-for="seg in viewSegments" :key="seg.mode"` — 379 of them in this library
 * alone, plus 6 bogus `vue/valid-v-slot` errors on `<template v-for #[name]>`.
 *
 * The object form (`{ js, ts }`) is vue-eslint-parser's documented way to say
 * "this parser for `lang=\"ts\"`, that one otherwise". It fixes the scope
 * analysis while leaving the rules fully ARMED: a genuinely wrong
 * `:key="someConstant"` still errors, as does a missing key. The distinction
 * matters — the wrong fix here is to switch `vue/valid-v-for` off, which
 * silences the gate instead of repairing it.
 *
 * `requireConfigFile: false` keeps `@babel/eslint-parser` usable in apps that
 * have no `babel.config.js`; `@typescript-eslint/parser` ignores the unknown
 * option.
 *
 * @type {object}
 */
const vueSfcParserOptions = {
	ecmaVersion: ECMA_LANGUAGE_LEVEL,
	sourceType: 'module',
	requireConfigFile: false,
	parser: {
		js: babelParserPath || espreePath || 'espree',
		ts: tsParserPath || babelParserPath || espreePath || 'espree',
	},
}

/**
 * Every `vue/no-deprecated-*` rule `eslint-plugin-vue` ships, plus the one
 * Vue-2 removal it does not model as a dedicated rule.
 *
 * This is the load-bearing part of the preset. Each entry corresponds to a
 * Vue 2 idiom that Vue 3 does not warn about — it simply does nothing —
 * which is exactly the failure mode that makes a migration look finished when
 * it is not.
 *
 * @type {Record<string, unknown>}
 */
const vueDeprecationRules = {
	// `beforeDestroy` / `destroyed`. Vue 3 never calls them and never warns.
	// This is the rule that would have caught openconnector's four leaked
	// `setInterval` timers and its leaked live subscription.
	'vue/no-deprecated-destroyed-lifecycle': 'error',
	// `data: {}` object form — silently shared across every instance.
	'vue/no-deprecated-data-object-declaration': 'error',
	// `Vue.set` / `Vue.delete` / `this.$set` / `this.$delete` — removed.
	// NOT part of `plugin:vue/vue3-essential`; only an explicit entry arms it.
	'vue/no-deprecated-delete-set': 'error',
	// `this.$listeners` — merged into `$attrs`.
	'vue/no-deprecated-dollar-listeners-api': 'error',
	// `this.$scopedSlots` — merged into `$slots`.
	'vue/no-deprecated-dollar-scopedslots-api': 'error',
	// `$on` / `$off` / `$once` — the event-emitter API is gone. A component
	// still calling `$on` compiles, mounts, and never receives an event.
	'vue/no-deprecated-events-api': 'error',
	// `{{ value | filter }}` — filters are removed from the template compiler.
	'vue/no-deprecated-filter': 'error',
	// `functional: true` / `<template functional>`.
	'vue/no-deprecated-functional-template': 'error',
	// `<div is="my-comp">` on a plain element.
	'vue/no-deprecated-html-element-is': 'error',
	// `inline-template`.
	'vue/no-deprecated-inline-template': 'error',
	// The `model: { prop, event }` component option — replaced by
	// `modelValue` / `update:modelValue`. NOT in vue3-essential.
	'vue/no-deprecated-model-definition': 'error',
	// A prop `default()` factory reading `this`. In Vue 3 `this` is
	// `undefined` there, so the factory throws during prop resolution and
	// white-screens the whole page — one of the nastiest silent survivors.
	'vue/no-deprecated-props-default-this': 'error',
	// `<router-link tag="...">`.
	'vue/no-deprecated-router-link-tag-prop': 'error',
	// `scope="..."` on `<template>`.
	'vue/no-deprecated-scope-attribute': 'error',
	// `slot="name"` / `slot-scope="..."`.
	'vue/no-deprecated-slot-attribute': 'error',
	'vue/no-deprecated-slot-scope-attribute': 'error',
	// `:prop.sync="x"` — the `.sync` modifier is removed.
	'vue/no-deprecated-v-bind-sync': 'error',
	// `v-is` (the 3.1 spelling is `is="vue:..."`).
	'vue/no-deprecated-v-is': 'error',
	// `@click.native` — the `.native` modifier is removed.
	'vue/no-deprecated-v-on-native-modifier': 'error',
	// `@keyup.13` — numeric keycode modifiers are removed.
	'vue/no-deprecated-v-on-number-modifiers': 'error',
	// `Vue.config.keyCodes`.
	'vue/no-deprecated-vue-config-keycodes': 'error',

	// The `filters:` COMPONENT OPTION.
	//
	// `vue/no-deprecated-filter` only inspects templates: it reports
	// `{{ msg | upper }}` and `:id="msg | upper"`, but says nothing about the
	// `filters: { … }` block that declared them (verified against
	// eslint-plugin-vue 9.33). A component whose template filters were already
	// rewritten but whose `filters:` option was left behind therefore lints
	// clean while carrying dead Vue-2 API. `no-restricted-component-options`
	// closes that half.
	'vue/no-restricted-component-options': ['error', {
		name: 'filters',
		message: 'The `filters` component option was removed in Vue 3. Replace filters with a computed property or a method.',
	}],
}

/**
 * Listener-casing policy.
 *
 * `vue/v-on-event-hyphenation` is enabled — but with `update:modelValue`
 * excluded, and that exclusion is not a style preference, it is a bug fix.
 *
 * `@nextcloud/vue` v9's field components (`NcTextField`, `NcInputField`,
 * `NcPasswordField`, …) are built on Vue's `useModel()`, which only recognises
 * a parent binding under the camelCase prop key `onUpdate:modelValue`. Handed
 * the hyphenated `@update:model-value`, `useModel` falls back to LOCAL-ONLY
 * mode: the field still renders, still accepts typing, and never emits back —
 * every keystroke is dropped, silently, with no warning in the console.
 *
 * The rule's autofix rewrites `@update:modelValue` → `@update:model-value`,
 * so running `eslint --fix` with this rule at its default setting is an
 * automated way to break every two-way-bound field in an app. This happened
 * once already (verified live 2026-07-23 while building CnFlowCanvas, across
 * 42 listeners). Every OTHER event stays under the rule.
 *
 * @type {Record<string, unknown>}
 */
const vueEventCasingRules = {
	'vue/v-on-event-hyphenation': ['error', 'always', { ignore: ['update:modelValue'] }],
}

/**
 * File globs the preset's language options apply to.
 *
 * @type {string[]}
 */
const ALL_SCRIPT_FILES = ['**/*.js', '**/*.mjs', '**/*.cjs', '**/*.jsx', '**/*.ts', '**/*.mts', '**/*.cts', '**/*.tsx', '**/*.vue']

/**
 * The composable FIX layer: language level, SFC parser wiring, the armed
 * deprecation family, and the listener-casing carve-out — and nothing else.
 *
 * It registers no plugins, so it can be spread onto ANY existing flat config
 * (including one produced by `FlatCompat` from
 * `@nextcloud/eslint-config/vue3`) without the "plugin redefined" error that a
 * second plugin registration would cause. Spread it LAST: later entries win in
 * flat config, which is the whole point.
 *
 * @type {object[]}
 */
const conductionVue3Fixes = [
	{
		name: 'conduction/language-level',
		files: ALL_SCRIPT_FILES,
		languageOptions: {
			ecmaVersion: ECMA_LANGUAGE_LEVEL,
			sourceType: 'module',
			// Repeated on `parserOptions` deliberately: `eslint-plugin-import`
			// resolves the language level from `context.parserOptions`, which in
			// flat config maps to `languageOptions.parserOptions` — NOT to
			// `languageOptions.ecmaVersion`. Leaving it off is what let a stale
			// `ecmaVersion: 6` make the import plugin choke on `?.` and `??`.
			parserOptions: {
				ecmaVersion: ECMA_LANGUAGE_LEVEL,
				sourceType: 'module',
			},
		},
	},
	{
		name: 'conduction/vue-sfc-parser',
		files: ['**/*.vue'],
		languageOptions: {
			parser: vueParser,
			ecmaVersion: ECMA_LANGUAGE_LEVEL,
			sourceType: 'module',
			parserOptions: vueSfcParserOptions,
		},
	},
	{
		name: 'conduction/vue3-deprecations',
		files: ['**/*.vue', '**/*.js', '**/*.mjs', '**/*.cjs', '**/*.ts', '**/*.tsx'],
		rules: {
			...vueDeprecationRules,
			...vueEventCasingRules,
		},
	},
]

/**
 * The standalone Conduction Vue 3 preset.
 *
 * `eslint-plugin-vue`'s `flat/essential` base (which registers the plugin and
 * the `vue-eslint-parser` processor for `.vue` files) with the fix layer
 * applied on top. Use this in an app that has no other Vue lint config; use
 * {@link conductionVue3Fixes} in an app that already extends
 * `@nextcloud/eslint-config/vue3`.
 *
 * @type {object[]}
 */
const conductionVue3 = [
	...pluginVue.configs['flat/essential'],
	...conductionVue3Fixes,
]

module.exports = {
	ECMA_VERSION,
	ECMA_LANGUAGE_LEVEL,
	vueSfcParserOptions,
	vueDeprecationRules,
	vueEventCasingRules,
	conductionVue3Fixes,
	conductionVue3,
}
