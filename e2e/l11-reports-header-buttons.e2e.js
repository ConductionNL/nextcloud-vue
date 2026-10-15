// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Header buttons on the reports page (?l7=reports-header-buttons, harness
// l7/ReportsHeaderButtons.vue), as board DcRapportages draws them: "Downloaden"
// beside the title as a 40px button, then the buildiq square, both on the
// title's row.
//
// WHY PLAYWRIGHT: the claim is the rendered row and the button's computed size
// under the real stylesheet.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the reports page draws Downloaden and the buildiq square beside its title', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 1000 })
	await page.goto('/?l7=reports-header-buttons', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="reports-header-buttons"]')
	const download = host.locator('[data-testid="cn-reports-header-button-download"]')
	await download.waitFor({ state: 'visible', timeout: 60_000 })

	if (process.env.L11_SHOT) {
		await host.screenshot({ path: process.env.L11_SHOT })
	}
	await expect(download).toHaveText('Downloaden')
	const square = host.locator('[data-testid="cn-reports-header-buttons"] .cn-buildiq-edit')
	await expect(square).toBeVisible()

	const title = await host.locator('.cn-reports-page__title').boundingBox()
	const button = await download.boundingBox()
	const sq = await square.boundingBox()
	expect(button.height).toBe(40)
	// One row: the button and the square sit at the title's top, the square after the button.
	expect(Math.abs(button.y - title.y)).toBeLessThan(8)
	expect(sq.x).toBeGreaterThan(button.x + button.width)
	expect(button.x).toBeGreaterThan(title.x + 300)

	await download.click()
	await expect(host.locator('[data-testid="reports-header-last"]')).toHaveText('download')
})
