/**
 * Vue-3 test lane.
 *
 * The main `jest.config.js` still transforms `.vue` with `@vue/vue2-jest`
 * (the library source is authored dual-compatible and the bulk of the
 * suite is exercised under Vue 2). This additional lane compiles SFCs
 * with `@vue/vue3-jest` and runs ONLY `*.vue3.spec.js` files, so
 * behaviour that is Vue-3-specific (render-function API, `$attrs`
 * listener fall-through, `emit` wrapping) can be asserted under the real
 * Vue 3 runtime that consumers of the `vue3` dist-tag run.
 *
 *   npm run test:vue3
 */
const base = require('./jest.config.js')

module.exports = {
	...base,
	globalSetup: undefined,
	setupFiles: [],
	transform: {
		'^.+\\.js$': 'babel-jest',
		'^.+\\.vue$': '@vue/vue3-jest',
	},
	testMatch: ['<rootDir>/tests/**/*.vue3.spec.js'],
}
