/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Proof that the deprecated export aliases still resolve.
 *
 * WHY THIS EXISTS
 * ---------------
 * The 2026-08-21 fleet rename turned OpenBuild into Buildiq, and two exports
 * were named after the app: `CnOpenBuildEditButton` and
 * `useOpenBuildEditAvailability`. Roughly eighteen apps import them. Renaming
 * them outright would break every one of those consumers on their next
 * install, so the old names were kept as aliases pointing at the same
 * implementation.
 *
 * An alias is a promise to consumers, and nothing else in this repo checks it.
 * The canonical names are exercised by the components' own tests; the OLD
 * names are exercised by nobody, because no code in this repo calls them any
 * more. That is exactly the shape of a guarantee that quietly stops being
 * true: someone tidies up the "unused" export, every test here still passes,
 * and the breakage lands in eighteen other repositories.
 *
 * HOW IT CANNOT FAKE A PASS
 * -------------------------
 * Identity is asserted, not just presence. `toBe` on the resolved binding
 * means an alias that exists but points at a different (or undefined)
 * implementation fails, which a truthiness check would happily accept.
 */

describe('deprecated aliases kept for consumers', () => {
	const composables = require('../../src/composables/index.js')
	const components = require('../../src/components/index.js')

	it.each([
		['useBuildiqEditAvailability', 'useOpenBuildEditAvailability'],
	])('composables: %s is also exported as %s', (canonical, alias) => {
		expect(typeof composables[canonical]).toBe('function')
		expect(composables[alias]).toBe(composables[canonical])
	})

	// The barrel matters as much as src/index.js: the top-level entrypoint
	// re-exports the alias FROM this barrel, so if only the canonical name
	// lives here the re-export resolves to nothing and the promise to
	// consumers is broken one level down from where it is written.
	it.each([
		['CnBuildiqEditButton', 'CnOpenBuildEditButton'],
	])('components barrel: %s is also exported as %s', (canonical, alias) => {
		expect(components[canonical]).toBeDefined()
		expect(components[alias]).toBe(components[canonical])
	})

	it('fails when an alias is missing rather than passing vacuously', () => {
		// The control: a name that was never exported must be undefined, so a
		// green result above means the alias resolved rather than that the
		// lookup silently yields undefined for everything.
		expect(composables.useNeverExportedAvailability).toBeUndefined()
		expect(components.CnNeverExportedButton).toBeUndefined()
	})
})
