/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnPagination — regression cover for the page-size control's DOM id.
 *
 * WHY THIS FILE EXISTS AND WHY IT IS NOT LEFT TO check:smoke. The id used to be
 * built from `this._uid`, a Vue 2 internal Vue 3 removed, so it rendered as the
 * literal `cn-page-size-undefined` for every instance on the page — breaking the
 * `<label for>` pairing and duplicating ids.
 *
 * The real-render smoke lane cannot catch it. CnPagination's root carries
 * `v-if="totalPages > 1 || totalItems > minItemsToShow"`, so under the minimal
 * props that lane mounts with, the component renders NOTHING and the computed is
 * never evaluated — the defect only surfaced there indirectly, via
 * CnAddWidgetModal rendering CnIconBrowser. A component whose interesting markup
 * is behind a prop threshold needs its own spec that crosses the threshold.
 */

import { mount } from '@vue/test-utils'
import CnPagination from '../../src/components/CnPagination/CnPagination.vue'

/**
 * Mount with enough items that the root `v-if` passes and the page-size
 * selector actually renders.
 *
 * @param {object} [props] Extra props to merge.
 * @return {object} The wrapper.
 */
function mountPaginated(props = {}) {
	return mount(CnPagination, {
		propsData: {
			currentPage: 1,
			totalPages: 5,
			totalItems: 100,
			currentPageSize: 20,
			...props,
		},
	})
}

describe('CnPagination — page-size control id', () => {
	it('renders a concrete id, never the string "undefined"', () => {
		const wrapper = mountPaginated()
		const label = wrapper.find('label')

		expect(label.exists()).toBe(true)
		const forAttr = label.attributes('for')
		expect(typeof forAttr).toBe('string')
		expect(forAttr).toMatch(/^cn-page-size-/)
		// The precise failure mode of the Vue 2 `_uid` leftover.
		expect(forAttr).not.toContain('undefined')
	})

	it('gives two instances on the same page DIFFERENT ids', () => {
		// The point of the id: two paginators in one view must not both claim
		// `cn-page-size-undefined`, or the first <label> captures the second's
		// input and assistive tech announces the wrong control.
		const a = mountPaginated()
		const b = mountPaginated()

		const idA = a.find('label').attributes('for')
		const idB = b.find('label').attributes('for')

		expect(idA).toBeTruthy()
		expect(idB).toBeTruthy()
		expect(idA).not.toBe(idB)
	})

	it('keeps the id stable across a re-render', async () => {
		// `nextUid()` is called from data(), not a computed, precisely so this
		// holds — an id that changed between renders would break the `for`
		// reference it exists to establish.
		const wrapper = mountPaginated()
		const before = wrapper.find('label').attributes('for')

		await wrapper.setProps({ currentPage: 3 })

		expect(wrapper.find('label').attributes('for')).toBe(before)
	})
})
