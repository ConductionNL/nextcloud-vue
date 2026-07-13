/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectListWidget's column fallback.
 *
 * The Add Widget registry defaults an object-list to `columns: [{ key: 'title' }]`,
 * but most schemas have no `title` — a Barn has `name`. Such a widget rendered a full
 * table of em-dashes with no hint that the column key was simply wrong.
 *
 * The fallback does NOT guess from the data — OpenRegister already derives a display
 * name for every object and publishes it as `@self.name`. So when no configured column
 * resolves, the widget falls back to a single `name` column, which CnDataTable resolves
 * against `@self` for any schema.
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
	it('falls back to the backend display name when no configured column exists on the data', async () => {
		const w = mountWidget({ content: { register: 'r', schema: 'barn', columns: [{ key: 'title', label: 'Title' }] } })
		w.vm.rows = [{ id: '1', name: 'De Grote Schuur', cows: ['uuid-a'], '@self': { uuid: '1', name: 'De Grote Schuur' } }]
		await w.vm.$nextTick()

		expect(w.vm.resolvedColumns.map((c) => c.key)).toEqual(['name'])
	})

	it('resolves the name column from @self on a schema with no top-level name', async () => {
		const w = mountWidget({ content: { register: 'r', schema: 'thing', columns: [{ key: 'title' }] } })
		// The object carries its name only on the envelope — exactly what OpenRegister
		// returns for a schema whose display property is not literally `name`.
		w.vm.rows = [{ id: '1', reference: 'REF-7', '@self': { uuid: '1', name: 'Case REF-7' } }]
		await w.vm.$nextTick()

		expect(w.vm.resolvedColumns.map((c) => c.key)).toEqual(['name'])
		// The configured `title` genuinely resolves to nothing, so the fallback fires...
		expect(w.vm.rows.some((r) => r.title !== undefined || r['@self'].title !== undefined)).toBe(false)
	})

	it('keeps a configured column set that partly matches — an empty column is a valid choice', async () => {
		const w = mountWidget({ content: { register: 'r', schema: 'cow', columns: [{ key: 'name' }, { key: 'barn' }] } })
		// `barn` is unset on every loaded row, but `name` matches: the user configured
		// these columns deliberately, and a column that is empty today is not a bug.
		w.vm.rows = [{ id: '1', name: 'Betty' }]
		await w.vm.$nextTick()

		expect(w.vm.resolvedColumns.map((c) => c.key)).toEqual(['name', 'barn'])
	})

	it('treats a column that resolves only via @self as a match, not a miss', async () => {
		const w = mountWidget({ content: { register: 'r', schema: 'barn', columns: [{ key: 'owner' }] } })
		// `owner` lives on the envelope; it must count as resolving, so the fallback
		// does NOT fire and the user's configured column is preserved.
		w.vm.rows = [{ id: '1', '@self': { uuid: '1', owner: 'admin', name: 'Barn' } }]
		await w.vm.$nextTick()

		expect(w.vm.resolvedColumns.map((c) => c.key)).toEqual(['owner'])
	})

	it('leaves the configured columns alone while no rows have loaded', async () => {
		const w = mountWidget({ content: { register: 'r', schema: 'barn', columns: [{ key: 'title' }] } })
		w.vm.rows = []
		await w.vm.$nextTick()

		expect(w.vm.resolvedColumns.map((c) => c.key)).toEqual(['title'])
	})
})
