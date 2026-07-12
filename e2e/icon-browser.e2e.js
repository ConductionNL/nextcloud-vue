// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Real-browser coverage for CnIconBrowser's default NL-government icon sets.
// jsdom cannot prove the important part — that RVO arrives as a lazily-fetched
// chunk rather than sitting in the eager bundle — so it is asserted here.

import { test, expect } from '@playwright/test'

const section = (page) => page.getByTestId('section-icon-browser')
const tab = (page, name) => section(page).locator('.cn-icon-browser-panel__tab', { hasText: name })

test.beforeEach(async ({ page }) => {
	await page.goto('/')
})

test.describe('CnIconBrowser — bundled NL-government icon sets', () => {
	test('gives each set a top-level tab, with no props, as a widget config form mounts it', async ({ page }) => {
		// Each set is one click from the picker — not buried under "Custom", where
		// users could not find them.
		const tabs = section(page).locator('.cn-icon-browser-panel__tab')
		await expect(tabs).toHaveText(['Icons', 'Gemeente', 'Den Haag', 'RVO'])
	})

	test('renders the Gemeente set as self-contained data: URIs', async ({ page }) => {
		await tab(page, 'Gemeente').click()

		const cells = section(page).locator('.cn-icon-browser-panel__cell-img')
		await expect.poll(async () => cells.count()).toBeGreaterThan(10)

		// data: URIs are why a picked icon still renders in an app that does not
		// carry the catalogue it came from.
		const srcs = await cells.evaluateAll((els) => els.map((e) => e.getAttribute('src') || ''))
		expect(srcs.every((s) => s.startsWith('data:image/svg+xml'))).toBe(true)
	})

	test('fetches RVO only when its tab is opened, and renders it', async ({ page }) => {
		const rvoRequests = []
		page.on('request', (req) => {
			if (/rvo/i.test(req.url())) {
				rvoRequests.push(req.url())
			}
		})

		// Browsing the eager set must not drag the 1.9MB set in with it.
		await tab(page, 'Gemeente').click()
		await expect(section(page).locator('.cn-icon-browser-panel__cell-img').first()).toBeVisible()
		expect(rvoRequests).toHaveLength(0)

		await tab(page, 'RVO').click()

		// The chunk resolves and the (large, capped) grid fills in.
		await expect(section(page).locator('.cn-icon-browser-panel__hint')).toContainText('of 1163')
		await expect(section(page).locator('.cn-icon-browser-panel__error')).toHaveCount(0)
		expect(rvoRequests.length).toBeGreaterThan(0)
	})

	test('exposes tablist semantics and roves with the keyboard', async ({ page }) => {
		const icons = tab(page, 'Icons')
		await expect(section(page).locator('[role="tablist"]')).toBeVisible()
		await expect(icons).toHaveAttribute('aria-selected', 'true')

		await icons.focus()
		await page.keyboard.press('ArrowRight')
		await expect(tab(page, 'Gemeente')).toHaveAttribute('aria-selected', 'true')
		await expect(tab(page, 'Gemeente')).toBeFocused()
	})

	test('clears a selected icon', async ({ page }) => {
		await section(page).locator('.cn-icon-browser-panel__cell').first().click()
		await expect(page.getByTestId('browser-icon-value')).not.toHaveText('null')

		await section(page).locator('.cn-icon-browser-panel__clear').click()
		await expect(page.getByTestId('browser-icon-value')).toHaveText('null')
	})
})
