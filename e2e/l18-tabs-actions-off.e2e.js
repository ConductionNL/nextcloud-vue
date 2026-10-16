// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A manifest turns off the tab strip's Actions menu with
// `content.showActions: false` (?l7=l18-tabs-actions-off, harness
// l7/L18TabsActionsOff.vue), as board ShDebiteurenbeheer draws none in
// shillinq #2031. A second tabs widget without the key keeps its menu, so the
// spec cannot pass on a page where the menu never renders.
//
// WHY PLAYWRIGHT: the claim is about the manifest path, through the real
// dashboard page and widget registry that hand content keys to the widget.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('content.showActions false drops the strip menu on every tab, without the key it stays', async ({ page }) => {
	await page.route('**/apps/openregister/api/objects/shillinq/**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ results: [{ id: 'r1', title: 'Row one' }], total: 1, page: 1, pages: 1 }),
	}))
	await page.goto('/?l7=l18-tabs-actions-off', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="l18-tabs-actions-off"]')
	const strips = root.locator('.cn-tabs-widget')
	await expect(strips).toHaveCount(2, { timeout: 60_000 })
	const quiet = strips.nth(0)
	const withMenu = strips.nth(1)
	await quiet.locator('[role="tab"]').first().waitFor({ state: 'visible', timeout: 60_000 })

	// The control: without the key the menu is drawn beside the strip.
	await expect(withMenu.locator('[data-testid="cn-tabs-widget-actions"]')).toBeVisible()

	await expect(quiet.locator('[data-testid="cn-tabs-widget-actions"]')).toHaveCount(0)
	await quiet.locator('[role="tab"]').nth(1).click()
	await expect(quiet.locator('[role="tab"]').nth(1)).toHaveAttribute('aria-selected', 'true')
	await expect(quiet.locator('[data-testid="cn-tabs-widget-actions"]')).toHaveCount(0)
})
