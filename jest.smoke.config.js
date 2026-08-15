/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Jest project for the real-render smoke lane (`npm run check:smoke`).
 *
 * Shares every resolver/transform detail with the a11y lane through
 * `tests/support/realNcJestBase.js` — see that file for why the real
 * `@nextcloud/vue` tree is loaded here rather than the generic stub, and why
 * the config is shared rather than copied.
 *
 * `jest.config.js` excludes `tests/smoke/` via `testPathIgnorePatterns`, for
 * the same reason it excludes `tests/a11y/`: run against the stub tree these
 * specs would pass while checking nothing, which is worse than not running.
 */

const base = require('./tests/support/realNcJestBase.js')

module.exports = {
	...base,
	moduleNameMapper: {
		...base.moduleNameMapper,
		// Smoke-lane only, deliberately not in the shared base: this lane is the
		// only one that mounts EVERY component, so it is the only one that hits
		// `getCapabilities()` without a per-spec mock. Adding it to the base
		// would change what the a11y lane loads for no reason. See the mock's
		// own docblock.
		'^@nextcloud/capabilities$': '<rootDir>/tests/__mocks__/nextcloud-capabilities.js',
	},
	testMatch: [
		'<rootDir>/tests/smoke/**/*.smoke.spec.js',
	],
	// Layout/observer APIs jsdom lacks. This lane is the first to mount every
	// component, so it is the first to reach code that observes geometry.
	setupFiles: [
		'<rootDir>/tests/smoke/support/browserApiPolyfill.js',
	],
}
