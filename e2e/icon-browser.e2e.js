// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Real-browser coverage for CnIconBrowser's default NL-government icon sets.
// jsdom cannot prove the important part — that RVO arrives as a lazily-fetched
// chunk rather than sitting in the eager bundle — so it is asserted here.

import { test, expect } from '@playwright/test'

const section = (page) => page.getByTestId('section-icon-browser')

test.beforeEach(async ({ page }) => {
	await page.goto('/')
})

test.describe('CnIconBrowser — bundled NL-government icon sets', () => {
	test('offers the three sets with no props, as a widget config form mounts it', async ({ page }) => {
		const sec = section(page)
		await sec.locator('.cn-icon-browser-panel__tab', { hasText: 'Custom' }).click()

		const groups = sec.locator('.cn-icon-browser-panel__group-tab')
		await expect(groups).toHaveText(['Gemeente', 'Den Haag', 'RVO'])
	})

	test('renders the Gemeente set as self-contained data: URIs', async ({ page }) => {
		const sec = section(page)
		await sec.locator('.cn-icon-browser-panel__tab', { hasText: 'Custom' }).click()

		const cells = sec.locator('.cn-icon-browser-panel__cell-img')
		await expect.poll(async () => cells.count()).toBeGreaterThan(10)

		// data: URIs are why a picked icon still renders in an app that does not
		// carry the catalogue it came from.
		const srcs = await cells.evaluateAll((els) => els.map((e) => e.getAttribute('src') || ''))
		expect(srcs.every((s) => s.startsWith('data:image/svg+xml'))).toBe(true)
	})

	test('fetches RVO only when its tab is opened, and renders it', async ({ page }) => {
		const sec = section(page)
		await sec.locator('.cn-icon-browser-panel__tab', { hasText: 'Custom' }).click()

		// Nothing RVO-shaped has been requested while Gemeente is the active set.
		const rvoRequests = []
		page.on('request', (req) => {
			if (/rvo/i.test(req.url())) {
				rvoRequests.push(req.url())
			}
		})
		await expect(sec.locator('.cn-icon-browser-panel__group-tab--active')).toHaveText('Gemeente')
		expect(rvoRequests).toHaveLength(0)

		await sec.locator('.cn-icon-browser-panel__group-tab', { hasText: 'RVO' }).click()

		// The chunk resolves and the (large, capped) grid fills in.
		await expect(sec.locator('.cn-icon-browser-panel__hint')).toContainText('of 1163')
		await expect(sec.locator('.cn-icon-browser-panel__error')).toHaveCount(0)
		expect(rvoRequests.length).toBeGreaterThan(0)
	})

	test('clears a selected icon', async ({ page }) => {
		const sec = section(page)
		await sec.locator('.cn-icon-browser-panel__cell').first().click()
		await expect(page.getByTestId('browser-icon-value')).not.toHaveText('null')

		await sec.locator('.cn-icon-browser-panel__clear').click()
		await expect(page.getByTestId('browser-icon-value')).toHaveText('null')
	})
})
