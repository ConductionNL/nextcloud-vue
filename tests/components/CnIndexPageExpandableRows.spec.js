/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnIndexPage `expandableRows`: the list view draws every row as a
 * CnExpandableRow, the first one open when asked, and a row button runs the
 * row action of that id as its menu entry would.
 *
 * @spec openspec/changes/index-expandable-rows/specs/index-expandable-rows/spec.md
 */
const { mount } = require('@vue/test-utils')
const CnIndexPage = require('../../src/components/CnIndexPage/CnIndexPage.vue').default

const ROWS = [
	{ id: 'p1', title: 'Verkoop', stages: [{ name: 'Nieuw' }] },
	{ id: 'p2', title: 'Vragen', stages: [{ name: 'Nieuw' }] },
]
const LAYOUT = { title: 'title', chips: { field: 'stages', each: 'name' }, table: { field: 'stages', columns: [{ key: 'name', label: 'Stage' }] }, buttons: [{ action: 'edit' }], open: 'first' }

describe('CnIndexPage — expandable rows', () => {
	it('draws each row of the list view as an expandable row, the first open', () => {
		const wrapper = mount(CnIndexPage, {
			props: { objects: ROWS, schema: { title: 'Pipeline', properties: { title: {} } }, viewMode: 'list', viewModes: ['list'], expandableRows: LAYOUT },
			global: { stubs: { CnRowActions: true } },
		})
		const rows = wrapper.findAllComponents({ name: 'CnExpandableRow' })
		expect(rows).toHaveLength(2)
		expect(rows.map((r) => r.props('open'))).toEqual([true, false])
	})

	it('runs the row action a row button names', () => {
		const handler = jest.fn()
		const wrapper = mount(CnIndexPage, {
			props: { objects: ROWS, schema: { title: 'Pipeline', properties: {} }, viewMode: 'list', expandableRows: LAYOUT },
			global: { stubs: { CnRowActions: true } },
		})
		wrapper.vm.rowMenuActionsFor = () => [{ id: 'edit', label: 'Edit', builtin: true, handler }]
		wrapper.vm.onExpandableRowAction({ id: 'edit', row: ROWS[1] })
		expect(handler).toHaveBeenCalledWith(ROWS[1])
		expect(wrapper.emitted('action')[0][0]).toEqual({ action: 'Edit', row: ROWS[1], id: 'edit', builtin: true })
	})

	it('saves a reordered sub-table through the store and emits it', async () => {
		const saveObject = jest.fn().mockResolvedValue({ id: 'p1' })
		const wrapper = mount(CnIndexPage, {
			props: { objects: ROWS, schema: { title: 'Pipeline', properties: {} }, viewMode: 'list', expandableRows: LAYOUT, store: { saveObject }, objectType: 'pipeline' },
			global: { stubs: { CnRowActions: true } },
		})
		const entries = [{ name: 'B', order: 1 }, { name: 'A', order: 2 }]
		await wrapper.vm.onExpandableRowReorder({ row: ROWS[0], field: 'stages', entries })
		expect(saveObject).toHaveBeenCalledWith('pipeline', { ...ROWS[0], stages: entries })
		expect(wrapper.emitted('reorder')[0][0]).toEqual({ row: ROWS[0], field: 'stages', entries })
	})
})

describe('app-manifest-v2 — expandableRows', () => {
	const { validateManifestV2 } = require('../../src/utils/validateManifest.js')
	const manifest = (expandableRows) => ({
		$schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json',
		version: '2.0.0',
		menu: [],
		pages: [{ id: 'Pipelines', route: '/pipelines', type: 'index', title: 'Pipelines', config: { register: 'r', schema: 's', expandableRows } }],
	})

	it('accepts a row layout with chips, a sub-table and buttons', () => {
		const result = validateManifestV2(manifest({ ...LAYOUT, badge: { when: { field: 'isDefault', op: 'eq', value: true }, label: 'Default' }, chips: { field: 'stages', each: 'name', tones: [{ when: { field: 'isWon', op: 'eq', value: true }, variant: 'success' }] } }))
		expect(result.errors).toEqual([])
	})

	it('accepts sort, filter and reorder on the sub-table', () => {
		const result = validateManifestV2(manifest({ title: 'title', table: { field: 'stages', sortable: true, filterable: true, reorder: { key: 'order' }, columns: [{ key: 'name', label: 'Stage', sortable: false, filterable: false }] } }))
		expect(result.errors).toEqual([])
	})

	it('refuses an unknown column kind', () => {
		expect(validateManifestV2(manifest({ title: 'title', table: { field: 'stages', columns: [{ key: 'name', as: 'chart' }] } })).valid).toBe(false)
	})
})
