// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// stats-box-card-inset: a dashboard card of boxed stat tiles keeps board
// DcRapportages' inset: tiles 22px from the card's side, no rule under the
// header. A card of plain tiles keeps its own.
//
// WHY PLAYWRIGHT: the inset is the sum of the cell, wrapper and grid boxes in
// the real dashboard grid.
//
// @spec openspec/changes/stats-box-card-inset/specs/stats-box-card-inset/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} title The card title.
 * @return {Promise<{inset: number, divider: string}>} Tile inset and header rule.
 */
function measure(page, title) {
	return page.evaluate((cardTitle) => {
		const card = [...document.querySelectorAll('.cn-widget-wrapper')]
			.find((el) => el.querySelector('.cn-widget-wrapper__title')?.textContent.trim() === cardTitle)
		const tile = card.querySelector('.cn-stats-block-widget__grid-stat')
		const header = card.querySelector('.cn-widget-wrapper__header')
		return {
			inset: Math.round(tile.getBoundingClientRect().left - card.getBoundingClientRect().left),
			divider: getComputedStyle(header).borderBottomStyle,
		}
	}, title)
}

test('a card of boxed tiles sits 22px in with no header rule; plain tiles keep theirs', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 1000 })
	await page.goto('/?l8=stats-box-card', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await expect(page.locator('[data-testid="stats-box-card"] .cn-stats-block-widget--tiles-box')).toBeVisible({ timeout: 90_000 })

	const box = await measure(page, 'Vergaderingen en efficiëntie')
	expect(Math.abs(box.inset - 22)).toBeLessThanOrEqual(1)
	expect(box.divider).toBe('none')

	const plain = await measure(page, 'Je week tot nu toe')
	expect(plain.inset).toBeGreaterThan(30)
	expect(plain.divider).toBe('solid')
})
