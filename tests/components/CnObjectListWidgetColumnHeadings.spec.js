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
})
