/*
 * "A worker process has failed to exit gracefully" — READ THIS BEFORE CHASING IT.
 *
 * A full local run on a many-core machine ends with:
 *
 *   A worker process has failed to exit gracefully and has been force exited.
 *   This is likely caused by tests leaking due to improper teardown.
 *
 * It is NOT a leaking test, and `maxWorkers` is deliberately not set below to
 * silence it. Measured on a 14-core machine over `tests/components` (352
 * suites), each run repeated:
 *
 *   --maxWorkers=1,2,4,6,8   no warning
 *   --maxWorkers=10,12       warning, every run
 *   default (13 workers)     warning, every run (3 of 3)
 *
 * The threshold sits between 8 and 10 CONCURRENT workers, and it is total
 * concurrency rather than per-worker load: 8 workers carry MORE suites each
 * and stay clean. It is jsdom environments contending, so a worker misses
 * jest's exit grace period and is force-killed after its tests have already
 * passed.
 *
 * CI never sees it. The `Frontend Tests (unit)` job runs 627 suites green with
 * ZERO occurrences, because a GitHub runner has too few cores to reach the
 * threshold.
 *
 * `--detectOpenHandles` cannot help here and will mislead you: it implies
 * `--runInBand`, so it removes the workers whose exit is the entire symptom.
 * It reports no open handles across all 352 suites.
 *
 * WHAT IT COSTS. Nothing to correctness — every test passes and the exit code
 * is 0. It can perturb scheduling enough to surface an order-dependent flake
 * (seen once on CnAddWidgetModal, not reproducible on a second run of the same
 * tree). If that becomes common, the lead worth pulling is per-suite teardown
 * of mounted components, not this config.
 *
 * Capping `maxWorkers` here would slow every developer's run to hide a warning
 * CI does not emit, so it is left alone and explained instead.
 */
