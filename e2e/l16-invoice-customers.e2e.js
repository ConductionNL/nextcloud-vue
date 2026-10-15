// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A dashboard table shows the name of the object a column references
// (?l7=l16-invoice-customers, harness l7/L16InvoiceCustomers.vue), as board
// ShDebiteurenbeheer's open invoices list customers by name.
//
// WHY PLAYWRIGHT: the real dashboard, object table, data table and object
// store, over the list, schema and object requests a browser makes.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

const CUSTOMER = 'c0ffee00-1111-4222-8333-944455556666'
const PAYER = 'beef0000-1111-4222-8333-944455556666'

test('the customer and payer columns read names, not ids', async ({ page }) => {
	await page.route('**/apps/openregister/api/**', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: [], total: 0 }) }))
	await page.route(/\/apps\/openregister\/api\/objects\/shillinq\/ARInvoice(\?|$)/, (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ results: [{ id: 'i1', invoiceNumber: 'VF-2026-118', customerId: CUSTOMER, payerId: PAYER }], total: 1, page: 1, pages: 1 }),
	}))
	await page.route(/\/apps\/openregister\/api\/schemas\/ARInvoice/, (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ slug: 'ARInvoice', properties: { payerId: { type: 'string', $ref: 'customer-master' }, customerId: { type: 'string' } } }),
	}))
	await page.route(/\/apps\/openregister\/api\/objects\/shillinq\/[cC]ustomer-?[mM]aster\/[0-9a-f-]+/, (route) => {
		const id = route.request().url().split('/').pop().split('?')[0]
		const name = id === CUSTOMER ? 'Bakkerij De Korenaar BV' : 'Holding Korenaar'
		return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ id, legalName: name }) })
	})
	await page.goto('/?l7=l16-invoice-customers', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="l16-invoice-customers"]')
	await expect(host.getByText('VF-2026-118')).toBeVisible({ timeout: 60_000 })
	await expect(host.getByText('Bakkerij De Korenaar BV')).toBeVisible()
	await expect(host.getByText('Holding Korenaar')).toBeVisible()
	await expect(host.getByText(CUSTOMER)).toHaveCount(0)
	await expect(host.getByText(PAYER)).toHaveCount(0)
})
