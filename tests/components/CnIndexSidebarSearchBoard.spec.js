/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Board DqZakenSorteren draws the side panel's search as the list's own search
 * field: a magnifier and "Zoek op zaak, nummer of verzoeker". Live drew a field
 * labelled "Zoeken" with no hint. In the board look the field is named by the
 * placeholder and carries the magnifier; the page hands the sidebar its own
 * placeholder unless `sidebar.search` names one.
 *
 * @spec openspec/changes/board-sidebar-search-reads-as-board/specs/index-sidebar/spec.md#requirement-the-board-looks-side-panel-search-is-named-by-the-lists-search-hint
 */
import { mount } from '@vue/test-utils'
import CnIndexSidebar from '../../src/components/CnIndexSidebar/CnIndexSidebar.vue'

const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const NcTextField = { name: 'NcTextField', props: ['modelValue', 'label', 'placeholder'], template: '<div class="text-field" :data-label="label"><slot name="icon" /></div>' }

/**
 * @param {string} look The provided look.
 * @return {object} The wrapper.
 */
function mountSidebar(look) {
	return mount(CnIndexSidebar, {
		props: { open: true, searchPlaceholder: 'Search by case, number or requester' },
		global: {
			provide: { cnLook: look },
			stubs: { NcAppSidebar: { template: '<div><slot /></div>' }, NcAppSidebarTab: { template: '<div><slot /></div>' }, NcTextField, NcSelect: true, NcCheckboxRadioSwitch: true },
		},
	})
}

describe('the side panel search in the board look', () => {
	it('is named by the search hint and carries the magnifier', () => {
		const field = mountSidebar('board').findComponent({ name: 'NcTextField' })
		expect(field.props('label')).toBe('Search by case, number or requester')
		expect(field.find('.material-design-icon, svg').exists()).toBe(true)
	})

	it('keeps the Search label in the Nextcloud look', () => {
		const field = mountSidebar('nextcloud').findComponent({ name: 'NcTextField' })
		expect(field.props('label')).toBe('Search')
		expect(field.find('.material-design-icon, svg').exists()).toBe(false)
	})
})

describe('the page hands the sidebar its search hint', () => {
	it('uses the page\'s placeholder without sidebar.search', () => {
		const props = CnIndexPage.computed.sidebarSearchProps.call({ sidebar: { enabled: true }, shownSearchPlaceholder: 'Search by case' })
		expect(props).toEqual({ searchPlaceholder: 'Search by case' })
	})

	it('lets sidebar.search name its own', () => {
		const props = CnIndexPage.computed.sidebarSearchProps.call({ sidebar: { search: { searchPlaceholder: 'Own' } }, shownSearchPlaceholder: 'Search by case' })
		expect(props.searchPlaceholder).toBe('Own')
	})
})
