// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// card-grid-dashboard-frame: a card-grid widget on a dashboard draws no frame,
// title or Actions menu of its own inside the cell's titled card. On its own it
// keeps its frame.
//
// WHY PLAYWRIGHT: "one frame" is the rendered border and title count in the
// real CnDashboardPage grid under the board look.
//
// @spec openspec/changes/card-grid-dashboard-frame/specs/card-grid-dashboard-frame/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>}
 */
async function open(page) {
	await page.setViewportSize({ width: 1280, height: 1000 })
	await page.goto('/?l8=card-grid-frame', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await expect(page.locator('[data-testid="card-grid-frame"] .cn-widget-card-grid').first()).toBeVisible({ timeout: 90_000 })
}

test('a card grid in a dashboard cell has one title and no inner frame', async ({ page }) => {
	await open(page)
	const cell = page.locator('[data-testid="card-grid-frame"] .cn-dashboard-page .cn-widget-card-grid').first()
	await expect(cell).toHaveClass(/cn-widget-card-grid--in-cell/)
	const inner = cell.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " cn-widget-wrapper ")][1]')
	await expect(inner).toHaveClass(/cn-widget-wrapper--chromeless/)
	const titles = page.locator('[data-testid="card-grid-frame"] .cn-dashboard-page .cn-widget-wrapper__title')
	await expect(titles).toHaveText(['Rekeningen'])
})

test('a card grid on its own keeps its frame and title', async ({ page }) => {
	await open(page)
	const alone = page.locator('[data-testid="card-grid-alone"] .cn-widget-wrapper').first()
	await expect(alone).not.toHaveClass(/cn-widget-wrapper--chromeless/)
	await expect(alone.locator('.cn-widget-wrapper__title')).toHaveText('Rekeningen')
})
