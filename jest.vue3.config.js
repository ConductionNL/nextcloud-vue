/**
 * Vue-3-specific test lane.
 *
 * The main `jest.config.js` now also compiles SFCs with `@vue/vue3-jest` —
 * this branch is the Vue-3 line, so Vue 3 is the only runtime under test.
 * This lane remains as a focused harness for `*.vue3.spec.js` files that
 * assert Vue-3-specific behaviour (render-function API, `$attrs` listener
 * fall-through, `emit` wrapping) without the shared `globalSetup` /
 * `setupFiles` the main lane installs.
 *
 *   npm run test:vue3
 */
const base = require('./jest.config.js')

module.exports = {
	...base,
	globalSetup: undefined,
	setupFiles: [],
	setupFilesAfterEnv: [],
	transform: {
		'^.+\\.js$': 'babel-jest',
		'^.+\\.vue$': '@vue/vue3-jest',
	},
	testMatch: ['<rootDir>/tests/**/*.vue3.spec.js'],
}
