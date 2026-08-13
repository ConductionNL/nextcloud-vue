/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * REAL-RENDER SMOKE SWEEP — every `Cn*` export, mounted against the real
 * `@nextcloud/vue` tree, asserted to render without throwing and without a
 * single Vue warning.
 *
 * WHY THIS LANE EXISTS. `npm test` maps `@nextcloud/vue` to a generic
 * `<div class="stub">` (see `tests/__mocks__/nextcloud-vue.js`). That is the
 * right call for behavioural specs — but it means the entire main suite is
 * structurally incapable of seeing an `@nextcloud/vue` API contract being
 * broken, because the stub accepts any prop, emits nothing, and validates
 * nothing. On a library that just moved Vue 2 -> Vue 3 and
 * `@nextcloud/vue` 8 -> 9, that is the single largest blind spot there is:
 * `type=` -> `variant=`, `:value` -> `:model-value`, `$listeners`,
 * `$scopedSlots`, `$set` and `_uid` all fail SILENTLY under a permissive stub
 * and loudly against the real component.
 *
 * It is also the only lane with breadth. 122 of the 250 components had no spec
 * of any kind when this was written, so for half the library the question "does
 * it even render?" had never been asked by anything.
 *
 * WHAT COUNTS AS FAILURE: a throw during mount or unmount, or any
 * `console.warn`/`console.error` that is not harness noise (see
 * `IGNORE_PATTERNS` in `support/sweep.js`). Warnings are failures on purpose —
 * in Vue 3 a warning is precisely how a removed Vue 2 API or a bad prop
 * announces itself, so treating warnings as cosmetic would give the lane away.
 *
 * WHAT THIS DOES *NOT* CHECK: correctness. It mounts with minimal synthesised
 * props and asserts nothing about output. A component can pass here and still
 * be wrong. Behaviour belongs in `tests/components/`, ARIA in `tests/a11y/`,
 * real layout and paint in the Playwright lane.
 *
 * THE BASELINE. `tests/smoke/.smoke-baseline.json` lists components that are
 * known to fail today, so the lane could land as a gate before every existing
 * defect was fixed — the same pattern as `scripts/.jsdoc-baselines.json`. It
 * ratchets in both directions: a component that starts failing without being
 * baselined fails the run, AND a baselined component that starts passing ALSO
 * fails the run, with an instruction to remove it. Without that second half a
 * baseline silently becomes a permanent exemption list.
 *
 * Regenerate with `npm run smoke-baseline:update` after a deliberate change.
 */

const fs = require('fs')
const path = require('path')
const { mountOnce, componentExports } = require('./support/sweep.js')
const realNc = require('../support/realNextcloudVue.js')

const barrel = require('../../src/index.js')
const components = componentExports(barrel)

const BASELINE_PATH = path.join(__dirname, '.smoke-baseline.json')
const baseline = fs.existsSync(BASELINE_PATH)
	? JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))
	: { knownFailing: {} }
const known = baseline.knownFailing || {}

/**
 * Components that mounted without error but produced NO markup — collected
 * across the sweep and reported at the end. See `mountOnce`'s docblock: an
 * empty render is a pass, but a weak one, and the count is the honest measure
 * of how much of the library this lane actually exercised.
 */
const renderedEmpty = []

describe('real-render smoke sweep', () => {
	it('has components to sweep', () => {
		// Guards the whole lane against silently becoming a no-op: if the barrel
		// stops exporting components (a bad refactor, a broken build) every
		// it.each below would simply not run, and the suite would pass with zero
		// assertions.
		expect(components.length).toBeGreaterThan(200)
	})

	it.each(components)('%s mounts and renders clean', async (name, Component) => {
		const { ok, messages, threw, empty } = await mountOnce(name, Component)
		const isKnown = Object.prototype.hasOwnProperty.call(known, name)

		if (empty) renderedEmpty.push(name)

		if (ok && isKnown) {
			throw new Error(
				name + ' now renders clean but is still listed in '
				+ 'tests/smoke/.smoke-baseline.json.\n'
				+ 'Remove the entry (or run `npm run smoke-baseline:update`) so the '
				+ 'baseline keeps shrinking.\nBaselined reason was: ' + known[name],
			)
		}

		if (ok || isKnown) {
			return
		}

		const detail = threw ? 'threw: ' + threw : 'warned: ' + messages.join(' | ')
		throw new Error(
			name + ' did not render clean.\n  ' + detail + '\n\n'
			+ 'If this is a real defect, fix the component. If it is a harness gap '
			+ 'that affects every component, add a pattern to IGNORE_PATTERNS in '
			+ 'tests/smoke/support/sweep.js. Do NOT add it to the baseline unless '
			+ 'you are deliberately deferring a known component defect.',
		)
	})

	it('reports which @nextcloud/vue components are real vs stubbed', () => {
		// Printed rather than asserted: the point is that the stubbed set is
		// never invisible. A lane that quietly stubs half of @nextcloud/vue
		// looks exactly as green as one that stubs none of it.
		const real = realNc.__cnRealNames || []
		const stubbed = realNc.__cnStubbedNames || []
		process.stdout.write(
			'\n[smoke] @nextcloud/vue: ' + real.length + ' real, '
			+ stubbed.length + ' stubbed (' + stubbed.join(', ') + ')\n'
			+ '[smoke] components swept: ' + components.length
			+ ', baselined as known-failing: ' + Object.keys(known).length + '\n'
			+ '[smoke] rendered EMPTY under minimal props (mounted clean, but'
			+ ' internals not exercised): ' + renderedEmpty.length + '\n'
			+ (renderedEmpty.length ? '          ' + renderedEmpty.join(', ') + '\n' : ''),
		)
		expect(real.length).toBeGreaterThan(stubbed.length)
	})
})
