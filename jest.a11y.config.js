/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Dedicated Jest project for the `tests/a11y/` lane (`npm run check:a11y`).
 *
 * Separate from `jest.config.js` for one reason: the main config maps
 * `@nextcloud/vue` to a generic `<div class="stub">` mock (right for
 * behavioural specs, wrong for accessibility — see
 * `tests/support/realNextcloudVue.js` for the full explanation) and
 * mocks `@vueuse/core` down to a single `tryOnScopeDispose` stub (too thin
 * for the real `@nextcloud/vue` components, which call real `@vueuse/core`
 * composables like `createSharedComposable`). The shared base swaps both for
 * the real thing so `axe-core` inspects real, ARIA-bearing markup.
 *
 * `jest.config.js` excludes `tests/a11y/` via `testPathIgnorePatterns` so
 * `npm test` never runs these specs against the stubbed tree (which would
 * both double-run them and produce a false pass).
 *
 * Everything that makes the real `@nextcloud/vue` tree loadable under Jest
 * now lives in `tests/support/realNcJestBase.js`, shared with the
 * `check:smoke` lane — see that file for why it is shared rather than
 * copied. Only the two genuinely a11y-specific keys stay here.
 */

const base = require('./tests/support/realNcJestBase.js')

module.exports = {
	...base,
	testMatch: [
		'<rootDir>/tests/a11y/**/*.spec.js',
	],
	// Quiets two jsdom gaps that axe-core trips on. a11y-only: the smoke lane
	// never calls axe, so it has no use for a canvas or pseudo-element shim
	// (it polyfills a different set — layout observers).
	setupFiles: [
		'<rootDir>/tests/a11y/support/jsdomEnvPolyfill.js',
	],
	// One axe run against a mounted page does not fit in jest's 5 second
	// default on a busy machine, and blowing that deadline does not just fail
	// one test: the abandoned run is never torn down, so every later test in
	// the same file dies on "Axe is already running" and the file reports four
	// or five failures for one slow assertion. Measured against generated CPU
	// load, alternating runs so the load is the same on both sides: 3 of 3 runs
	// red on the 5 second default, 0 of 3 with this setting. On an idle machine
	// both are green, which is why the setting looks pointless until it is not.
	// Nothing about the components changes between those runs, and the suite
	// that goes red is whichever one drew the most contention.
	//
	// 30 seconds is chosen against the passing numbers rather than picked
	// round: a healthy axe assertion here lands in 2 to 4 seconds, so this
	// leaves an order of magnitude of headroom while still failing a test that
	// has genuinely hung rather than waiting for the suite's own 45 minute cap.
	testTimeout: 30000,
}
