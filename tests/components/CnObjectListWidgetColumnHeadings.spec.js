/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnObjectListWidget's column HEADINGS.
 *
 * A manifest may give a column as a bare key, and this widget used to print
 * that key as the heading. Measured on a live instance: an AI-generated app's
 * dashboard showed `bike customerName status dateReceived` while the index
 * page beside it, over the same schema, said "Bike", "Customer name",
 * "Status" and "Date received". The same data, labelled twice, differently,
 * and one of the two was the property name a developer typed.
 *
 * The schema already carries the answer in each property's `title`, so the
 * widget asks it. A column that states its own `label` is untouched, and a
 * property with no title still falls back to the key rather than rendering
 * nothing.
 */
import { shallowMount } from '@vue/test-utils'
import CnObjectListWidget from '../../src/components/CnObjectListWidget/CnObjectListWidget.vue'

// The default stub answers every schema GET with `{}`, which is what the
// existing tests here expect. This one lets a test hand back a real schema so
// the heading it produces can be asserted. The `mock` prefix is jest's: a
// factory may only close over a variable named that way.
let mockServed = {}
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: () => Promise.resolve({ status: 200, data: mockServed }) },
}))

/** Let every pending promise, including the dynamic imports, settle. */
async function settle() {
	for (let turn = 0; turn < 5; turn++) {
		await Promise.resolve()
	}
}

function mountWidget(propsData = {}) {
	return shallowMount(CnObjectListWidget, {
		propsData,
		stubs: { CnDataTable: true, CnFormDialog: true },
		mocks: { t: (_app, s) => s },
	})
}

const REPAIR_SCHEMA = {
	properties: {
		bike: { type: 'string', title: 'Bike' },
		customerName: { type: 'string', title: 'Customer name' },
		dateReceived: { type: 'string', title: 'Date received' },
		internalRef: { type: 'string' },
	},
}

describe('CnObjectListWidget — column headings', () => {
	it('labels a bare string column from the schema property title', async () => {
		const w = mountWidget({ content: { register: 'r', schema: 'repair', columns: ['bike', 'customerName'] } })
		w.vm.createSchema = REPAIR_SCHEMA
		await w.vm.$nextTick()

		expect(w.vm.resolvedColumns.map((c) => c.label)).toEqual(['Bike', 'Customer name'])
	})

	it('labels a keyed column with no label of its own', async () => {
		const w = mountWidget({ content: { register: 'r', schema: 'repair', columns: [{ key: 'dateReceived' }] } })
		w.vm.createSchema = REPAIR_SCHEMA
		await w.vm.$nextTick()

		expect(w.vm.resolvedColumns[0].label).toBe('Date received')
	})

	it("leaves a column's own label alone", async () => {
		const w = mountWidget({ content: { register: 'r', schema: 'repair', columns: [{ key: 'bike', label: 'Fiets' }] } })
		w.vm.createSchema = REPAIR_SCHEMA
		await w.vm.$nextTick()

		expect(w.vm.resolvedColumns[0].label).toBe('Fiets')
	})

	it('falls back to the key when the property has no title', async () => {
		const w = mountWidget({ content: { register: 'r', schema: 'repair', columns: ['internalRef'] } })
		w.vm.createSchema = REPAIR_SCHEMA
		await w.vm.$nextTick()

		expect(w.vm.resolvedColumns[0].label).toBe('internalRef')
	})

	it('falls back to the key when no schema could be loaded at all', async () => {
		const w = mountWidget({ content: { register: 'r', schema: 'repair', columns: ['customerName'] } })
		await w.vm.$nextTick()

		expect(w.vm.createSchema).toBe(null)
		expect(w.vm.resolvedColumns[0].label).toBe('customerName')
	})

	/*
	 * The request is the cost of this feature, so it is only paid when a
	 * heading is actually missing. A fully-labelled widget must not make it.
	 */
	it('does not fetch a schema when every column already carries a label', async () => {
		const w = mountWidget({
			content: { register: 'r', schema: 'repair', columns: [{ key: 'bike', label: 'Bike' }] },
		})
		let fetched = false
		w.vm.ensureSchema = async () => {
			fetched = true
		}

		await w.vm.loadHeadingsIfNeeded()

		expect(fetched).toBe(false)
	})

	it('fetches a schema when a column has no label', async () => {
		const w = mountWidget({ content: { register: 'r', schema: 'repair', columns: ['bike'] } })
		let fetched = false
		w.vm.ensureSchema = async () => {
			fetched = true
		}

		await w.vm.loadHeadingsIfNeeded()

		expect(fetched).toBe(true)
	})

	/*
	 * 🔴 The headings share the create dialog's cached schema, and the
	 * retarget watchers drop that cache — correctly, since a schema resolved
	 * for the OLD register is the wrong-app schema the register scoping exists
	 * to prevent. But only the dialog had a later moment that refills it. The
	 * headings did not, so a widget CnRelatedCollections reuses (it keys its
	 * children by index, so a reordered entry lands on a live component) went
	 * back to printing `customerName` at the user, and stayed there until
	 * somebody happened to open Add.
	 */
	describe('after the widget is retargeted at another schema', () => {
		const LOAN_SCHEMA = { properties: { customerName: { type: 'string', title: 'Borrower' } } }

		afterEach(() => {
			mockServed = {}
		})

		/**
		 * Mount over the repair schema, then point the widget at another one.
		 *
		 * @param {string} key Which of `schema` / `register` moves.
		 * @return {object} The wrapper, once the reload has settled.
		 */
		const retarget = async (key) => {
			const w = mountWidget({ content: { register: 'r', schema: 'repair', columns: ['customerName'] } })
			// Settle the MOUNT's own fetch before anything else moves. Left in
			// flight it resolves after the retarget, against whatever the mock
			// serves by then, and the assertion below passes without the
			// watcher ever having reloaded a thing.
			await settle()
			w.vm.createSchema = REPAIR_SCHEMA
			await w.vm.$nextTick()
			expect(w.vm.resolvedColumns[0].label).toBe('Customer name')

			mockServed = LOAN_SCHEMA
			await w.setProps({ content: { ...w.props('content'), [key]: 'loan' } })
			await settle()
			await w.vm.$nextTick()
			return w
		}

		it('takes the heading from the schema it now points at', async () => {
			expect((await retarget('schema')).vm.resolvedColumns[0].label).toBe('Borrower')
		})

		it('does the same when it is the register that moves', async () => {
			expect((await retarget('register')).vm.resolvedColumns[0].label).toBe('Borrower')
		})

		it('never serves a heading from the schema it used to point at', async () => {
			// The half that was already right: the old schema is dropped. Without
			// the reload beside it the heading simply fell back to the raw key,
			// which is the bug the feature was written to end.
			const w = await retarget('schema')
			expect(w.vm.resolvedColumns[0].label).not.toBe('Customer name')
		})
	})
})
