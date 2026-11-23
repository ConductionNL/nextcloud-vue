// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// When a size-to-content banner grows, the cards under it move down in their
// order: the full-width "client in focus" card stays between the stat cards
// and the lists (?l7=fit-cell-order, harness l7/FitCellOrder.vue, the layout
// of pipelinq's simple dashboard), with a grid that packs and one that does not.
// Before, GridStack pushed it below the lists in both.
//
// WHY PLAYWRIGHT: the claim is GridStack's collision handling in a real browser.

import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

for (const float of ['1', '0']) {
	for (const grow of ['0', '1', 'late']) {
		test(`float=${float} grow=${grow}: the full-width card stays above the lists`, async ({ page }) => {
			await page.setViewportSize({ width: 1440, height: 1000 })
			await page.goto(`/?l7=fit-cell-order&float=${float}&grow=${grow}`, { waitUntil: 'domcontentloaded', timeout: 90_000 })
			const host = page.locator('[data-testid="fit-cell-order"]')
			await host.locator('[gs-id="waiting-list"]').waitFor({ state: 'visible', timeout: 60_000 })
			await page.waitForTimeout(grow === 'late' ? 3000 : 1500)
			if (process.env.L11_SHOT) {
				await host.screenshot({ path: `${process.env.L11_SHOT}-f${float}-g${grow}.png` })
			}
			const top = async (id) => Math.round((await host.locator(`[gs-id="${id}"]`).boundingBox()).y)
			const tops = {}
			for (const id of ['first-today', 'new', 'client-in-focus', 'waiting-list', 'callback-list']) {
				tops[id] = await top(id)
			}
			expect(tops['client-in-focus']).toBeGreaterThan(tops.new)
			expect(tops['client-in-focus']).toBeLessThan(tops['waiting-list'])
			expect(tops['client-in-focus']).toBeLessThan(tops['callback-list'])
		})
	}
}
