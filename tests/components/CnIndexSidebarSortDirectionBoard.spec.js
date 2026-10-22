/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Board DqZakenSorteren draws the sort direction in the index sidebar as two
 * segments, "Oplopend" and "Aflopend" with an arrow each, under a "Richting"
 * heading. The Nextcloud look keeps its two radios.
 *
 * @spec openspec/changes/sidebar-sort-direction-segmented/specs/index-sidebar/spec.md#requirement-the-board-look-draws-the-sort-direction-as-two-segments
 */

import { mount } from '@vue/test-utils'
import CnIndexSidebar from '../../src/components/CnIndexSidebar/CnIndexSidebar.vue'

const options = [
	{ value: 'title', label: 'Title', keys: [{ key: 'title', order: 'asc' }] },
	{ value: 'deadline', label: 'Deadline', keys: [{ key: 'deadline', order: 'asc' }] },
	{ value: 'urgency', label: 'Urgency', keys: [], fixed: true },
]

/**
 * @param {object} props Extra props.
 * @param {string} look The provided look.
 * @return {object} The wrapper.
 */
function mountSidebar(props, look) {
	return mount(CnIndexSidebar, {
		props: { open: true, sortOptions: options, ...props },
		global: {
			provide: { cnLook: look },
			stubs: {
				NcAppSidebar: { template: '<div><slot /></div>' },
				NcAppSidebarTab: { template: '<div><slot /></div>' },
				NcSelect: true,
				NcCheckboxRadioSwitch: { name: 'NcCheckboxRadioSwitch', props: ['modelValue', 'value', 'type'], template: '<label class="radio"><slot /></label>' },
			},
		},
	})
}

describe('the sort direction on the board look', () => {
	it('draws two segments under a Direction heading, the current direction checked', () => {
		const w = mountSidebar({ currentSort: [{ key: 'deadline', order: 'desc' }] }, 'board')
		const segments = w.find('[data-testid="cn-index-sidebar-sort-direction-segments"]')
		expect(segments.exists()).toBe(true)
		const buttons = segments.findAll('button')
		expect(buttons.map((b) => b.text())).toEqual(['Ascending', 'Descending'])
		expect(buttons.map((b) => b.attributes('aria-checked'))).toEqual(['false', 'true'])
		expect(buttons.every((b) => b.find('svg, .material-design-icon').exists())).toBe(true)
		const heading = w.find('.cn-index-sidebar__sort-direction-label')
		expect(heading.text()).toBe('Direction')
		expect(segments.attributes('aria-labelledby')).toBe(heading.attributes('id'))
		expect(w.findAllComponents({ name: 'NcCheckboxRadioSwitch' })).toHaveLength(0)
	})

	it('emits the order in the picked direction', async () => {
		const w = mountSidebar({ currentSort: [{ key: 'deadline', order: 'desc' }] }, 'board')
		await w.findAll('[data-testid="cn-index-sidebar-sort-direction-segments"] button')[0].trigger('click')
		expect(w.emitted('sort-change').at(-1)[0]).toEqual([{ key: 'deadline', order: 'asc' }])
	})

	it('disables both segments on an order of its own', () => {
		const w = mountSidebar({ currentSortValue: 'urgency', currentSort: [] }, 'board')
		const buttons = w.findAll('[data-testid="cn-index-sidebar-sort-direction-segments"] button')
		expect(buttons.every((b) => b.attributes('disabled') !== undefined)).toBe(true)
	})

	it('keeps the radios on the Nextcloud look', () => {
		const w = mountSidebar({ currentSort: [{ key: 'deadline', order: 'asc' }] }, 'nextcloud')
		expect(w.find('[data-testid="cn-index-sidebar-sort-direction-segments"]').exists()).toBe(false)
		expect(w.findAllComponents({ name: 'NcCheckboxRadioSwitch' })).toHaveLength(2)
	})
})
