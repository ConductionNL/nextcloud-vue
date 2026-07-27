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
		'^.+\\.vue$': '@vue/vue3-jest',
	},
	transformIgnorePatterns: [
		'/node_modules/(?!(@nextcloud|@vueuse|vue-material-design-icons|pinia|vue-codemirror6|codemirror|@codemirror)/)',
	],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
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
		'^vue-apexcharts$': '<rootDir>/tests/__mocks__/vue-apexcharts.js',
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
