// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Board look (DqZaakMeer, DqZaakBesluiten): the strip draws five tabs, the
// overflow panels are the first items of the Actions menu beside it, and a
// panel picked there joins the strip just before History
// (?l7=l28-tabs-board-overflow, harness l7/L28TabsBoardOverflow.vue).
//
// WHY PLAYWRIGHT: the menu is NcActions' popover, which only opens and takes
// focus properly in a real browser.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('overflow tabs sit in the Actions menu and an opened one joins the strip before History', async ({ page }) => {
	await page.goto('/?l7=l28-tabs-board-overflow', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="l28-tabs-board-overflow"]')
	const tabs = root.locator('[role="tab"]')
	await tabs.first().waitFor({ state: 'visible', timeout: 60_000 })

	await expect(tabs).toHaveText(['Overview', 'Files', 'Contact', 'Tasks', 'History'])
	await expect(root.locator('[data-testid="cn-tabs-more"]')).toHaveCount(0)

	await root.locator('[data-testid="cn-tabs-widget-actions"] button').first().click()
	const items = page.locator('[role="menu"] [role="menuitem"]')
	await expect(items.first()).toBeVisible()
	const labels = (await items.allTextContents()).map((text) => text.trim())
	expect(labels.slice(0, 3)).toEqual(['Notes', 'Decisions', 'Archiving'])

	await page.locator('[data-testid="cn-tabs-widget-menu-tab"]', { hasText: 'Decisions' }).click()
	await expect(tabs).toHaveText(['Overview', 'Files', 'Contact', 'Tasks', 'Decisions', 'History'])
	await expect(root.locator('[role="tab"][aria-selected="true"]')).toHaveText('Decisions')
	await expect(root.locator('[role="tab"][aria-selected="true"]')).toBeFocused()
})
