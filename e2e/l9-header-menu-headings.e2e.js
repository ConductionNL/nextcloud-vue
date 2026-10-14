// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Group headings and rules in the header Actions menu (?l7=menu-headings,
// harness l7/MenuHeadings.vue), as board DcVergaderingen draws them: "Ga naar"
// and "Selectie" in 12px bold capitals, and rules between the groups.
//
// WHY PLAYWRIGHT: the menu is a real NcActions popover, and the claim is about
// its rendered order and the heading's computed look.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the header Acties menu draws the board groups with headings and rules', async ({ page }) => {
	await page.goto('/?l7=menu-headings', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const menu = page.locator('[data-testid="menu-headings"] [data-testid="cn-index-header-button-actions-menu"]')
	await menu.waitFor({ state: 'visible', timeout: 60_000 })
	await menu.locator('button').first().click()
	await expect(page.locator('[data-testid="cn-index-header-menu-calendar"]')).toBeVisible()

	const order = await page.locator('[data-testid^="cn-index-header-menu-"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-testid').replace('cn-index-header-menu-', '')))
	expect(order).toEqual(['__heading-1', 'calendar', 'agenda', '__separator-2', 'import', '__separator-3', '__heading-4', 'copy-selected', 'delete-selected', '__separator-5', 'refresh', 'documentation'])

	const heading = page.locator('[data-testid="cn-index-header-menu-__heading-1"]')
	await expect(heading).toHaveText('Ga naar')
	await expect(page.locator('[data-testid="cn-index-header-menu-__heading-4"]')).toHaveText('Selectie')
	const look = await heading.evaluate((el) => {
		const cs = getComputedStyle(el)
		return { size: cs.fontSize, weight: cs.fontWeight, transform: cs.textTransform }
	})
	expect(look).toEqual({ size: '12px', weight: '700', transform: 'uppercase' })
})
