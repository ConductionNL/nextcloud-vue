/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * DqZaken's "Exporteren" opens a menu of formats (CSV, Excel, each with a
 * muted description) and a note under them; the board view of the same page
 * reads "Downloaden" (headerButtonsByView).
 *
 * @spec openspec/changes/index-export-menu/specs/index-header/spec.md
 */
import { mount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const MenuStub = { name: 'CnIndexHeaderMenu', props: ['button', 'entries'], template: '<div class="menu" />' }

const EXPORT = {
	action: 'export',
	label: 'Export',
	menu: [
		{ format: 'csv', label: 'CSV', description: 'this list, with the active filters' },
		{ format: 'excel', label: 'Excel', description: 'same columns, as a workbook' },
		{ format: 'pdf', label: 'PDF' },
	],
	note: 'The platform creates the file, with your rights.',
}

/**
 * @param {object} extra Extra props.
 * @return {object} The mounted page.
 */
function mountPage(extra = {}) {
	return mount(CnIndexPage, {
		propsData: {
			title: 'Cases',
			schema: { title: 'Case', properties: { title: { title: 'Title' } } },
			objects: [{ id: 1 }],
			pagination: { page: 1, pages: 1, total: 1, limit: 20 },
			showTitle: true,
			...extra,
		},
		global: {
			mocks: { $router: { push: jest.fn() }, $route: { query: {}, name: 'Cases' } },
			stubs: {
				CnIndexHeaderMenu: MenuStub,
				CnActionsBar: true,
				CnSavedViewsControl: true,
				CnBuildiqEditButton: true,
				NcButton: { props: ['variant'], emits: ['click'], template: '<button v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>' },
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

describe('CnIndexPage export menu', () => {
	afterEach(() => jest.restoreAllMocks())

	it('draws Export as a menu of the known formats with the note last', () => {
		const w = mountPage({ headerButtons: [EXPORT] })
		const menu = w.findComponent({ name: 'CnIndexHeaderMenu' })
		expect(menu.exists()).toBe(true)
		expect(menu.props('entries').map((e) => [e.label, e.description || '', e.kind || ''])).toEqual([
			['CSV', 'this list, with the active filters', ''],
			['Excel', 'same columns, as a workbook', ''],
			['The platform creates the file, with your rights.', '', 'note'],
		])
		expect(w.find('[data-testid="cn-index-header-button-export"]').exists()).toBe(false)
	})

	it('runs the export in the entry\'s format', () => {
		const spy = jest.spyOn(CnIndexPage.methods, 'onHeaderButton')
		const w = mountPage({ headerButtons: [EXPORT] })
		w.findComponent({ name: 'CnIndexHeaderMenu' }).props('entries')[1].run()
		expect(spy).toHaveBeenCalledWith(expect.objectContaining({ action: 'export', format: 'excel' }))
	})

	it('keeps a plain Export button without menu (control)', () => {
		const w = mountPage({ headerButtons: [{ action: 'export', label: 'Export' }] })
		expect(w.findComponent({ name: 'CnIndexHeaderMenu' }).exists()).toBe(false)
		expect(w.find('[data-testid="cn-index-header-button-export"]').text()).toBe('Export')
	})

	it('takes the buttons of the open view from headerButtonsByView', () => {
		const w = mountPage({
			headerButtons: [EXPORT],
			headerButtonsByView: { cards: [{ action: 'export', label: 'Download' }] },
			viewMode: 'cards',
		})
		expect(w.findComponent({ name: 'CnIndexHeaderMenu' }).exists()).toBe(false)
		expect(w.find('[data-testid="cn-index-header-button-export"]').text()).toBe('Download')
	})
})
