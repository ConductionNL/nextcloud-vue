// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// stat-value-fits: a stat value too wide for its tile steps its font down
// instead of being clipped (pipelinq "€ 1.012.4" at 1100 wide), a short value
// keeps its size, and the register mapping labels its register select once.
//
// WHY PLAYWRIGHT: rendered widths and font sizes of real text.
//
// @spec openspec/changes/stat-value-fits/specs/stat-tile-board-look/spec.md

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a wide stat value fits its tile and a short one keeps its size', async ({ page }) => {
	await page.route('**/apps/openregister/api/registers**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ results: [{ id: 5, title: 'Pipelinq', schemas: [] }] }),
	}))
	await page.route('**/apps/pipelinq/api/kpi/**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ value: route.request().url().endsWith('/pipeline') ? 1012400 : 12 }),
	}))
	await page.setViewportSize({ width: 1100, height: 800 })
	await page.goto('/?l8=stat-value-fits', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const cells = page.locator('[data-testid="stat-value-fits-cell"]')
	await expect(cells.first().locator('.cn-kpi-card__value')).toContainText('012', { timeout: 90_000 })

	const measure = (cell) => cell.evaluate((host) => {
		const card = host.querySelector('.cn-kpi-card')
		const value = card.querySelector('.cn-kpi-card__value')
		const cardBox = card.getBoundingClientRect()
		const style = getComputedStyle(card)
		const valueBox = value.getBoundingClientRect()
		return {
			text: value.textContent.trim(),
			fontSize: parseFloat(getComputedStyle(value).fontSize),
			inside: valueBox.right <= cardBox.right - parseFloat(style.paddingRight) + 0.5,
			clipped: value.scrollWidth > Math.ceil(valueBox.width) + 0.5,
		}
	})
	await expect.poll(async () => (await measure(cells.nth(0))).inside).toBe(true)
	const wide = await measure(cells.nth(0))
	expect(wide.text).toMatch(/1.012.400/)
	expect(wide.fontSize).toBeLessThan(28)
	expect(wide.fontSize).toBeGreaterThanOrEqual(14)
	expect(wide.clipped).toBe(false)

	const short = await measure(cells.nth(1))
	expect(short.fontSize).toBe(28)
	expect(short.inside).toBe(true)

	const mapping = page.locator('[data-testid="stat-value-fits-mapping"]')
	await expect(mapping.locator('.cn-register-mapping__register-select')).toBeVisible()
	await expect(mapping.locator('.cn-register-mapping__register-select').getByText('Register', { exact: true })).toHaveCount(1)
	await expect(mapping.getByRole('combobox', { name: 'Register' })).toHaveCount(1)
})
