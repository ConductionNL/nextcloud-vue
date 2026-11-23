/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnSelectionScope: which "all" a selection holds. The assertions are about the
 * SENTENCE and about widening being a SEPARATE act: a correct payload behind a
 * sentence that says the wrong number is exactly the failure this prevents.
 *
 * @spec openspec/changes/dq-abstract-forms/specs/bulk-job-progress/spec.md
 */
import { mount } from '@vue/test-utils'
import CnSelectionScope, { canOfferWholeResult } from '../../src/components/CnSelectionScope/CnSelectionScope.vue'

/**
 * @param {object} props The props.
 * @return {import('@vue/test-utils').VueWrapper} The wrapper.
 */
function mountScope(props) {
	return mount(CnSelectionScope, { props })
}

describe('canOfferWholeResult', () => {
	it('offers the whole result when there is more of it than the page', () => {
		expect(canOfferWholeResult({ pageCount: 25, total: 400 })).toBe(true)
	})

	it('withholds the offer when the total is unknown', () => {
		expect(canOfferWholeResult({ pageCount: 25, total: 0 })).toBe(false)
		expect(canOfferWholeResult({ pageCount: 25 })).toBe(false)
		expect(canOfferWholeResult({ pageCount: 25, total: NaN })).toBe(false)
	})

	it('withholds the offer when the page already is the whole result', () => {
		expect(canOfferWholeResult({ pageCount: 25, total: 25 })).toBe(false)
	})
})

describe('CnSelectionScope', () => {
	it('states the number and the scope, and offers the whole result separately', () => {
		const wrapper = mountScope({ selectedIds: ['a', 'b'], total: 400, scope: 'page' })

		expect(wrapper.get('[data-testid="bulk-selection-sentence"]').text()).toBe('2 items on this page are selected.')
		expect(wrapper.get('[data-testid="bulk-selection-widen"]').text()).toBe('Select all 400 items matching this search')
	})

	it('names the page count, not the total, while the scope is the page', () => {
		const wrapper = mountScope({ selectedIds: ['a', 'b'], total: 400, scope: 'page' })

		expect(wrapper.get('[data-testid="bulk-selection-sentence"]').text()).not.toContain('400')
	})

	it('widening is a second act that the parent has to accept', async () => {
		const wrapper = mountScope({ selectedIds: ['a', 'b'], total: 400, scope: 'page' })
		await wrapper.get('[data-testid="bulk-selection-widen"]').trigger('click')

		expect(wrapper.emitted('update:scope')).toEqual([['result']])
		expect(wrapper.get('[data-testid="bulk-selection-sentence"]').text()).toBe('2 items on this page are selected.')
	})

	it('does not offer the whole result when the total is unknown', () => {
		const wrapper = mountScope({ selectedIds: ['a', 'b'], total: 0, scope: 'page' })

		expect(wrapper.find('[data-testid="bulk-selection-widen"]').exists()).toBe(false)
	})

	it('offers the way back once the whole result is selected', async () => {
		const wrapper = mountScope({ selectedIds: ['a', 'b'], total: 400, scope: 'result' })

		expect(wrapper.get('[data-testid="bulk-selection-sentence"]').text()).toBe('All 400 items matching this search are selected.')
		await wrapper.get('[data-testid="bulk-selection-narrow"]').trigger('click')
		expect(wrapper.emitted('update:scope')).toEqual([['page']])
	})

	it("speaks the host's noun when it passes labels", () => {
		const wrapper = mountScope({
			selectedIds: ['a', 'b'],
			total: 400,
			scope: 'page',
			labels: { page: '{count} cases on this page are selected.', widen: 'Select all {total} cases matching this search' },
		})

		expect(wrapper.get('[data-testid="bulk-selection-sentence"]').text()).toBe('2 cases on this page are selected.')
		expect(wrapper.get('[data-testid="bulk-selection-widen"]').text()).toBe('Select all 400 cases matching this search')
	})
})
