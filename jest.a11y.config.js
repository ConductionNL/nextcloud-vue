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
	moduleFileExtensions: ['js', 'vue', 'json'],
	transform: {
		'^.+\\.js$': 'babel-jest',
		'^.+\\.vue$': '@vue/vue3-jest',
	},
	transformIgnorePatterns: [
		'/node_modules/(?!(@nextcloud|@vueuse|vue-material-design-icons|pinia|vue-codemirror6|codemirror|@codemirror|@ckpack)/)',
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
		// The ONE line that differs from jest.config.js's equivalent map:
		// real components (curated — see the target file's docblock), not
		// the generic stub.
		'^@nextcloud/vue$': '<rootDir>/tests/a11y/support/realNextcloudVue.js',
		'^@nextcloud/axios$': '<rootDir>/tests/__mocks__/nextcloud-axios.js',
		'^@nextcloud/password-confirmation$': '<rootDir>/tests/__mocks__/nextcloud-password-confirmation.js',
		'^@microsoft/fetch-event-source$': '<rootDir>/tests/__mocks__/fetch-event-source.js',
		'^@nextcloud/notify_push$': '<rootDir>/tests/__mocks__/nextcloud-notify-push.js',
		'^@nextcloud/dialogs$': '<rootDir>/tests/__mocks__/nextcloud-dialogs.js',
		// Richer @vueuse/core stub than jest.config.js's one-function mock:
		// the a11y lane mounts REAL @nextcloud/vue components (NcModal/NcDialog/
		// NcAppSidebar/...) that call real @vueuse/core composables during
		// setup/mount. @vueuse/core is an uninstalled peer dep, so we stub the
		// full surface those components use with inert refs (none affect ARIA
		// markup) — see the stub's docblock.
		'^@vueuse/core$': '<rootDir>/tests/a11y/support/vueuseCoreStub.js',
		'^vue-apexcharts$': '<rootDir>/tests/__mocks__/vue-apexcharts.js',
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
