// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A size-to-content cell whose content grows after the grid is built grows in
// place: it stays on its row and the page raises no error
// (?l7=fit-cell-grows-alone, harness l7/FitCellGrowsAlone.vue, the shape of
// portaliq's portal page: one full-width cell holding the tab strip). Before,
// the growth planner took the growing cell for a card under it, moved it down
// by its own growth, and GridStack's re-measure after that move asked again:
// "Maximum call stack size exceeded" in collideAll/moveNode, and no tab strip.
//
// WHY PLAYWRIGHT: the claim is the real GridStack engine with the grid held in
// Vue state, which a jest stub does not reproduce.

import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

for (const below of ['0', '1']) {
	test(`below=${below}: a growing cell stays on its row without a stack overflow`, async ({ page }) => {
		const errors = []
		page.on('pageerror', (error) => errors.push(String(error)))
		await page.setViewportSize({ width: 1440, height: 1000 })
		await page.goto(`/?l7=fit-cell-grows-alone&below=${below}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
		const host = page.locator('[data-testid="fit-cell-grows-alone"]')
		const cell = host.locator('[gs-id="tabs"]')
		await cell.waitFor({ state: 'visible', timeout: 60_000 })
		await page.waitForTimeout(3000)

		expect(errors).toEqual([])
		expect(await cell.getAttribute('gs-y')).toBe('0')
		const box = await cell.boundingBox()
		const hostBox = await host.boundingBox()
		expect(Math.round(box.y - hostBox.y)).toBeLessThan(20)
		expect(box.height).toBeGreaterThanOrEqual(900)
		if (below === '1') {
			const under = await host.locator('[gs-id="below"]').boundingBox()
			expect(under.y).toBeGreaterThanOrEqual(box.y + box.height - 1)
		}
	})
}
