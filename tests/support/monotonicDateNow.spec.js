/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The monotonic `Date.now()` shim, and the Vue behaviour it exists to protect.
 *
 * The second test is the one that matters: it drives a real component through
 * Vue Test Utils while the clock underneath the shim steps backwards, which is
 * what this workspace's wall clock does under load. Without the shim Vue drops
 * the dispatched event before the handler runs and the component does not
 * react, which is nextcloud-vue#1102.
 *
 * The clock is shifted UNDER the shim, through `__setClockSourceForTests`,
 * rather than by stubbing `Date.now` in the spec. A stub written over
 * `Date.now` would REPLACE the shim instead of exercising it, so the test
 * would fail in exactly the same way whether the shim were installed or not,
 * and would prove nothing about it.
 */

import { mount } from '@vue/test-utils'
import { monotonicNow, __setClockSourceForTests } from './monotonicDateNow.js'

/** Smallest thing that reads a DOM event back into component state. */
const Typeable = {
	name: 'Typeable',
	data() {
		return { draft: '' }
	},
	template: '<input :value="draft" @input="draft = $event.target.value">',
}

describe('monotonic Date.now()', () => {
	it('never returns a lower value than it already returned', () => {
		const first = monotonicNow()
		// A step back of 5 seconds, an order of magnitude past the worst step
		// measured here (671 ms), so the assertion is not a coin flip.
		const restore = __setClockSourceForTests((realNow) => realNow - 5000)
		try {
			expect(monotonicNow()).toBeGreaterThanOrEqual(first)
		} finally {
			restore()
		}
	})

	it('lets the real clock through while it is moving forward', () => {
		// Read the baseline before the shift, because `Date.now()` IS the shim
		// here and would otherwise come back shifted too.
		const before = monotonicNow()
		const restore = __setClockSourceForTests((realNow) => realNow + 60000)
		try {
			// A floor, not an offset: a reading ahead of the ceiling is handed
			// back untouched, so the shim does not freeze or lag the clock.
			expect(monotonicNow()).toBeGreaterThanOrEqual(before + 59000)
		} finally {
			restore()
		}
	})

	it('keeps a triggered DOM event reaching its handler when the clock steps back', async () => {
		// Without this the test is hollow: shifting the source proves nothing
		// unless the shim is the clock Vue actually reads, and if the install
		// call in `tests/setup.js` were dropped the backwards step below would
		// never reach Vue at all, so the assertion would pass while the flake
		// was back.
		expect(Date.now).toBe(monotonicNow)

		const wrapper = mount(Typeable)

		// Vue stamped the input's listener with the clock at mount. Step the
		// clock back further than the gap between that mount and the trigger
		// below, which is what makes Vue's `_vts <= invoker.attached` guard
		// treat the event as older than its own listener and return early.
		const restore = __setClockSourceForTests((realNow) => realNow - 5000)
		try {
			const input = wrapper.find('input')
			input.element.value = 'Sweet cow'
			await input.trigger('input')
		} finally {
			restore()
		}

		expect(wrapper.vm.draft).toBe('Sweet cow')
	})
})
