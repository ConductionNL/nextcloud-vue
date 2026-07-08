// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// @spec openspec/changes/enrich-icon-picker-and-markdown-wysiwyg/specs/icon-picker/spec.md
//   Covers scenarios: Searchable icon grid, MDI default with optional-dependency
//   fallback, Multi-source icon selection, Custom SVG authoring, Icon placement,
//   Backward-compatible additions.

import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
	await page.goto('/')
})

test.describe('CnIconPicker — enriched (real browser)', () => {
	const enriched = (page) => page.getByTestId('section-icon-enriched')

	test('lazy-loads the full MDI range and search filters the grid', async ({ page }) => {
		const sec = enriched(page)
		// Enriched mode renders a search box (legacy mode never does).
		const search = sec.locator('.cn-icon-picker__search')
		await expect(search).toBeVisible()
		// The MDI catalogue loads async via a dynamic import of @mdi/js.
		await expect.poll(async () => sec.locator('.cn-icon-picker__icon').count()).toBeGreaterThan(10)

		await search.fill('account')
		await expect.poll(async () => {
			const labels = await sec.locator('.cn-icon-picker__icon').evaluateAll(
				(els) => els.map((e) => (e.getAttribute('aria-label') || '').toLowerCase()))
			return labels.length > 0 && labels.every((l) => l.includes('account') || l === 'no icon')
		}).toBe(true)
	})

	test('clicking a tile emits the MDI value into v-model', async ({ page }) => {
		const sec = enriched(page)
		await sec.locator('.cn-icon-picker__search').fill('home')
		const tile = sec.locator('.cn-icon-picker__icon[aria-label]:not(.cn-icon-picker__none)').first()
		await expect(tile).toBeVisible()
		await tile.click()
		await expect(page.getByTestId('icon-value')).toContainText('mdi')
	})

	test('placement toggle emits update:placement', async ({ page }) => {
		const sec = enriched(page)
		await expect(page.getByTestId('icon-placement')).toHaveText('left')
		await sec.locator('.cn-icon-picker__placement button', { hasText: 'Right' }).click()
		await expect(page.getByTestId('icon-placement')).toHaveText('right')
	})

	test('custom-SVG tab reveals the editor and Format action', async ({ page }) => {
		const sec = enriched(page)
		await sec.locator('.cn-icon-picker__sources button', { hasText: 'Custom' }).click()
		await expect(sec.locator('.cn-icon-picker__custom')).toBeVisible()
		await expect(sec.locator('.cn-icon-picker__format')).toBeVisible()
	})
})

test.describe('CnIconPicker — legacy (real browser)', () => {
	test('default usage shows the registry grid with no search box', async ({ page }) => {
		const sec = page.getByTestId('section-icon-legacy')
		await expect(sec.locator('.cn-icon-picker__search')).toHaveCount(0)
		const tiles = sec.locator('.cn-icon-picker__icon')
		await expect.poll(async () => tiles.count()).toBeGreaterThan(5)
		await tiles.first().click()
		await expect(page.getByTestId('legacy-icon-value')).not.toHaveText('null')
	})
})
