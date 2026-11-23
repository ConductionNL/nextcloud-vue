/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A column can show row actions as inline buttons (table-actions-column):
 * DqPostvak's "Aan zaak koppelen" and "Nieuwe zaak" on every message. The
 * buttons are the page's own row actions, named by id.
 *
 * @spec openspec/changes/table-actions-column/specs/index-page/spec.md#requirement-a-column-can-show-row-actions-as-buttons
 */
import { mount, shallowMount } from '@vue/test-utils'
import CnCellRenderer from '../../src/components/CnCellRenderer/CnCellRenderer.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const ROW = { id: 'm1', subject: 'Vraag over mijn kapvergunning', match: '2026-0079' }

describe('CnCellRenderer actions widget', () => {
	it('draws a button per item and runs a click through the page without bubbling', async () => {
		const run = jest.fn()
		const w = mount(CnCellRenderer, {
			props: { value: null, widget: 'actions', row: ROW, widgetProps: { items: (row) => [{ key: 'link', label: `Koppel ${row.id}` }, { key: 'new', label: 'Nieuwe zaak', variant: 'tertiary' }], run } },
		})
		const buttons = w.findAll('[data-testid^="cn-cell-action-"]')
		expect(buttons.map((b) => b.text())).toEqual(['Koppel m1', 'Nieuwe zaak'])
		await buttons[0].trigger('click')
		expect(run).toHaveBeenCalledWith('link', ROW)
	})
})

describe('CnIndexPage actions column', () => {
	const link = jest.fn()
	const ACTIONS = [
		{ id: 'link-case', label: 'Aan zaak koppelen', handler: link },
		{ id: 'new-case', label: 'Nieuwe zaak' },
		{ id: 'archive', label: 'Archiveren', visible: (row) => row.match === 'none' },
	]

	function mountPage() {
		return shallowMount(CnIndexPage, {
			props: {
				title: 'Postvak',
				schema: { title: 'Bericht', properties: {} },
				objects: [ROW],
				actions: ACTIONS,
				columns: [{ key: 'subject', label: 'Bericht' }, { key: 'do', label: 'Doen', widget: 'actions', widgetProps: { actions: ['link-case', 'new-case', 'archive'] } }],
			},
			global: { mocks: { $router: { push: jest.fn() }, $route: { query: {}, params: {}, name: 'Postvak' } } },
		})
	}

	it('resolves the named row actions visible for the row, in order, unsortable', () => {
		const w = mountPage()
		const col = w.vm.renderedColumns.find((c) => c.key === 'do')
		expect(col.sortable).toBe(false)
		expect(col.widgetProps.items(ROW).map((item) => item.label)).toEqual(['Aan zaak koppelen', 'Nieuwe zaak'])
	})

	it('keeps the actions the column shows out of the row menu, and drops the menu when none are left', () => {
		const builtinsOff = { showViewAction: false, showEditAction: false, showCopyAction: false, showDeleteAction: false }
		const w = mountPage()
		expect(w.vm.rowMenuActionsFor(ROW).map((a) => a.id)).not.toEqual(expect.arrayContaining(['link-case']))
		expect(w.vm.rowMenuActionsFor(ROW).map((a) => a.id)).not.toContain('new-case')
		const only = shallowMount(CnIndexPage, {
			props: {
				title: 'Postvak',
				schema: { title: 'Bericht', properties: {} },
				objects: [ROW],
				actions: ACTIONS,
				columns: [{ key: 'do', label: 'Doen', widget: 'actions', widgetProps: { actions: ['link-case', 'new-case', 'archive'] } }],
				...builtinsOff,
			},
			global: { mocks: { $router: { push: jest.fn() }, $route: { query: {}, params: {}, name: 'Postvak' } } },
		})
		expect(only.vm.rowMenuActionsFor(ROW)).toEqual([])
		expect(only.vm.hasRowActions).toBeFalsy()
		const other = shallowMount(CnIndexPage, {
			props: {
				...builtinsOff,
				title: 'Postvak',
				schema: { title: 'Bericht', properties: {} },
				objects: [ROW],
				actions: [...ACTIONS, { id: 'spam', label: 'Spam' }],
				columns: [{ key: 'do', label: 'Doen', widget: 'actions', widgetProps: { actions: ['link-case', 'new-case'] } }],
			},
			global: { mocks: { $router: { push: jest.fn() }, $route: { query: {}, params: {}, name: 'Postvak' } } },
		})
		expect(other.vm.rowMenuActionsFor({ ...ROW, match: 'none' }).map((a) => a.id)).toEqual(['archive', 'spam'])
		expect(other.vm.hasRowActions).toBeTruthy()
	})

	it('runs the handler and emits the same action event a row menu entry does', () => {
		const w = mountPage()
		const col = w.vm.renderedColumns.find((c) => c.key === 'do')
		col.widgetProps.run('link-case', ROW)
		expect(link).toHaveBeenCalledWith(ROW)
		expect(w.emitted('action')[0][0]).toMatchObject({ action: 'Aan zaak koppelen', id: 'link-case', row: ROW })
	})
})
