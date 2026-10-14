// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// "Ga naar" entries in the header Actions menu (?l7=header-menu-goto, harness
// l7/HeaderMenuGoto.vue). A header action with `handler: "navigate"` and a
// route the router resolves loses its handler and carries `to`; the menu used
// to read only `href`, so the entry rendered as a button that did nothing.
// Now it is an in-app link and clicking it routes.
//
// WHY PLAYWRIGHT: the claim is real navigation through vue-router from a real
// NcActions popover; a unit test stubs both.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a navigate entry in the header Acties menu is an in-app link that routes', async ({ page }) => {
	await page.goto('/?l7=header-menu-goto', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="header-menu-goto"]')
	const menu = host.locator('[data-testid="cn-index-header-button-actions-menu"]')
	await menu.waitFor({ state: 'visible', timeout: 60_000 })

	await menu.locator('button').first().click()
	const calendar = page.locator('[data-testid="cn-index-header-menu-calendar"] a')
	await expect(calendar).toBeVisible()
	await expect(calendar).toHaveAttribute('href', '#/calendar')
	await expect(calendar).not.toHaveAttribute('target', '_blank')
	await expect(calendar).toContainText('Vergaderkalender')

	await calendar.click()
	await expect(host.locator('[data-testid="header-menu-goto-route"]')).toHaveText('MeetingCalendar')
	await expect(page).toHaveURL(/#\/calendar$/)
})
