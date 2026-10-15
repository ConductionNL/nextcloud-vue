// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A size-to-content card on a packing dashboard grid ends at its content and
// the card below moves up to it (?l7=fit-cell-close-up, harness
// l7/FitCellCloseUp.vue). Before, the cell was a whole number of 80px
// rows and kept up to a row of empty space (pipelinq and dossiq Mijn werk,
// decidiq Mijn acties). A card that does not size to content keeps its place
// and size: the same layout on a grid that does not pack is the control.
//
// WHY PLAYWRIGHT: the claim is GridStack's measured layout in a real browser.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a size-to-content card ends at its content and the grid closes up under it', async ({ page }) => {
	await page.setViewportSize({ width: 1440, height: 1000 })
	await page.goto('/?l7=fit-cell-close-up', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="fit-cell-close-up"]')
	await host.locator('[data-testid="fit-card-below"]').first().waitFor({ state: 'visible', timeout: 60_000 })
	// Let the ResizeObserver pass and GridStack's animation settle.
	await page.waitForTimeout(1500)

	if (process.env.L11_SHOT) {
		await host.screenshot({ path: process.env.L11_SHOT })
	}
	const rect = async (grid, id) => {
		const g = await host.locator(`[data-testid="fit-grid-${grid}"]`).boundingBox()
		const b = await host.locator(`[data-testid="fit-grid-${grid}"] [gs-id="${id}"]`).boundingBox()
		return { top: Math.round(b.y - g.y), height: Math.round(b.height) }
	}
	const fit = await rect('packing', 'fit')
	const below = await rect('packing', 'below')
	// The cell ends within one 10px row (plus GridStack's margins) of its 110px content.
	expect(fit.height).toBeLessThan(110 + 2 * 12 + 10)
	expect(below.top - (fit.top + fit.height)).toBeLessThan(10)

	// The card beside it keeps the place and size the control grid gives it.
	expect(await rect('packing', 'side')).toEqual(await rect('control', 'side'))
})
