/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Shared Jest configuration for every lane that mounts the REAL
 * `@nextcloud/vue` tree instead of the generic stub: `jest.a11y.config.js`
 * (`npm run check:a11y`) and `jest.smoke.config.js` (`npm run check:smoke`).
 *
 * WHY THIS IS SHARED RATHER THAN COPIED. Loading `@nextcloud/vue` 9 under
 * Jest takes roughly a hundred lines of non-obvious resolver, transform and
 * mapping detail, every line of which was added only after it blocked a real
 * component (see the inline comments below and
 * `tests/support/realNextcloudVue.js`). Two independent copies of that would
 * drift — and the drift is silent in the worst direction: a lane whose
 * `@nextcloud/vue` mapping has fallen behind renders empty placeholders and
 * PASSES. Both of these lanes exist specifically to catch false passes, so
 * they must not be built on a config that can produce one.
 *
 * Lane-specific keys — `testMatch`, `setupFiles` — are deliberately NOT set
 * here. Each config spreads this object and supplies its own.
 */

module.exports = {
	globalSetup: '<rootDir>/tests/globalSetup.js',
	testEnvironment: 'jsdom',
	// `mjs` is required here but NOT in jest.config.js: `@nextcloud/vue` 9 is
	// ESM-only and ships every component as `dist/components/<Name>/index.mjs`.
	// The main lane never touches those files (it maps the package to a stub);
	// these lanes load them for real, so Jest must both RESOLVE and TRANSFORM
	// the `.mjs` extension. Without the extension in the list a bare directory
	// require can't find `index.mjs`; without the `m?` in the transform key the
	// file is handed to the runtime untransformed and dies on `import`.
	moduleFileExtensions: ['js', 'mjs', 'vue', 'json'],
	transform: {
		'^.+\\.m?js$': 'babel-jest',
		'^.+\\.vue$': '@vue/vue3-jest',
	},
	// Four packages beyond jest.config.js's list, all ESM-only and all reached
	// ONLY through the real `@nextcloud/vue` components these lanes mount (the
	// main lane's stub tree never imports them):
	//   nostics        — NcButton and most other components (dev diagnostics)
	//   debounce       — NcAppSidebar / NcAppNavigation
	//   perfect-debounce — NcActions / NcContent
	//   tributejs      — NcRichContenteditable's @mention autocomplete
	// Each was added only after it actually blocked a component; see
	// `tests/support/realNextcloudVue.js` for the chains that are NOT
	// resolvable this way (unist-builder, string-length) and are stubbed.
	transformIgnorePatterns: [
		'/node_modules/(?!(@nextcloud|@vueuse|vue-material-design-icons|pinia|vue-codemirror6|codemirror|@codemirror|@ckpack|nostics|debounce|perfect-debounce|tributejs)/)',
	],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		// See jest.config.js — VTU v1 -> v2 mount-options adapter.
		'^@vue/test-utils$': '<rootDir>/tests/support/vueTestUtilsCompat.js',
		// See jest.config.js — pin `vue` to one module instance. These lanes need
		// it at least as much as the main one: the real `@nextcloud/vue`
		// components are loaded through a DIFFERENT module path than the specs'
		// own `require('vue')`, and two copies of the runtime would leave
		// `inject()` / `getCurrentInstance()` silently null across the boundary.
		'^vue$': '<rootDir>/tests/support/vueSingleton.js',
		'\\.(css)$': 'jest-transform-stub',
		'^@toast-ui/editor$': '<rootDir>/tests/__mocks__/toast-ui-editor.js',
		'^@mdi/js$': '<rootDir>/tests/__mocks__/mdi-js.js',
		'^vue-codemirror6$': '<rootDir>/tests/__mocks__/vue-codemirror6.js',
		'^@codemirror/lang-json$': '<rootDir>/tests/__mocks__/codemirror-lang-json.js',
		'^@codemirror/lang-xml$': '<rootDir>/tests/__mocks__/codemirror-lang-xml.js',
		'^@codemirror/lang-html$': '<rootDir>/tests/__mocks__/codemirror-lang-html.js',
		// The ONE line that differs from jest.config.js's equivalent map:
		// real components (curated — see the target file's docblock), not
		// the generic stub.
		'^@nextcloud/vue$': '<rootDir>/tests/support/realNextcloudVue.js',
		'^@nextcloud/axios$': '<rootDir>/tests/__mocks__/nextcloud-axios.js',
		'^@nextcloud/password-confirmation$': '<rootDir>/tests/__mocks__/nextcloud-password-confirmation.js',
		'^@microsoft/fetch-event-source$': '<rootDir>/tests/__mocks__/fetch-event-source.js',
		'^@nextcloud/notify_push$': '<rootDir>/tests/__mocks__/nextcloud-notify-push.js',
		'^@nextcloud/dialogs$': '<rootDir>/tests/__mocks__/nextcloud-dialogs.js',
		// `@vueuse/core` is DELIBERATELY not mapped here (jest.config.js maps it
		// to a one-function stub). It is a real installed dependency now, and
		// the real `@nextcloud/vue` components these lanes mount call a wide
		// surface of it during setup — `createSharedComposable`, `useElementSize`,
		// `useSwipe`, `useFocusWithin`, ... A stub is guaranteed to lag that
		// surface, and every gap aborts the mount with `core.<fn> is not a
		// function` — i.e. a component that never renders, which is exactly the
		// false-pass these lanes exist to prevent. Let the real package load.
		//
		// `@nextcloud/vue-select` (NcSelect's dependency) is ESM-only and its
		// `exports` map offers ONLY an `import` condition, so Jest's CJS
		// resolver cannot find it by name at all. Point at the file directly —
		// the same escape hatch `tests/support/vueSingleton.js` documents.
		'^@nextcloud/vue-select$': '<rootDir>/node_modules/@nextcloud/vue-select/dist/index.mjs',
		// See jest.config.js — the Vue-3 line imports `vue3-apexcharts`.
		'^vue-apexcharts$': '<rootDir>/tests/__mocks__/vue-apexcharts.js',
		'^vue3-apexcharts$': '<rootDir>/tests/__mocks__/vue-apexcharts.js',
		'^gridstack$': '<rootDir>/tests/__mocks__/gridstack.js',
		'^gridstack/dist/gridstack\\.min\\.css$': 'jest-transform-stub',
	},
	// See jest.config.js — tests/setup.js needs the test framework in place.
	setupFilesAfterEnv: [
		'<rootDir>/tests/setup.js',
	],
}
