// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The library's own built-ins in the header Actions menu draw their own icons
// (?l7=menu-builtin-icons, harness l7/MenuBuiltinIcons.vue). Import, Export
// and TrashCanOutline are not in the semantic vocabulary, so CnIcon drew the
// help-circle "?" unless the app had registered them.
//
// WHY PLAYWRIGHT: the entries live in a real NcActions popover; a unit test
// stubs the popover and the icon.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('import, export and delete-selected draw their own icons, never the "?"', async ({ page }) => {
	await page.goto('/?l7=menu-builtin-icons', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const menu = page.locator('[data-testid="menu-builtin-icons"] [data-testid="cn-index-header-button-actions-menu"]')
	await menu.waitFor({ state: 'visible', timeout: 60_000 })
	await menu.locator('button').first().click()

	const entry = (key) => page.locator(`[data-testid="cn-index-header-menu-${key}"]`)
	await expect(entry('import').locator('.import-icon')).toBeVisible()
	await expect(entry('export').locator('.export-icon')).toBeVisible()
	await expect(entry('delete-selected').locator('.trash-can-outline-icon')).toBeVisible()
	for (const key of ['import', 'export', 'delete-selected']) {
		await expect(entry(key).locator('.help-circle-outline-icon')).toHaveCount(0)
	}
})
