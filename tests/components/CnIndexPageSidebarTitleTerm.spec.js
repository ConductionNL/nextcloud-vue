/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The side panel's title is the page title as the header shows it: a
 * `{term}` in it is filled ("Zoeken: Lindelaan"), never drawn raw
 * ("Zoeken: {term}", COMPDIFF r22 DqZoekresultaten).
 *
 * @spec openspec/changes/index-sidebar-title-term/specs/index-sidebar-title-term/spec.md
 */

import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const STUBS = { CnDataTable: true, CnCardGrid: true, CnPagination: true, CnActionsBar: true, CnContextMenu: true, CnIndexSidebar: true }

describe('CnIndexPage — the side panel title', () => {
	it('hands the hoisted side panel the title with {term} filled', () => {
		const holder = { value: null }
		mount(CnIndexPage, {
			propsData: { title: 'Search: {term}', schema: { title: 'Result', properties: {} }, objects: [], sidebar: { enabled: true } },
			provide: { cnIndexSidebarConfig: holder, cnHostsIndexSidebar: true },
			stubs: STUBS,
		})
		expect(holder.value.props.title).not.toContain('{term}')
		expect(holder.value.props.title).toBe('Search: ')
	})

	it('hands the inline side panel the title with {term} filled', () => {
		const wrapper = mount(CnIndexPage, {
			propsData: { title: 'Search: {term}', schema: { title: 'Result', properties: {} }, objects: [], sidebar: { enabled: true } },
			stubs: STUBS,
		})
		const sidebar = wrapper.findComponent({ name: 'CnIndexSidebar' })
		expect(sidebar.exists()).toBe(true)
		expect(sidebar.props('title')).toBe('Search: ')
	})

	it('leaves a title without {term} as it is', () => {
		const holder = { value: null }
		mount(CnIndexPage, {
			propsData: { title: 'Decisions', schema: { title: 'Decision', properties: {} }, objects: [], sidebar: { enabled: true } },
			provide: { cnIndexSidebarConfig: holder, cnHostsIndexSidebar: true },
			stubs: STUBS,
		})
		expect(holder.value.props.title).toBe('Decisions')
	})
})
