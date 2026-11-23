/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/index-column-order-and-pinning/tasks.md#task-4
 */
import { shallowMount } from '@vue/test-utils'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const schema = {
	slug: 'purchase-order',
	title: 'Purchase order',
	properties: {
		number: { type: 'string', title: 'Number' },
		date: { type: 'string', title: 'Date' },
		supplier: { type: 'string', title: 'Supplier' },
		amount: { type: 'number', title: 'Amount' },
	},
}
const PAGE_COLUMNS = ['number', 'date', 'supplier', 'amount']
const KEY = 'columns.purchase-orders'

function fakePreferences(initial = {}) {
	const store = { ...initial }
	return {
		store,
		read: jest.fn(async (key, fallback) => (key in store ? store[key] : fallback)),
		write: jest.fn(async (key, value) => {
			store[key] = value
			return true
		}),
	}
}

function mountPage(prefs, props = {}) {
	return shallowMount(CnIndexPage, {
		props: { schema, columns: PAGE_COLUMNS, objects: [{ id: '1', number: 'PO-1' }], manualOrderId: 'purchase-orders', sidebar: { enabled: true }, ...props },
		global: { provide: { cnUserPreferences: prefs } },
	})
}
const keysOf = (w) => w.vm.tableColumns.map((c) => (typeof c === 'string' ? c : c.key))

describe('CnIndexPage personal columns', () => {
	it('restores a stored layout on mount: order, visibility and pins', async () => {
		const prefs = fakePreferences({ [KEY]: { columns: ['supplier', 'number', 'amount'], pinned: 1 } })
		const w = mountPage(prefs)
		await flush()
		expect(prefs.read).toHaveBeenCalledWith(KEY, null)
		expect(keysOf(w)).toEqual(['supplier', 'number', 'amount'])
		expect(w.vm.pinnedColumnCount).toBe(1)
	})

	it('shows the page\'s own columns, in the page\'s order, to a user with no layout', async () => {
		const w = mountPage(fakePreferences())
		await flush()
		expect(keysOf(w)).toEqual(PAGE_COLUMNS)
		expect(w.vm.pinnedColumnCount).toBe(0)
	})

	it('drops a stored column the schema no longer has, and a new schema column stays hidden', async () => {
		const prefs = fakePreferences({ [KEY]: { columns: ['supplier', 'retired', 'number'], pinned: 0 } })
		const w = mountPage(prefs)
		await flush()
		expect(keysOf(w)).toEqual(['supplier', 'number'])
	})

	it('writes a move and a pin under columns.<list id>', async () => {
		const prefs = fakePreferences()
		const w = mountPage(prefs)
		await flush()
		w.vm.onColumnsReorder(['supplier', 'number', 'date', 'amount'])
		w.vm.onPinChange(1)
		await flush()
		expect(prefs.write).toHaveBeenLastCalledWith(KEY, { columns: ['supplier', 'number', 'date', 'amount'], pinned: 1 })
		expect(keysOf(w)).toEqual(['supplier', 'number', 'date', 'amount'])
		expect(w.vm.pinnedColumnCount).toBe(1)
	})

	it('a saved view with columns wins while applied, and clearing shows the personal layout again', async () => {
		const prefs = fakePreferences({ [KEY]: { columns: ['supplier', 'number'], pinned: 1 } })
		const w = mountPage(prefs)
		await flush()
		w.vm.onApplySavedView({ id: 'v1', name: 'Late orders', query: { columns: ['amount', 'date'] } })
		expect(keysOf(w)).toEqual(['amount', 'date'])
		expect(w.vm.pinnedColumnCount).toBe(0)
		w.vm.onColumnsReorder(['date', 'amount'])
		expect(prefs.write).not.toHaveBeenCalled()

		w.vm.onClearFilters()
		expect(keysOf(w)).toEqual(['supplier', 'number'])
		expect(w.vm.pinnedColumnCount).toBe(1)
	})

	it('a view without columns leaves the personal layout alone', async () => {
		const prefs = fakePreferences({ [KEY]: { columns: ['supplier', 'number'], pinned: 0 } })
		const w = mountPage(prefs)
		await flush()
		w.vm.onApplySavedView({ id: 'v2', name: 'Open', query: { filters: { status: 'open' } } })
		expect(keysOf(w)).toEqual(['supplier', 'number'])
	})

	it('Reset columns removes the stored layout and shows the page\'s columns', async () => {
		const prefs = fakePreferences({ [KEY]: { columns: ['supplier', 'number'], pinned: 1 } })
		const w = mountPage(prefs)
		await flush()
		w.vm.onColumnsReset()
		await flush()
		expect(prefs.write).toHaveBeenLastCalledWith(KEY, null)
		expect(keysOf(w)).toEqual(PAGE_COLUMNS)
		expect(w.vm.pinnedColumnCount).toBe(0)
	})

	it('personalColumns: false reads and writes nothing', async () => {
		const prefs = fakePreferences({ [KEY]: { columns: ['supplier', 'number'], pinned: 1 } })
		const w = mountPage(prefs, { personalColumns: false })
		await flush()
		w.vm.onColumnsReorder(['amount', 'date'])
		w.vm.onPinChange(1)
		await flush()
		expect(prefs.read).not.toHaveBeenCalled()
		expect(prefs.write).not.toHaveBeenCalled()
		expect(keysOf(w)).toEqual(PAGE_COLUMNS)
	})
})