module.exports = {
	// Rebuilds the gitignored compiled manifest validator when it is missing or
	// stale. `pretest` already does this for `npm test`, but not for `npx jest`,
	// `--watch`, or an IDE runner — and without it `tests/schemas/*` fails for
	// reasons that have nothing to do with the code under test.
	globalSetup: '<rootDir>/tests/globalSetup.js',
	testEnvironment: 'jsdom',
	moduleFileExtensions: ['js', 'vue', 'json'],
	transform: {
		'^.+\\.js$': 'babel-jest',
		// `.mjs` too: several packages now ship ESM-only entry points reached
		// through an `exports` map (pinia >= 4 pulls in `nostics`, whose only
		// entry is `dist/index.mjs`). Without a transform for the extension the
		// suite dies at `require('pinia')` in tests/setup.js — a whole-suite
		// failure caused by nothing in this repository. NOT added to
		// `moduleFileExtensions`: these files are resolved with an explicit
		// extension, and changing the resolution order would be a much larger
		// blast radius than transforming them.
		'^.+\\.mjs$': 'babel-jest',
		'^.+\\.vue$': '@vue/vue3-jest',
	},
	transformIgnorePatterns: [
		// pinia >= 4 pulls `@vue/devtools-api` 8, whose CJS entry requires
		// `@vue/devtools-kit`, which is ESM-only and in turn pulls
		// `perfect-debounce`, `birpc` and `hookable`. Without these listed the
		// whole suite dies at `require('pinia')` in tests/setup.js with
		// `SyntaxError: Unexpected token 'export'` the moment a consumer's pinia
		// major moves. `nostics` is the same story from an earlier pinia bump.
		// Listed so the peer range this package advertises stays actually
		// runnable here.
		'/node_modules/(?!(@nextcloud|@vueuse|vue-material-design-icons|pinia|nostics|@vue/devtools-api|@vue/devtools-kit|@vue/devtools-shared|perfect-debounce|birpc|hookable|vue-codemirror6|codemirror|@codemirror|@ckpack)/)',
	],
	moduleNameMapper: {
		// pinia >= 4 loads @vue/devtools-api, which registers a devtools backend
		// and leaves a handle open. Jest then exits non-zero on "A worker process
		// has failed to exit gracefully" with every test passing. Devtools have
		// nothing to assert in a unit test, so they are stubbed out.
		'^@vue/devtools-api$': '<rootDir>/tests/mocks/vue-devtools-api.js',
		'^@/(.*)$': '<rootDir>/src/$1',
		// VTU v2 silently ignores v1's top-level stubs/provide/mocks. This
		// adapter hoists them into `global` so ~100 legacy specs keep the
		// isolation they were written with. See the file's docblock.
		'^@vue/test-utils$': '<rootDir>/tests/support/vueTestUtilsCompat.js',
		// Vue 3 keeps `currentRenderingInstance` / `currentInstance` in module
		// scope, so the second copy of Vue that `jest.isolateModules()` creates
		// breaks `resolveComponent()`, `inject()` and `getCurrentInstance()`
		// across the copy boundary — silently. Pin `vue` to one instance for
		// the whole worker. See the file's docblock.
		'^vue$': '<rootDir>/tests/support/vueSingleton.js',
		'\\.(css)$': 'jest-transform-stub',
		'^@toast-ui/editor$': '<rootDir>/tests/__mocks__/toast-ui-editor.js',
		'^@mdi/js$': '<rootDir>/tests/__mocks__/mdi-js.js',
		'^vue-codemirror6$': '<rootDir>/tests/__mocks__/vue-codemirror6.js',
		'^@codemirror/lang-json$': '<rootDir>/tests/__mocks__/codemirror-lang-json.js',
		'^@codemirror/lang-xml$': '<rootDir>/tests/__mocks__/codemirror-lang-xml.js',
		'^@codemirror/lang-html$': '<rootDir>/tests/__mocks__/codemirror-lang-html.js',
		'^@nextcloud/vue$': '<rootDir>/tests/__mocks__/nextcloud-vue.js',
		'^@nextcloud/axios$': '<rootDir>/tests/__mocks__/nextcloud-axios.js',
		'^@nextcloud/password-confirmation$': '<rootDir>/tests/__mocks__/nextcloud-password-confirmation.js',
		'^@microsoft/fetch-event-source$': '<rootDir>/tests/__mocks__/fetch-event-source.js',
		'^@nextcloud/notify_push$': '<rootDir>/tests/__mocks__/nextcloud-notify-push.js',
		// `@nextcloud/dialogs`' CJS build requires the ESM-only `@nextcloud/paths`
		// (no `require` export condition) — Jest can't resolve it. Stub the two
		// toast helpers actually used in src/ so any test pulling in the full
		// library barrel (src/index.js → CnAdminSettingsShell → dialogs) works.
		'^@nextcloud/dialogs$': '<rootDir>/tests/__mocks__/nextcloud-dialogs.js',
		'^@vueuse/core$': '<rootDir>/tests/__mocks__/vueuse-core.js',
		// Global vue-apexcharts stub — the real module's apexcharts renderer
		// throws in jsdom, and specs that import CnChartWidget transitively
		// without a local mock used to leak the real module into the worker
		// (order-dependent full-suite failures). See the mock file's docblock.
		// Both names are mapped: the Vue-3 line imports `vue3-apexcharts`,
		// while `vue-apexcharts` (Vue 2) may still arrive transitively. Missing
		// the vue3 name let the REAL renderer load and throw in jsdom
		// ("reading 'filter'" / "querySelectorAll"), which is what the stub
		// exists to prevent.
		'^vue-apexcharts$': '<rootDir>/tests/__mocks__/vue-apexcharts.js',
		'^vue3-apexcharts$': '<rootDir>/tests/__mocks__/vue-apexcharts.js',
		'^gridstack$': '<rootDir>/tests/__mocks__/gridstack.js',
		'^gridstack/dist/gridstack\\.min\\.css$': 'jest-transform-stub',
	},
	testMatch: [
		'<rootDir>/tests/**/*.spec.js',
		'<rootDir>/tests/**/*.test.js',
		'<rootDir>/src/**/__tests__/**/*.spec.js',
		'<rootDir>/src/**/__tests__/**/*.test.js',
	],
	// `tests/a11y/` and `tests/smoke/` have their own projects
	// (jest.a11y.config.js via `npm run check:a11y`, jest.smoke.config.js via
	// `npm run check:smoke`) that swap the @nextcloud/vue mock for real
	// components — so axe-core inspects real markup, and so the smoke sweep
	// meets real prop validation. See those configs' docblocks. Excluded here
	// so `npm test` doesn't also run those specs against the generic stub tree
	// (double-run + false pass: against the stub the smoke sweep in particular
	// would pass for every component while checking nothing).
	testPathIgnorePatterns: [
		'/node_modules/',
		'<rootDir>/tests/a11y/',
		'<rootDir>/tests/smoke/',
	],
	// `setupFilesAfterEnv` (not `setupFiles`) because the setup installs a
	// per-test pinia via `beforeEach`, which only exists once the test
	// framework is in place. It still runs before the test file is loaded, so
	// the `OC` global and the structuredClone polyfill land in time.
	setupFilesAfterEnv: [
		'<rootDir>/tests/setup.js',
	],
}
