/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * index-sidebar-filter-notes (DqZaken "Nog 18 filters"): a note under a
 * filter (`facetNote`) and an on/off filter as a switch with its own words
 * (`inputControl: "switch"`, "Ook concepten van anderen tonen").
 *
 * @spec openspec/changes/index-sidebar-filter-notes/specs/index-sidebar-filter-notes/spec.md#requirement-a-filter-can-carry-a-note-and-be-a-switch
 */
import { mount } from '@vue/test-utils'
import CnIndexSidebar from '../../src/components/CnIndexSidebar/CnIndexSidebar.vue'
import { filtersFromSchema } from '../../src/utils/schema.js'

const schema = {
	properties: {
		assignedGroup: { type: 'string', title: 'Team', facetable: true, facetNote: 'The team is on the case as a group.' },
		othersDrafts: { type: 'boolean', title: 'Drafts', facetable: true, inputControl: 'switch', switchLabel: 'Also show drafts by others', facetNote: 'Your own drafts always show.' },
	},
}
const SWITCH = { name: 'NcCheckboxRadioSwitch', props: ['modelValue', 'type'], emits: ['update:modelValue'], template: '<label class="switch" :data-on="String(modelValue)" @click="$emit(\'update:modelValue\', !modelValue)"><slot /></label>' }

/**
 * @param {object} activeFilters The active filters.
 * @return {object} The sidebar.
 */
function mountSidebar(activeFilters = {}) {
	return mount(CnIndexSidebar, {
		props: { open: true, schema, facetData: {}, activeFilters },
		global: {
			provide: { cnLook: 'board', cnTranslate: (k) => k },
			stubs: { NcAppSidebar: { template: '<div><slot /></div>' }, NcAppSidebarTab: { template: '<div><slot /></div>' }, NcSelect: { template: '<div class="select" />' }, NcTextField: true, NcCheckboxRadioSwitch: SWITCH },
		},
	})
}

describe('index sidebar filter notes and switch', () => {
	it('filtersFromSchema carries the note and the switch', () => {
		const [team, drafts] = filtersFromSchema(schema)
		expect(team.note).toBe('The team is on the case as a group.')
		expect(drafts).toEqual(expect.objectContaining({ type: 'switch', switchLabel: 'Also show drafts by others', note: 'Your own drafts always show.' }))
	})

	it('draws the note under the filter and the switch with its words', () => {
		const w = mountSidebar()
		expect(w.find('[data-testid="cn-index-sidebar-note-assignedGroup"]').text()).toBe('The team is on the case as a group.')
		const sw = w.find('[data-testid="cn-index-sidebar-switch-othersDrafts"]')
		expect(sw.text()).toBe('Also show drafts by others')
		expect(sw.attributes('data-on')).toBe('false')
	})

	it('switching on filters on true, switching off clears it', async () => {
		const off = mountSidebar()
		await off.find('[data-testid="cn-index-sidebar-switch-othersDrafts"]').trigger('click')
		expect(off.emitted('filter-change').at(-1)[0]).toEqual({ key: 'othersDrafts', values: ['true'] })
		const on = mountSidebar({ othersDrafts: ['true'] })
		expect(on.find('[data-testid="cn-index-sidebar-switch-othersDrafts"]').attributes('data-on')).toBe('true')
		await on.find('[data-testid="cn-index-sidebar-switch-othersDrafts"]').trigger('click')
		expect(on.emitted('filter-change').at(-1)[0]).toEqual({ key: 'othersDrafts', values: [] })
	})
})
