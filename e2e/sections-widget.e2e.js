// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The `sections` widget, measured in a browser (abstract-sections-widget).
//
// WHY PLAYWRIGHT: "an empty section takes no space" and "the side column is
// beside the main one" are layout; jsdom reports 0 for every rect, which a
// broken layout also reports.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('headed sections: an empty section takes no space and draws no rule', async ({ page }) => {
	await page.goto('/?sectionswidget=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const widget = page.locator('[data-testid="sections-harness-widget"] .cn-sections-widget')
	await widget.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(widget.locator('h3')).toHaveText(['Gegevens van de portal', 'Huisstijl', 'Verkeer meten'])

	const empty = widget.locator('[data-testid="cn-section-nothing"]')
	await expect(empty).toBeHidden()

	// The section after the empty one has its rule; its top sits one gap + rule + padding below the first.
	const first = await widget.locator('[data-testid="cn-section-details"]').boundingBox()
	const theme = widget.locator('[data-testid="cn-section-theme"]')
	const themeBox = await theme.boundingBox()
	expect(Math.round(themeBox.y - (first.y + first.height))).toBe(16)
	const border = await theme.evaluate((el) => getComputedStyle(el).borderTopWidth)
	expect(border).toBe('1px')
	const firstBorder = await widget.locator('[data-testid="cn-section-details"]').evaluate((el) => getComputedStyle(el).borderTopWidth)
	expect(firstBorder).toBe('0px')
})

test('cards: a main and a side column, side column right of the main one, 20px apart', async ({ page }) => {
	await page.goto('/?sectionswidget=cards', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const widget = page.locator('[data-testid="sections-harness-widget"] .cn-sections-widget')
	await widget.waitFor({ state: 'visible', timeout: 60_000 })
	const main = await widget.locator('.cn-sections-widget__column--main').boundingBox()
	const side = await widget.locator('.cn-sections-widget__column--side').boundingBox()
	expect(Math.round(side.x - (main.x + main.width))).toBe(20)
	expect(Math.round(side.y)).toBe(Math.round(main.y))
	expect(Math.round(side.width)).toBeLessThanOrEqual(418)

	// Each shown section is a card: a border all round and a rounded corner
	// (12px under the board look; this harness has no board look, so the
	// Nextcloud large radius).
	const card = widget.locator('[data-testid="cn-section-details"]')
	const style = await card.evaluate((el) => {
		const cs = getComputedStyle(el)
		return { radius: cs.borderTopLeftRadius, left: cs.borderLeftWidth }
	})
	expect(style.left).toBe('1px')
	expect(parseFloat(style.radius)).toBeGreaterThan(0)

	// Cards stand 20px apart in a column.
	const theme = await widget.locator('[data-testid="cn-section-theme"]').boundingBox()
	const details = await card.boundingBox()
	expect(Math.round(theme.y - (details.y + details.height))).toBe(20)
})
