/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnEditPagesModal — verifies the in-place edits to the working
 * manifest's `pages[]`: add, remove, reorder, and type selection. @nextcloud/vue
 * is auto-stubbed via tests/__mocks__/nextcloud-vue.js.
 */
import { mount } from '@vue/test-utils'
import CnEditPagesModal from '../../src/modals/CnEditPagesModal.vue'

function mountModal(working) {
	return mount(CnEditPagesModal, { propsData: { working } })
}

describe('CnEditPagesModal', () => {
	it('exposes the working manifest pages and normalises a missing array', () => {
		const working = {}
		const wrapper = mountModal(working)
		expect(wrapper.vm.pages).toEqual([])
		expect(Array.isArray(working.pages)).toBe(true)
	})

	it('add appends a blank page with a unique stable id', () => {
		const working = { pages: [{ id: 'page-1', route: '/a', type: 'index', title: 'A' }] }
		const wrapper = mountModal(working)
		wrapper.vm.add()
		expect(working.pages.length).toBe(2)
		const added = working.pages[1]
		expect(added.id).toBe('page-2')
		expect(added.route).toBe('/page-2')
		expect(added.type).toBe('custom')
	})

	it('remove splices the page at the index', () => {
		const working = { pages: [{ id: 'a' }, { id: 'b' }] }
		const wrapper = mountModal(working)
		wrapper.vm.remove(0)
		expect(working.pages.map((p) => p.id)).toEqual(['b'])
	})

	it('move reorders within the pages list', () => {
		const working = { pages: [{ id: 'a' }, { id: 'b' }] }
		const wrapper = mountModal(working)
		wrapper.vm.move(0, 1)
		expect(working.pages.map((p) => p.id)).toEqual(['b', 'a'])
		// out-of-range is a no-op
		wrapper.vm.move(1, 1)
		expect(working.pages.map((p) => p.id)).toEqual(['b', 'a'])
	})

	it('selectedType resolves a known type and falls back for custom values', () => {
		const wrapper = mountModal({ pages: [] })
		expect(wrapper.vm.selectedType({ type: 'dashboard' }).label).toBe('Dashboard')
		expect(wrapper.vm.selectedType({ type: 'weird' })).toEqual({ value: 'weird', label: 'weird' })
		expect(wrapper.vm.selectedType({}).value).toBe('custom')
	})

	it('setType writes the chosen type onto the page in place', () => {
		const page = { id: 'a', type: 'index' }
		const wrapper = mountModal({ pages: [page] })
		wrapper.vm.setType(page, { value: 'dashboard', label: 'Dashboard' })
		expect(page.type).toBe('dashboard')
		wrapper.vm.setType(page, null)
		expect(page.type).toBe('custom')
	})
})
