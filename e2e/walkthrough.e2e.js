// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// @spec CnWalkthrough footer (PR #125): close X top-right, Back (left, ←) /
//   Next (right, →), standalone Skip removed.

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	// ?wt=1 renders the walkthrough harness (its overlay would otherwise block
	// the icon/markdown sections).
	await page.goto('/?wt=1')
	await expect(page.locator('.cn-walkthrough__card')).toBeVisible({ timeout: 10_000 })
})

test.describe('CnWalkthrough footer (real browser)', () => {
	test('close X sits in the top-right corner of the card', async ({ page }) => {
		const card = await page.locator('.cn-walkthrough__card').boundingBox()
		const close = await page.locator('.cn-walkthrough__close').boundingBox()
		// The close button's right edge hugs the card's right edge...
		expect(Math.abs((close.x + close.width) - (card.x + card.width))).toBeLessThan(24)
		// ...and it is in the right half of the card, not the left.
		expect(close.x).toBeGreaterThan(card.x + card.width / 2)
	})

	test('first step shows Next (right) and no Back or Skip', async ({ page }) => {
		const actions = page.locator('.cn-walkthrough__actions')
		await expect(actions.locator('button', { hasText: 'Next' })).toBeVisible()
		await expect(actions.locator('button', { hasText: 'Back' })).toHaveCount(0)
		await expect(actions.locator('button', { hasText: 'Skip' })).toHaveCount(0)
		// Next carries a (right-pointing) chevron icon.
		await expect(actions.locator('button', { hasText: 'Next' }).locator('.material-design-icon')).toBeVisible()
	})

	test('advancing reveals Back (left) alongside Next', async ({ page }) => {
		const actions = page.locator('.cn-walkthrough__actions')
		await actions.locator('button', { hasText: 'Next' }).click()
		const back = actions.locator('button', { hasText: 'Back' })
		const next = actions.locator('button', { hasText: 'Next' })
		await expect(back).toBeVisible()
		await expect(next).toBeVisible()
		// Back is left of Next.
		const backBox = await back.boundingBox()
		const nextBox = await next.boundingBox()
		expect(backBox.x).toBeLessThan(nextBox.x)
		// Back carries a (left-pointing) chevron icon.
		await expect(back.locator('.material-design-icon')).toBeVisible()
	})
})
