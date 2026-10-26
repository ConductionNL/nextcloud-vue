/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Board DqZakenSorteren draws the side panel's filters as checkbox lists: per
 * field a legend and one row per value with its count on the right ("Woo en
 * informatie 19"), and "Alles wissen" beside the Filters heading. Live drew a
 * picker per field. A field with more values than fit a short list keeps its
 * picker; the Nextcloud look keeps its pickers.
 *
 * @spec openspec/changes/board-sidebar-filters-as-checkbox-lists/specs/index-sidebar/spec.md#requirement-the-board-look-draws-a-short-filter-as-a-checkbox-list-with-counts
 */
import { mount } from '@vue/test-utils'
import CnIndexSidebar from '../../src/components/CnIndexSidebar/CnIndexSidebar.vue'

const schema = {
	properties: {
		assignedGroup: { type: 'string', title: 'Team', facetable: true },
		status: { type: 'string', title: 'Status', facetable: true },
	},
}
const facetData = {
	assignedGroup: { values: [{ value: 'woo', label: 'Woo en informatie', count: 19 }, { value: 'verg', label: 'Vergunningen', count: 12 }] },
	status: { values: Array.from({ length: 20 }, (_, i) => ({ value: `s${i}`, label: `Status ${i}`, count: i })) },
}

/**
 * @param {string} look The provided look.
 * @param {object} [props] Extra props.
 * @return {object} The wrapper.
 */
function mountSidebar(look, props = {}) {
	return mount(CnIndexSidebar, {
		props: { open: true, schema, facetData, activeFilters: { assignedGroup: ['woo'] }, ...props },
		global: {
			provide: { cnLook: look },
			stubs: { NcAppSidebar: { template: '<div><slot /></div>' }, NcAppSidebarTab: { template: '<div><slot /></div>' }, NcSelect: { name: 'NcSelect', props: ['inputLabel'], template: '<div class="select" :data-label="inputLabel" />' }, NcTextField: true, NcCheckboxRadioSwitch: true },
		},
	})
}

describe('the board look\'s filter checklists', () => {
	it('draws a short field as checkbox rows with counts, checked as active', () => {
		const w = mountSidebar('board')
		const list = w.find('[data-testid="cn-index-sidebar-checklist-assignedGroup"]')
		expect(list.exists()).toBe(true)
		expect(list.find('legend').text()).toBe('Team')
		const rows = list.findAll('[data-testid="cn-index-sidebar-checklist-row"]')
		expect(rows.map((r) => [r.find('.cn-index-sidebar__checklist-label').text(), r.find('.cn-index-sidebar__checklist-count').text(), r.find('input').element.checked])).toEqual([
			['Woo en informatie', '19', true],
			['Vergunningen', '12', false],
		])
	})

	it('emits the field\'s new values when a row is toggled', async () => {
		const w = mountSidebar('board')
		const inputs = w.findAll('[data-testid="cn-index-sidebar-checklist-assignedGroup"] input')
		await inputs[1].setValue(true)
		expect(w.emitted('filter-change').at(-1)[0]).toEqual({ key: 'assignedGroup', values: ['woo', 'verg'] })
		await inputs[0].setValue(false)
		expect(w.emitted('filter-change').at(-1)[0]).toEqual({ key: 'assignedGroup', values: [] })
	})

	it('keeps a picker for a field with many values', () => {
		const w = mountSidebar('board')
		expect(w.find('[data-testid="cn-index-sidebar-checklist-status"]').exists()).toBe(false)
		expect(w.findAll('.select').map((s) => s.attributes('data-label'))).toEqual(['Status'])
	})

	it('puts Clear all beside the Filters heading', () => {
		const w = mountSidebar('board')
		const head = w.find('[data-testid="cn-index-sidebar-filters-head"]')
		expect(head.exists()).toBe(true)
		expect(head.find('button').text()).toBe('Clear all')
	})

	it('keeps the pickers in the Nextcloud look', () => {
		const w = mountSidebar('nextcloud')
		expect(w.find('[data-testid="cn-index-sidebar-checklist-assignedGroup"]').exists()).toBe(false)
		expect(w.findAll('.select')).toHaveLength(2)
	})
})
