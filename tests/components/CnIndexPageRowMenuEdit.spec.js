/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A row that opens the detail page offers Edit and not View in its menu.
 *
 * @spec openspec/changes/row-menu-edits-when-the-row-opens-the-detail/specs/index-page/spec.md
 */
import { shallowMount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'
import { withoutViewWhenRowOpensDetail } from '../../src/utils/rowActionAvailability.js'

function mountPage(propsData = {}, attrs = {}, look = 'nextcloud') {
	return shallowMount(CnIndexPage, {
		propsData: { objects: [], schema: { title: 'Case', properties: {} }, ...propsData },
		attrs,
		global: { provide: { cnLook: look } },
	})
}

const ids = (list) => list.map((a) => a.id)

describe('withoutViewWhenRowOpensDetail', () => {
	const list = [
		{ id: 'view', builtin: true },
		{ id: 'edit', builtin: true },
		{ id: 'view', label: 'Own view' },
		{ id: 'open', label: 'Open case' },
	]

	it('drops only the built-in View when the row opens the detail', () => {
		expect(withoutViewWhenRowOpensDetail(list, true)).toEqual([list[1], list[2], list[3]])
	})

	it('returns the list as it is when the row does not open a detail page', () => {
		expect(withoutViewWhenRowOpensDetail(list, false)).toBe(list)
	})
})

describe.each(['nextcloud', 'board'])('CnIndexPage row menu (%s look)', (look) => {
	it('offers Edit and no View when a click on the row opens the detail page', () => {
		const wrapper = mountPage({ rowClickToView: true }, { onRowClick: () => {} }, look)
		const actions = wrapper.vm.rowActionsFor({ id: 'a' })
		expect(ids(actions)).toEqual(['edit', 'copy', 'delete'])
		const edit = actions.find((a) => a.id === 'edit')
		expect(edit.label).toBe('Edit')
		expect(edit.icon).toBeTruthy()
	})

	it('keeps View when the row opens nothing', () => {
		const wrapper = mountPage({ rowClickToView: true }, {}, look)
		expect(ids(wrapper.vm.rowActionsFor({ id: 'a' }))).toEqual(['view', 'edit', 'copy', 'delete'])
	})

	it('keeps View on a row whose viewTo answers null, drops it where it answers', () => {
		const viewTo = (row) => (row.id === 'a' ? { name: 'Case', params: { id: 'a' } } : null)
		const wrapper = mountPage({ rowClickToView: true, viewTo }, { onRowClick: () => {} }, look)
		expect(ids(wrapper.vm.rowActionsFor({ id: 'a' }))).not.toContain('view')
		expect(ids(wrapper.vm.rowActionsFor({ id: 'b' }))).toContain('view')
	})

	it('keeps an action the page declared itself', () => {
		const actions = [{ id: 'open', label: 'Open case', handler: () => {} }, 'builtin:view', 'builtin:edit']
		const wrapper = mountPage({ rowClickToView: true, actions }, { onRowClick: () => {} }, look)
		expect(ids(wrapper.vm.rowActionsFor({ id: 'a' }))).toEqual(expect.arrayContaining(['open', 'edit']))
		expect(ids(wrapper.vm.rowActionsFor({ id: 'a' }))).not.toContain('view')
	})
})
