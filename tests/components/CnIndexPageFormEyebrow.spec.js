/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The built-in Add/Edit form takes an eyebrow and a subtitle from the page
 * (learniq boards draw "Nieuwe cursus" over the title and a muted line under it).
 *
 * @spec openspec/changes/index-form-eyebrow-subtitle/specs/index-page/spec.md
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const CnFormDialogStub = { name: 'CnFormDialog', props: ['eyebrow', 'subtitle', 'item'], template: '<div class="form" />' }

/**
 * @param {object} extra Extra props.
 * @return {object} The mounted page.
 */
function mountPage(extra = {}) {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Courses',
			schema: { title: 'Course', properties: { name: { title: 'Name' } } },
			objects: [{ id: 1, name: 'A' }],
			pagination: { page: 1, pages: 1, total: 1, limit: 20 },
			...extra,
		},
		global: {
			provide: { cnTranslate: (key) => 'T:' + key },
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Courses' } },
			stubs: {
				CnFormDialog: CnFormDialogStub,
				CnActionsBar: true,
				CnSavedViewsControl: true,
				CnBuildiqEditButton: true,
				CnDataTable: true,
				CnCardGrid: true,
				CnPagination: true,
				CnContextMenu: true,
				CnRowActions: true,
				CnIndexSidebar: true,
				CnIcon: true,
			},
		},
	})
}

describe('CnIndexPage form eyebrow and subtitle', () => {
	it('passes one string to both modes, translated', async () => {
		const w = mountPage({ formEyebrow: 'New course', formSubtitle: 'Fill in the basics' })
		w.vm.openFormDialog(null)
		await w.vm.$nextTick()
		const form = w.findComponent({ name: 'CnFormDialog' })
		expect(form.props('eyebrow')).toBe('T:New course')
		expect(form.props('subtitle')).toBe('T:Fill in the basics')
	})

	it('picks the create or edit entry by mode', async () => {
		const w = mountPage({ formEyebrow: { create: 'New course', edit: 'Edit course' } })
		w.vm.openFormDialog(null)
		await w.vm.$nextTick()
		expect(w.findComponent({ name: 'CnFormDialog' }).props('eyebrow')).toBe('T:New course')
		w.vm.closeFormDialog()
		await w.vm.$nextTick()
		w.vm.openFormDialog({ id: 1, name: 'A' })
		await w.vm.$nextTick()
		const form = w.findComponent({ name: 'CnFormDialog' })
		expect(form.props('eyebrow')).toBe('T:Edit course')
		expect(form.props('subtitle')).toBe('')
	})

	it('draws none without the props (control)', async () => {
		const w = mountPage()
		w.vm.openFormDialog(null)
		await w.vm.$nextTick()
		expect(w.findComponent({ name: 'CnFormDialog' }).props('eyebrow')).toBe('')
	})
})
