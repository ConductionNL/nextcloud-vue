/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 *
 * Stub for `@vue/devtools-api`, which pinia >= 4 loads.
 *
 * The real module pulls `@vue/devtools-kit`, which registers a devtools
 * backend and leaves a handle open. Jest then reports "A worker process has
 * failed to exit gracefully" and exits non-zero even though every test passed,
 * so the suite goes red on a leak rather than on a defect.
 *
 * Devtools instrumentation has nothing to assert in a unit test, so it is
 * stubbed out entirely. `setupDevtoolsPlugin` is the only entry point pinia
 * calls; the rest are here so an unexpected import does not throw.
 */
const noop = () => {}

module.exports = {
	setupDevtoolsPlugin: noop,
	createDevtoolsHook: () => ({ on: noop, emit: noop, once: noop, off: noop }),
	devtools: undefined,
	getDevtoolsGlobalHook: () => undefined,
	isInBrowser: false,
}
