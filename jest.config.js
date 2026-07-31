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
		// `nostics` is pulled in by pinia >= 4 and is ESM-only; without it the
		// whole suite dies at `require('pinia')` in tests/setup.js the moment a
		// consumer's pinia major moves. Listed so the peer range this package
		// advertises stays actually runnable here.
		'/node_modules/(?!(@nextcloud|@vueuse|vue-material-design-icons|pinia|nostics|vue-codemirror6|codemirror|@codemirror|@ckpack)/)',
	],
	moduleNameMapper: {
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
	// `tests/a11y/` has its own project (jest.a11y.config.js, run via
	// `npm run check:a11y`) that swaps the @nextcloud/vue mock for real
	// components so axe-core inspects real markup — see that config's
	// docblock. Excluded here so `npm test` doesn't also run those specs
	// against the generic stub tree (double-run + false pass).
	testPathIgnorePatterns: [
		'/node_modules/',
		'<rootDir>/tests/a11y/',
	],
	// `setupFilesAfterEnv` (not `setupFiles`) because the setup installs a
	// per-test pinia via `beforeEach`, which only exists once the test
	// framework is in place. It still runs before the test file is loaded, so
	// the `OC` global and the structuredClone polyfill land in time.
	setupFilesAfterEnv: [
		'<rootDir>/tests/setup.js',
	],
}
