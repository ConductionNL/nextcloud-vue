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
		wrapper?.unmount()
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

	// The `limit` + `viewAllRoute` footer was the one surface this lane never
	// mounted, which is how an href-less `<a class="cn-data-table__view-all">`
	// shipped to the dossiq dashboard (seen 2026-09-08): no link role, not in
	// the tab order, invisible to `getByRole('link')`. Note that axe alone
	// would NOT have caught it — an anchor without an href is not a link, so
	// no link rule applies to it. Hence the explicit role/tab-order assertions
	// below alongside the axe scan.
	describe('the "View all" footer control', () => {
		const viewAllRoute = { name: 'cases' }
		const footerProps = { columns, rows, limit: 1, viewAllRoute }

		it('is a focusable link, with no WCAG 2.1 AA violations, when the router resolves the route', async () => {
			wrapper = mountAttached(CnDataTable, {
				propsData: footerProps,
				mocks: {
					$router: {
						resolve: () => ({ href: '/index.php/apps/dossiq/#/cases' }),
						push: () => Promise.resolve(),
					},
				},
			})

			const control = wrapper.find('.cn-data-table__view-all').element
			expect(control.tagName).toBe('A')
			expect(control.getAttribute('href')).toBe('/index.php/apps/dossiq/#/cases')
			expect(control.tabIndex).toBe(0)

			await expectAccessible(wrapper)
		})

		it('is a focusable button, with no WCAG 2.1 AA violations, outside a router context', async () => {
			wrapper = mountAttached(CnDataTable, { propsData: footerProps })

			const control = wrapper.find('.cn-data-table__view-all').element
			expect(control.tagName).toBe('BUTTON')
			expect(control.getAttribute('type')).toBe('button')
			expect(control.tabIndex).toBe(0)

			await expectAccessible(wrapper)
		})
	})
})
