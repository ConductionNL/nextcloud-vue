/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Accessibility coverage for `CnDataTable` — the fleet's most-reused
 * tabular list primitive (real `<table>`/`<thead>`/`<tbody>` markup,
 * sortable column headers, selectable rows). Part of the
 * `wcag-a11y-anchor` sample.
 */

jest.mock('@nextcloud/router', () => ({
	generateUrl: (p) => `/index.php${p}`,
}))
jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn() },
}))

const { mountAttached } = require('./support/mountAttached.js')
const { expectAccessible } = require('../../src/testing/a11y.js')
const CnDataTable = require('../../src/components/CnDataTable/CnDataTable.vue').default

const columns = [
	{ key: 'name', label: 'Name', sortable: true },
	{ key: 'status', label: 'Status', sortable: false },
]
const rows = [
	{ id: 'a', name: 'Welcome flow', status: 'Active' },
	{ id: 'b', name: 'Lost-deal flow', status: 'Paused' },
]

describe('CnDataTable — accessibility', () => {
	let wrapper

	afterEach(() => {
		wrapper?.destroy()
	})

	it('has no WCAG 2.1 AA violations with sortable columns and selectable rows', async () => {
		wrapper = mountAttached(CnDataTable, {
			propsData: { columns, rows, selectable: true },
		})

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations in the loading state', async () => {
		wrapper = mountAttached(CnDataTable, {
			propsData: { columns, rows: [], loading: true },
		})

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations with a card title and row count', async () => {
		wrapper = mountAttached(CnDataTable, {
			propsData: { columns, rows, title: 'Automations' },
		})

		await expectAccessible(wrapper)
	})

	it('has no WCAG 2.1 AA violations with bare-string columns (manifest shorthand)', async () => {
		wrapper = mountAttached(CnDataTable, {
			propsData: { columns: ['name', 'status'], rows },
		})

		await expectAccessible(wrapper)
	})
})
