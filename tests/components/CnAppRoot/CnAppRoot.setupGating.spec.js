/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `CnAppRoot.optionalSetupGating` — the server's `completed` flag wins.
 *
 * WHY THIS EXISTS
 * ---------------
 * `optionalSetupGating` decides whether the non-gating setup wizard auto-opens.
 * "Non-gating" describes the PHASE, not the DOM: it still renders a full
 * `dialog__modal modal-mask` over the shell, and its dismissal lives in
 * `localStorage`. Every Playwright test runs in a fresh context, so a
 * permanently-unmet optional step means the wizard covers the app in every
 * single test — and, for real users, on every fresh browser profile forever.
 *
 * Permanently-unmet is not hypothetical: `useSetupStatus` derives the unmet
 * lists from the MANIFEST's step list and looks each id up in the server's
 * `setup/status` response, so any manifest step the server does not report is
 * unmet with no action able to change it. Observed on pipelinq (7 manifest
 * steps, 4 reported) and openbuild (a remote template store nobody configures).
 *
 * These tests pin the guard directly rather than through a mount, because it is
 * a pure predicate over the composable's refs and that is the whole contract.
 */

const CnAppRoot = require('../../../src/components/CnAppRoot/CnAppRoot.vue').default

const { optionalSetupGating, setupGating } = CnAppRoot.computed

/**
 * Build a `this` for the computed with a fake `setupState`.
 *
 * @param {object} o                Options.
 * @param {boolean} o.loading       Whether the status fetch is in flight.
 * @param {boolean} o.completed     The server's authoritative completion flag.
 * @param {Array} o.requiredUnmet   Unmet REQUIRED steps.
 * @param {Array} o.optionalUnmet   Unmet OPTIONAL steps.
 * @return {object} A `this` binding for the computed getters.
 */
function ctx({ loading = false, completed = false, requiredUnmet = [], optionalUnmet = [] } = {}) {
	return {
		setupState: {
			loading: { value: loading },
			completed: { value: completed },
			requiredUnmet: { value: requiredUnmet },
			optionalUnmet: { value: optionalUnmet },
		},
	}
}

describe('CnAppRoot.optionalSetupGating', () => {
	it('offers the wizard when optional steps are unmet and the server has NOT reported completion', () => {
		// Positive control for every negative assertion below: this is the
		// shape that must still open the wizard, so a `false` elsewhere means
		// something, rather than the predicate being false for all inputs.
		expect(optionalSetupGating.call(ctx({
			completed: false,
			optionalUnmet: [{ id: 'store' }],
		}))).toBe(true)
	})

	it('does NOT offer the wizard once the server reports the app set up, even with optional steps unmet', () => {
		// The regression. pipelinq returned `completed: true` from
		// `setup/status` while three manifest step ids it never reports stayed
		// unmet, and the wizard covered the app in all 232 e2e tests.
		expect(optionalSetupGating.call(ctx({
			completed: true,
			optionalUnmet: [{ id: 'demo-data' }],
		}))).toBe(false)
	})

	it('does not offer the wizard while the status fetch is still in flight', () => {
		expect(optionalSetupGating.call(ctx({
			loading: true,
			optionalUnmet: [{ id: 'store' }],
		}))).toBe(false)
	})

	it('does not offer the wizard when nothing optional is unmet', () => {
		expect(optionalSetupGating.call(ctx({ optionalUnmet: [] }))).toBe(false)
	})

	it('does not offer the wizard while a REQUIRED step is unmet — that path gates the shell instead', () => {
		const c = ctx({ requiredUnmet: [{ id: 'currency' }], optionalUnmet: [{ id: 'store' }] })
		expect(optionalSetupGating.call(c)).toBe(false)
		expect(setupGating.call(c)).toBe(true)
	})

	it('is inert for an app that declares no setup block at all', () => {
		expect(optionalSetupGating.call({ setupState: null })).toBe(false)
	})

	it('still gates the shell on an unmet REQUIRED step regardless of the completed flag', () => {
		// `completed` must not become a way to skip REQUIRED setup. The
		// composable already refuses to report completion while a required step
		// is unmet; this pins that the blocking path is untouched here.
		expect(setupGating.call(ctx({
			completed: true,
			requiredUnmet: [{ id: 'currency' }],
		}))).toBe(true)
	})
})
