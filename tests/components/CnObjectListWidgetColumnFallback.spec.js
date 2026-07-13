/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectListWidget's column fallback.
 *
 * The Add Widget registry defaults an object-list to `columns: [{ key: 'title' }]`,
 * but most schemas have no `title` — a Barn has `name`. Such a widget rendered a
 * full table of em-dashes with no hint that the column key was simply wrong.
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

function mountWidget(propsData = {}) {
	return shallowMount(CnObjectListWidget, {
		propsData,
		stubs: { CnDataTable: true, CnFormDialog: true },
		mocks: { t: (_app, s) => s },
	})
}

describe('CnObjectListWidget — column fallback', () => {
	it('falls back to the object’s own fields when no configured column exists on the data', async () => {
		const w = mountWidget({ content: { register: 'r', schema: 'barn', columns: [{ key: 'title', label: 'Title' }] } })
		w.vm.rows = [{ id: '1', name: 'De Grote Schuur', cows: ['uuid-a'], '@self': { uuid: '1' } }]
		await w.vm.$nextTick()

		const keys = w.vm.resolvedColumns.map((c) => c.key)
		expect(keys).toContain('name')
		expect(keys).toContain('cows')
		expect(keys).not.toContain('title')
	})

	it('drops OpenRegister internals from the derived columns', async () => {
		const w = mountWidget({ content: { register: 'r', schema: 'barn', columns: [{ key: 'title' }] } })
		w.vm.rows = [{ id: '1', '@self': { uuid: '1' }, _deleted: null, name: 'Barn' }]
		await w.vm.$nextTick()

		const keys = w.vm.resolvedColumns.map((c) => c.key)
		expect(keys).toEqual(['name'])
	})

	it('keeps a configured column set that partly matches — an empty column is a valid choice', async () => {
		const w = mountWidget({ content: { register: 'r', schema: 'cow', columns: [{ key: 'name' }, { key: 'barn' }] } })
		// `barn` is unset on every loaded row, but `name` matches: the user configured
		// these columns deliberately, and a column that is empty today is not a bug.
		w.vm.rows = [{ id: '1', name: 'Betty' }]
		await w.vm.$nextTick()

		expect(w.vm.resolvedColumns.map((c) => c.key)).toEqual(['name', 'barn'])
	})

	it('leaves the configured columns alone while no rows have loaded', async () => {
		const w = mountWidget({ content: { register: 'r', schema: 'barn', columns: [{ key: 'title' }] } })
		w.vm.rows = []
		await w.vm.$nextTick()

		expect(w.vm.resolvedColumns.map((c) => c.key)).toEqual(['title'])
	})
})
