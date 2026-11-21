// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// @spec CnDashboardGrid reports a drag as a layout-change, also when edit mode
// is turned on after the grid was built, and a width or height the layout sets
// reaches the grid. GridStack's drag runs on pointer events and layout, which
// jsdom does not have.

import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1600, height: 1000 } })

const item = (page, id) => page.locator(`.grid-stack-item[gs-id="${id}"]`)

for (const [name, query] of [['in a grid mounted editable', ''], ['after edit mode is turned on', '&late=1']]) {
	test(`a dragged widget is reported with its new place ${name}`, async ({ page }) => {
		await page.goto(`/?l7=grid-drag-saves${query}`)
		await expect(item(page, 1)).toBeVisible({ timeout: 10_000 })
		await page.waitForTimeout(800)
		const box = await item(page, 1).boundingBox()
		const colW = (await page.locator('.grid-stack').boundingBox()).width / 12
		const startX = box.x + box.width / 2
		const startY = box.y + 20
		await page.mouse.move(startX, startY)
		await page.mouse.down()
		await page.mouse.move(startX + 4, startY + 4, { steps: 3 })
		await page.mouse.move(startX + 4 * colW, startY + 2 * 60, { steps: 20 })
		expect(await page.evaluate(() => window.__gridLayouts.length), 'nothing is reported mid-drag').toBe(0)
		await page.mouse.up()

		await expect.poll(() => page.evaluate(() => window.__gridLayouts.length)).toBeGreaterThan(0)
		const [x, y] = await item(page, 1).evaluate((el) => [el.gridstackNode.x, el.gridstackNode.y])
		expect(x + y, 'the widget moved').toBeGreaterThan(0)
		const last = await page.evaluate(() => window.__gridLayouts.at(-1))
		expect(last.find((i) => i.id === 1)).toEqual({ id: 1, gridX: x, gridY: y, gridWidth: 4, gridHeight: 2 })
	})
}

test('a width and height set by the layout reach the grid', async ({ page }) => {
	await page.goto('/?l7=grid-drag-saves&resize=1')
	await expect(item(page, 1)).toBeVisible({ timeout: 10_000 })
	const colW = (await page.locator('.grid-stack').boundingBox()).width / 12
	await expect.poll(async () => Math.round((await item(page, 1).boundingBox()).width / colW), { timeout: 5_000 }).toBe(6)
	expect(Math.round((await item(page, 1).boundingBox()).height / 60)).toBe(3)
	expect(await item(page, 1).evaluate((el) => [el.gridstackNode.w, el.gridstackNode.h])).toEqual([6, 3])
})
