// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A secondary line under a cell names an enum field by its label
// (screens-secondary-enum-label).
//
// WHY PLAYWRIGHT: the label comes from the schema the real self-fetching page
// loads and hands to the table, which a unit test of the table alone skips.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the second line under Orgaan and Locatie reads the enum label, not the stored code', async ({ page }) => {
	const schema = {
		id: 7,
		slug: 'meeting',
		title: 'Vergadering',
		properties: {
			title: { type: 'string', title: 'Vergadering' },
			bodyName: { type: 'string', title: 'Orgaan' },
			location: { type: 'string', title: 'Locatie' },
			meetingType: { type: 'string', enum: ['regular', 'extra'], 'x-enum-labels': { regular: 'Regular meeting', extra: 'Extra meeting' } },
			meetingMode: { type: 'string', enum: ['in-person', 'online'], 'x-enum-labels': { 'in-person': 'In person', online: 'Online' } },
		},
	}
	await page.route('**/apps/openregister/api/**', (route) => {
		const url = route.request().url()
		if (/\/api\/schemas/.test(url)) {
			return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(url.includes('/schemas/') ? schema : { results: [schema] }) })
		}
		return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [], total: 0 }) })
	})
	await page.route(/\/apps\/openregister\/api\/objects\/decidiq\/meeting(\?|$)/, (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ results: [{ id: '1', title: 'Raadsvergadering', bodyName: 'Gemeenteraad', meetingType: 'regular', location: 'Raadzaal', meetingMode: 'in-person' }], total: 1, page: 1, pages: 1 }),
	}))
	await page.goto('/?l8=secondary-enum', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="secondary-enum"]')
	await expect(host.getByText('Gemeenteraad')).toBeVisible({ timeout: 60_000 })

	const secondary = host.locator('[data-testid="cn-cell-secondary"]')
	await expect(secondary).toHaveText(['Regular meeting', 'In person'])
})
