// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A column declared `hidden: true` starts hidden on a page the person has not
// arranged yet (screens-column-hidden-by-default).
//
// WHY PLAYWRIGHT: the header row is the product of the real self-fetching
// page: the seeded visible set, the schema the sidebar governs and the table.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a hidden: true column is not in the table until the person turns it on', async ({ page }) => {
	const schema = {
		id: 7,
		slug: 'meeting',
		title: 'Vergadering',
		properties: {
			title: { type: 'string', title: 'Vergadering' },
			meetingType: { type: 'string', title: 'Soort' },
			location: { type: 'string', title: 'Locatie' },
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
		body: JSON.stringify({ results: [{ id: '1', title: 'Raadsvergadering', meetingType: 'regular', location: 'Raadzaal' }], total: 1, page: 1, pages: 1 }),
	}))
	await page.goto('/?l8=hidden-column', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="hidden-column"]')
	await host.locator('table').waitFor({ state: 'visible', timeout: 60_000 })
	await expect(host.getByText('Raadsvergadering')).toBeVisible()

	const headers = host.locator('thead th')
	await expect(headers.filter({ hasText: 'Vergadering' })).toHaveCount(1)
	await expect(headers.filter({ hasText: 'Locatie' })).toHaveCount(1)
	await expect(headers.filter({ hasText: 'Soort' })).toHaveCount(0)
	await expect(host.getByText('regular')).toHaveCount(0)
})
