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

	test('infinite scroll reveals more icons past the 120 cap', async ({ page }) => {
		const sec = enriched(page)
		const grid = sec.locator('.cn-icon-picker__grid')
		// Wait for the full MDI catalogue to load (well past the initial batch).
		await expect.poll(async () => grid.locator('.cn-icon-picker__icon').count()).toBeGreaterThan(100)
		const before = await grid.locator('.cn-icon-picker__icon').count()
		// The hint reports "Showing N of M" while more remain.
		await expect(sec.locator('.cn-icon-picker__hint')).toContainText('scroll for more')
		// Scroll the grid to its bottom a few times to load further batches.
		for (let i = 0; i < 3; i++) {
			await grid.evaluate((el) => { el.scrollTop = el.scrollHeight })
			await page.waitForTimeout(150)
		}
		await expect.poll(async () => grid.locator('.cn-icon-picker__icon').count()).toBeGreaterThan(before)
	})

	test('clicking a tile emits the MDI value into v-model', async ({ page }) => {
		const sec = enriched(page)
		await sec.locator('.cn-icon-picker__search').fill('home')

		const tile = sec.locator('.cn-icon-picker__icon[aria-label]:not(.cn-icon-picker__none)').first()

		// ⚠️ WAIT FOR THE FILTERED GRID, NOT MERELY FOR A TILE.
		//
		// `.first()` on a re-rendering list is a moving target: `toBeVisible`
		// can be satisfied by a tile from the UNFILTERED grid, which the filter's
		// re-render then detaches before `click()` reaches it. Playwright retries
		// the click, and on a quiet machine the retry lands — under the full
		// parallel run it timed out instead, once, on a suite that is otherwise
		// green.
		//
		// Asserting the label pins the grid to the filtered set, so the tile that
		// is checked is the tile that is clicked.
		await expect(tile).toHaveAttribute('aria-label', /home/i)

		await tile.click()
		await expect(page.getByTestId('icon-value')).toContainText('mdi')
	})

	test('source switcher shows tabs and swaps the grid per source', async ({ page }) => {
		const sec = enriched(page)
		const sources = sec.locator('.cn-icon-picker__sources')
		await expect(sources.locator('button', { hasText: 'Material' })).toBeVisible()
		await expect(sources.locator('button', { hasText: 'FontAwesome' })).toBeVisible()
		await expect(sources.locator('button', { hasText: 'OpenGemeenten' })).toBeVisible()

		await sources.locator('button', { hasText: 'FontAwesome' }).click()
		await expect(sec.locator('.cn-icon-picker__icon[aria-label="House"]')).toBeVisible()

		await sources.locator('button', { hasText: 'OpenGemeenten' }).click()
		await expect(sec.locator('.cn-icon-picker__icon[aria-label="Paspoort"]')).toBeVisible()
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

	test('custom-SVG round-trip: typed SVG emits via v-model, Format pretty-prints it', async ({ page }) => {
		const sec = enriched(page)
		await sec.locator('.cn-icon-picker__sources button', { hasText: 'Custom' }).click()
		const editor = sec.locator('.cn-icon-picker__custom .cm-content')
		await expect(editor).toBeVisible()
		// insertText (not per-char typing) avoids CodeMirror's XML auto-close.
		await editor.click()
		await page.keyboard.press('ControlOrMeta+a')
		await page.keyboard.insertText('<svg viewBox="0 0 24 24"><path d="M1 2 3 4"/></svg>')
		// Raw SVG flows to v-model.
		await expect(page.getByTestId('icon-value')).toContainText('<svg')
		// Format pretty-prints it (indented, one node per line).
		await sec.locator('.cn-icon-picker__format').click()
		const value = await page.getByTestId('icon-value').textContent()
		expect(value).toContain('<svg')
		expect(value).toContain('<path')
		expect(value.split('\n').length).toBeGreaterThan(1)
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
