/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Dedicated Jest project for the `tests/a11y/` lane (`npm run check:a11y`).
 *
 * Separate from `jest.config.js` for one reason: the main config maps
 * `@nextcloud/vue` to a generic `<div class="stub">` mock (right for
 * behavioural specs, wrong for accessibility — see
 * `tests/a11y/support/realNextcloudVue.js` for the full explanation) and
 * mocks `@vueuse/core` down to a single `tryOnScopeDispose` stub (too thin
 * for the real `@nextcloud/vue` components, which call real `@vueuse/core`
 * composables like `createSharedComposable`). This config swaps both for
 * the real thing so `axe-core` inspects real, ARIA-bearing markup.
 *
 * Everything else (network/browser-API mocks: axios, dialogs,
 * notify_push, password-confirmation, fetch-event-source, codemirror,
 * toast-ui, gridstack, apexcharts) is unchanged from `jest.config.js` —
 * those are about network/rendering-library behaviour, not DOM/ARIA
 * shape, so mocking them doesn't affect what axe-core sees.
 *
 * `jest.config.js` excludes `tests/a11y/` via `testPathIgnorePatterns` so
 * `npm test` never runs these specs against the stubbed tree (which would
 * both double-run them and produce a false pass — see this file's sibling
 * docblock).
 */
module.exports = {
	globalSetup: '<rootDir>/tests/globalSetup.js',
	testEnvironment: 'jsdom',
	// `mjs` is required here but NOT in jest.config.js: `@nextcloud/vue` 9 is
	// ESM-only and ships every component as `dist/components/<Name>/index.mjs`.
	// The main lane never touches those files (it maps the package to a stub);
	// this lane loads them for real, so Jest must both RESOLVE and TRANSFORM
	// the `.mjs` extension. Without the extension in the list a bare directory
	// require can't find `index.mjs`; without the `m?` in the transform key the
	// file is handed to the runtime untransformed and dies on `import`.
	moduleFileExtensions: ['js', 'mjs', 'vue', 'json'],
	transform: {
		'^.+\\.m?js$': 'babel-jest',
		'^.+\\.vue$': '@vue/vue3-jest',
	},
	// Four packages beyond jest.config.js's list, all ESM-only and all reached
	// ONLY through the real `@nextcloud/vue` components this lane mounts (the
	// main lane's stub tree never imports them):
	//   nostics        — NcButton and most other components (dev diagnostics)
	//   debounce       — NcAppSidebar / NcAppNavigation
	//   perfect-debounce — NcActions / NcContent
	//   tributejs      — NcRichContenteditable's @mention autocomplete
	// Each was added only after it actually blocked a component; see
	// `tests/a11y/support/realNextcloudVue.js` for the chain that is NOT
	// resolvable this way (unist-builder) and is stubbed instead.
	transformIgnorePatterns: [
		'/node_modules/(?!(@nextcloud|@vueuse|vue-material-design-icons|pinia|vue-codemirror6|codemirror|@codemirror|@ckpack|nostics|debounce|perfect-debounce|tributejs)/)',
	],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		// See jest.config.js — VTU v1 -> v2 mount-options adapter.
		'^@vue/test-utils$': '<rootDir>/tests/support/vueTestUtilsCompat.js',
		// See jest.config.js — pin `vue` to one module instance. This lane needs
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
		'^@nextcloud/vue$': '<rootDir>/tests/a11y/support/realNextcloudVue.js',
		'^@nextcloud/axios$': '<rootDir>/tests/__mocks__/nextcloud-axios.js',
		'^@nextcloud/password-confirmation$': '<rootDir>/tests/__mocks__/nextcloud-password-confirmation.js',
		'^@microsoft/fetch-event-source$': '<rootDir>/tests/__mocks__/fetch-event-source.js',
		'^@nextcloud/notify_push$': '<rootDir>/tests/__mocks__/nextcloud-notify-push.js',
		'^@nextcloud/dialogs$': '<rootDir>/tests/__mocks__/nextcloud-dialogs.js',
		// `@vueuse/core` is DELIBERATELY not mapped here (jest.config.js maps it
		// to a one-function stub). It is a real installed dependency now, and
		// the real `@nextcloud/vue` components this lane mounts call a wide
		// surface of it during setup — `createSharedComposable`, `useElementSize`,
		// `useSwipe`, `useFocusWithin`, ... A stub is guaranteed to lag that
		// surface, and every gap aborts the mount with `core.<fn> is not a
		// function` — i.e. a component that never renders, which is exactly the
		// false-pass this lane exists to prevent. Let the real package load.
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
	testMatch: [
		'<rootDir>/tests/a11y/**/*.spec.js',
	],
	setupFiles: [
		'<rootDir>/tests/a11y/support/jsdomEnvPolyfill.js',
	],
	// See jest.config.js — tests/setup.js needs the test framework in place.
	setupFilesAfterEnv: [
		'<rootDir>/tests/setup.js',
	],
}
