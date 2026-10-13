// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The sort select of a page bar reads in the app's language, as its switch
// does (screens-workspace-filter-translate).

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the bar select shows its options translated and writes the declared value', async ({ page }) => {
	await page.goto('/?l6=workspace-filter-translate', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const select = page.locator('[data-testid="cn-workspace-filter-select"]')
	await select.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(page.getByText('Toon afgerond')).toBeVisible()
	// The selected option shows translated.
	await expect(select).toContainText('Termijn')
	await select.click()
	const options = page.locator('.vs__dropdown-option, [role="option"]')
	await expect(options.filter({ hasText: 'Prioriteit' })).toBeVisible()
	await expect(options.filter({ hasText: 'Priority' })).toHaveCount(0)
	await options.filter({ hasText: 'Prioriteit' }).click()
	await expect(page.locator('[data-testid="l6-wf-sort"]')).toHaveText('priority')
})
