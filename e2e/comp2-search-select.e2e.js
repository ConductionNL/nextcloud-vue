// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// CnSearchSelect (?l8=picker-search-look, harness l8/PickerSearchLook.vue):
// the field shows a magnifier and no chevron, and the open list draws each
// team as initials, a name and a secondary line, with a check on the chosen
// one (DqOverdragen "Nieuw team").
//
// WHY PLAYWRIGHT: the chevron is hidden by a stylesheet rule and the
// magnifier is positioned; jsdom computes neither.
//
// @spec openspec/changes/search-select-look/specs/search-select/spec.md#requirement-a-single-picker-can-take-the-search-look

import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 120_000 })

test('a single picker in the search look', async ({ page }) => {
	await page.goto('/?l8=picker-search-look', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const root = page.locator('[data-testid="picker-search-look"]')
	const field = root.locator('.v-select')
	await field.waitFor({ state: 'visible', timeout: 60_000 })

	// A magnifier inside the field, and no chevron.
	for (const indicator of await root.locator('.vs__open-indicator, .vs__open-indicator-button').all()) {
		await expect(indicator).toBeHidden()
	}
	const magnifier = root.locator('.cn-search-select__magnifier')
	await expect(magnifier).toBeVisible()
	const fieldBox = await root.locator('.vs__dropdown-toggle').boundingBox()
	const iconBox = await magnifier.boundingBox()
	expect(iconBox.x).toBeGreaterThan(fieldBox.x + fieldBox.width / 2)
	expect(iconBox.x + iconBox.width).toBeLessThanOrEqual(fieldBox.x + fieldBox.width)
	expect(iconBox.y).toBeGreaterThanOrEqual(fieldBox.y - 1)
	expect(iconBox.y + iconBox.height).toBeLessThanOrEqual(fieldBox.y + fieldBox.height + 1)

	// The open list: rows with initials, a name, a secondary line, one check.
	await root.locator('.vs__search').click()
	const rows = page.locator('[data-testid="cn-search-select-row"]')
	await expect(rows).toHaveCount(3)
	await expect(rows.nth(0).locator('.cn-search-select__lead')).toHaveText('JZ')
	await expect(rows.nth(0).locator('.cn-search-select__secondary')).toHaveText('6 leden · bezwaar, beroep en Woo-advies')
	await expect(page.locator('[data-testid="cn-search-select-check"]')).toHaveCount(1)
	await expect(rows.nth(0).locator('[data-testid="cn-search-select-check"]')).toBeVisible()
	if (process.env.SS_SHOT) {
		await page.screenshot({ path: process.env.SS_SHOT })
	}
})
