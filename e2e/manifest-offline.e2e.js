// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The manifest offline block end to end (manifest-offline-block task 6): a
// harness page downloads a take-along set, goes offline, lists and opens a
// record with its download time, submits an offline form, goes online and
// sees the submission arrive.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('take along, read offline, queue a report and send it when back online', async ({ page, context }) => {
	await page.route('**/apps/openregister/api/objects/toezicht/inspection**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ results: [{ id: 'i1', title: 'Kerkstraat 12' }, { id: 'i2', title: 'Molenweg 4' }], total: 2 }),
	}))
	const posted = []
	await page.route('**/apps/openregister/api/objects/toezicht/report', (route) => {
		posted.push(route.request().postDataJSON())
		return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'rep-1' }) })
	})

	await page.goto('/?l6=manifest-offline', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('[data-testid="mo-download"]').click()
	await expect(page.locator('[data-testid="mo-downloaded"]')).toHaveText('2')

	await context.setOffline(true)

	const list = page.locator('[data-testid="cn-index-page-offline"]')
	await expect(list).toHaveText(/^You are offline\. Showing 2 records downloaded at \d\d:\d\d\.$/)
	await expect(page.getByText('Kerkstraat 12').first()).toBeVisible()

	await expect(page.locator('[data-testid="cn-detail-page-offline"]')).toHaveText(/^You are offline\. Downloaded at \d\d:\d\d\.$/)
	await expect(page.locator('[data-testid="cn-detail-page-edit"]')).toBeDisabled()

	await page.getByLabel('Finding').fill('Loose railing')
	await page.locator('.cn-form-page__form button[type="submit"]').click()
	await expect(page.locator('[data-testid="cn-form-page-queued"]')).toHaveText('Saved on this device. It will be sent when you are back online.')
	expect(posted).toEqual([])

	await context.setOffline(false)
	await expect(page.locator('[data-testid="mo-sent"]')).toHaveText('1')
	expect(posted).toEqual([{ finding: 'Loose railing' }])
	await expect(page.locator('[data-testid="cn-index-page-offline"]')).toHaveCount(0)
})
