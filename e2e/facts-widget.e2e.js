// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The `facts` widget as a side card, measured in a browser (abstract-facts-widget).
//
// WHY PLAYWRIGHT: the claims are layout. "The label column is as wide as the
// widest label and the values start 16px after it" is a grid computed by the
// browser; jsdom reports 0 for every rect, which a broken grid also reports.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a facts card draws the board grid: one label column, values 16px after the widest label', async ({ page }) => {
	await page.goto('/?factswidget=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const widget = page.locator('[data-testid="facts-harness-widget"] .cn-facts-widget')
	await widget.waitFor({ state: 'visible', timeout: 60_000 })

	// The manifest title is on the card (content-only chrome).
	await expect(page.locator('[data-testid="facts-harness-widget"]')).toContainText('Domein en certificaat')

	const labels = widget.locator('dt')
	const values = widget.locator('dd')
	await expect(labels).toHaveCount(3)
	await expect(values.nth(0)).toHaveText('zuiddrecht.nl')
	await expect(values.nth(1)).toContainText('2027')

	// Every value starts at the same x, 16px after the widest label.
	const labelBoxes = await Promise.all([0, 1, 2].map((i) => labels.nth(i).boundingBox()))
	const valueBoxes = await Promise.all([0, 1, 2].map((i) => values.nth(i).boundingBox()))
	const valueX = valueBoxes.map((b) => Math.round(b.x))
	expect(new Set(valueX).size).toBe(1)
	const widestLabelEnd = Math.max(...labelBoxes.map((b) => b.x + b.width))
	expect(Math.round(valueBoxes[0].x - widestLabelEnd)).toBe(16)

	// The label is lighter than the value, and the value is heavier.
	const style = await widget.evaluate((el) => {
		const dt = getComputedStyle(el.querySelector('dt'))
		const dd = getComputedStyle(el.querySelector('dd'))
		return { dtColor: dt.color, ddColor: dd.color, ddWeight: dd.fontWeight }
	})
	expect(style.dtColor).not.toBe(style.ddColor)
	expect(Number(style.ddWeight)).toBeGreaterThanOrEqual(500)

	// The pill sits below the rows.
	await expect(widget.locator('.cn-status-badge, [class*="status-badge"]').first()).toContainText('Gepubliceerd')
})
