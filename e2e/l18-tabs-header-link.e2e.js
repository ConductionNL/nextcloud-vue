// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A tabs widget draws the open panel's header link beside the strip
// (?l7=l18-tabs-header-link, harness l7/L18TabsHeaderLink.vue), as board
// ShDebiteurenbeheer's "Alle verkoopfacturen" in shillinq #2031.
//
// WHY PLAYWRIGHT: the real dashboard page, registry, tabs widget, detail host
// and object table together, with the real router the link follows.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the open tab\'s header link shows beside the strip, follows its route and changes with the tab', async ({ page }) => {
	await page.route('**/apps/openregister/api/objects/shillinq/**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ results: [{ id: 'r1', title: 'Row one' }], total: 1, page: 1, pages: 1 }),
	}))
	await page.goto('/?l7=l18-tabs-header-link', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="l18-tabs-header-link"]')
	const tabs = root.locator('[role="tab"]')
	await tabs.first().waitFor({ state: 'visible', timeout: 60_000 })
	await expect(tabs).toHaveCount(3)

	const link = root.locator('.cn-tabs__nav-end [data-testid="cn-tabs-widget-header-link"]')
	await expect(link).toHaveText('Alle verkoopfacturen')
	// Beside the strip: on the tab row, right of the last tab.
	const linkBox = await link.boundingBox()
	const lastTab = await tabs.nth(2).boundingBox()
	expect(linkBox.x).toBeGreaterThan(lastTab.x + lastTab.width)
	expect(Math.abs((linkBox.y + linkBox.height / 2) - (lastTab.y + lastTab.height / 2))).toBeLessThan(lastTab.height)

	await tabs.nth(1).click()
	await expect(link).toHaveCount(0)
	await tabs.nth(2).click()
	await expect(link).toHaveText('All payment requests')

	await tabs.nth(0).click()
	await link.click()
	await expect(root.locator('[data-testid="l18-route"]')).toHaveText('AccountsReceivable')
})
