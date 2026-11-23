// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The Acties menu beside the header buttons of a board index page
// (?l7=header-actions-menu, harness l7/HeaderActionsMenu.vue). The actions bar
// drops its own menu while header buttons show; the header's menu now lists
// what `items` names: a header action, the built-ins, the documentation link
// and a link action. Before, it listed the header actions only, so the
// documentation link and the built-ins had no place on such a page.
//
// WHY PLAYWRIGHT: the menu is a real NcActions popover, and the entries are
// real links and buttons; a unit test stubs all three.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the header Acties menu lists the named entries, links are links, built-ins run', async ({ page }) => {
	await page.goto('/?l7=header-actions-menu', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="header-actions-menu"]')
	const buttons = host.locator('[data-testid="cn-index-header-buttons"]')
	await buttons.waitFor({ state: 'visible', timeout: 60_000 })

	// The menu sits beside the header buttons, and the bar has no second Actions menu.
	const menu = buttons.locator('[data-testid="cn-index-header-button-actions-menu"]')
	await expect(menu).toBeVisible()
	await expect(buttons.locator('[data-testid="cn-index-header-button-add"]')).toBeVisible()
	await expect(host.locator('[data-testid="cn-actions"]')).toHaveCount(0)

	await menu.locator('button').first().click()
	const entry = (key) => page.locator(`[data-testid="cn-index-header-menu-${key}"]`)
	await expect(entry('goto')).toBeVisible()
	const order = await page.locator('[data-testid^="cn-index-header-menu-"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-testid').replace('cn-index-header-menu-', '')))
	expect(order).toEqual(['goto', 'import', 'copy-selected', 'delete-selected', 'refresh', 'documentation', 'manual'])

	// The documentation and the link action are anchors that open in a new tab.
	const docs = entry('documentation').locator('a')
	await expect(docs).toHaveAttribute('href', 'https://docs.example.test/vergaderingen')
	await expect(docs).toHaveAttribute('target', '_blank')
	await expect(docs).toContainText('Documentatie')
	await expect(entry('manual').locator('a')).toHaveAttribute('href', 'https://docs.example.test/handleiding')

	// Without a selection the two selection entries are disabled.
	await expect(entry('copy-selected').locator('button')).toBeDisabled()
	await expect(entry('delete-selected').locator('button')).toBeDisabled()

	// Refresh runs the page's refresh.
	await entry('refresh').locator('button').click()
	await expect(host.locator('[data-testid="header-actions-menu-refreshed"]')).toHaveText('1')
})
