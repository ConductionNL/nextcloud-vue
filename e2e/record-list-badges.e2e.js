// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Record-list row badges in a browser (screens-record-list-badges): a priority
// badge for non-default values and an age badge past N days.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a row carries the priority badge and the age badge by config', async ({ page }) => {
	const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString()
	await page.route('**/apps/openregister/api/objects/pipelinq/ticket**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({
			results: [
				{ id: 'a', title: 'Afvalpas', priority: 'urgent', updatedAt: daysAgo(10) },
				{ id: 'b', title: 'Stoeptegel', priority: 'normal', updatedAt: daysAgo(1) },
			],
			total: 2,
		}),
	}))
	await page.goto('/?l6=record-list-badges', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const rows = page.locator('[data-testid="cn-record-list-item"]')
	await rows.first().waitFor({ state: 'visible', timeout: 60_000 })

	await expect(rows.nth(0)).toContainText('Urgent')
	await expect(rows.nth(0).locator('[data-testid="cn-record-list-badge-stale"]')).toHaveText('Stilgevallen 10 dagen')
	await expect(rows.nth(1).locator('[data-testid="cn-record-list-badge-field"]')).toHaveCount(0)
	await expect(rows.nth(1).locator('[data-testid="cn-record-list-badge-stale"]')).toHaveCount(0)
})
