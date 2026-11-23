// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// screens-chrome-parity (tasks 2 and 3), the parts the index spec
// (screens-index-card-chrome-parity.e2e.js) leaves: the 56px header inset only
// while the navigation is closed, measured against the real CnAppNav and its
// toggle, and the board header button on the detail, dashboard and settings
// headers, with the labelled Actions menu. ScreensChromeHarness.vue,
// ?screenschrome=index|detail|overview|settings (`overview` is the dashboard), with a control without the
// board look (`&plain=1`).
//
// @spec openspec/changes/screens-chrome-parity/specs/app-look/spec.md#requirement-page-content-takes-the-board-frame
// @spec openspec/changes/screens-chrome-parity/specs/app-look/spec.md#requirement-header-buttons-share-one-board-button

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 180_000 })

const HEADERS = {
	index: '.cn-page-header',
	detail: '.cn-detail-page__header',
	overview: '.cn-dashboard-page__header',
	settings: '.cn-page-header',
}

const TITLES = {
	index: '.cn-page-header h1, .cn-page-header h2',
	detail: '.cn-detail-page__title',
	overview: '.cn-dashboard-page__header h1, .cn-dashboard-page__header h2',
	settings: '.cn-page-header h1, .cn-page-header h2',
}

const BUTTONS = {
	detail: '.cn-detail-page__header-actions',
	overview: '.cn-dashboard-page__header-actions',
	settings: '.cn-settings-page__header-buttons',
}

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The harness query.
 * @param {string} header The header selector to wait for.
 * @return {Promise<void>}
 */
async function open(page, query, header) {
	await page.setViewportSize({ width: 1440, height: 1000 })
	await page.goto('/' + query, { waitUntil: 'domcontentloaded', timeout: 120_000 })
	await expect(page.locator(`[data-testid="screenschrome-box"] ${header}`).first()).toBeVisible({ timeout: 120_000 })
	await expect(page.locator('[data-testid="cn-nav"]')).toBeVisible()
}

/**
 * @param {import('@playwright/test').Locator} locator The element.
 * @return {Promise<{top: number, left: number, width: number, height: number, right: number, bottom: number}>} Its box.
 */
function rect(locator) {
	return locator.evaluate((el) => {
		const r = el.getBoundingClientRect()
		return { top: r.top, left: r.left, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
	})
}

/**
 * The start padding of a header.
 *
 * @param {import('@playwright/test').Locator} locator The header.
 * @return {Promise<string>} The computed padding-inline-start.
 */
function inset(locator) {
	return locator.evaluate((el) => getComputedStyle(el).paddingInlineStart)
}

/**
 * Close the navigation with its own toggle and wait until it is closed.
 *
 * @param {import('@playwright/test').Page} page The page.
 * @return {Promise<void>}
 */
async function closeNavigation(page) {
	await page.locator('.app-navigation-toggle').first().click()
	await expect(page.locator('[data-testid="cn-nav"].app-navigation--closed')).toHaveCount(1)
	// The navigation slides away; measure once it has.
	await page.waitForTimeout(600)
}

test.describe('the 56px header inset only while the navigation is closed (chrome task 2)', () => {
	for (const scenario of ['index', 'detail', 'overview', 'settings']) {
		test(`${scenario}: no inset with the navigation open, 56px and a title clear of the toggle with it closed`, async ({ page }) => {
			await open(page, `?screenschrome=${scenario}`, HEADERS[scenario])
			const header = page.locator(HEADERS[scenario]).first()
			const title = page.locator(TITLES[scenario]).first()
			const nav = await rect(page.locator('[data-testid="cn-nav"]'))
			const content = await rect(page.locator('#app-content-vue, .app-content').first())

			expect(await inset(header)).toBe('0px')
			// The title starts 28px from the navigation's right edge.
			expect(Math.round((await rect(title)).left - nav.right)).toBe(28)
			// ...and 24px below the top of the content.
			expect(Math.round((await rect(header)).top - content.top)).toBe(24)
			// One line between the navigation and the content: the content starts at the navigation's edge.
			expect(Math.round(content.left)).toBe(Math.round(nav.right))
			expect(await page.locator('#app-content-vue, .app-content').first().evaluate((el) => getComputedStyle(el).borderInlineStartWidth)).toBe('0px')

			await closeNavigation(page)
			expect(await inset(header)).toBe('56px')
			const toggle = await rect(page.locator('.app-navigation-toggle').first())
			const closedTitle = await rect(title)
			expect(closedTitle.left).toBeGreaterThanOrEqual(toggle.right)
		})
	}

	test('without the look the inset does not depend on the navigation (control)', async ({ page }) => {
		await open(page, '?screenschrome=index&plain=1', HEADERS.index)
		const header = page.locator(HEADERS.index).first()
		const open56 = await inset(header)
		await closeNavigation(page)
		expect(await inset(header)).toBe(open56)
	})
})

test.describe('the board header button on detail, dashboard and settings (chrome task 3)', () => {
	for (const scenario of ['detail', 'overview', 'settings']) {
		test(`${scenario}: every header button is 40px high, radius 8, 14px at weight 600`, async ({ page }) => {
			await open(page, `?screenschrome=${scenario}`, BUTTONS[scenario])
			const buttons = page.locator(`${BUTTONS[scenario]} .button-vue`)
			await expect(buttons.first()).toBeVisible()
			const sizes = await buttons.evaluateAll((els) => els.filter((el) => el.offsetParent !== null).map((el) => {
				const cs = getComputedStyle(el)
				return { h: Math.round(el.getBoundingClientRect().height), r: cs.borderTopLeftRadius, size: cs.fontSize, weight: cs.fontWeight, primary: el.classList.contains('button-vue--primary'), bg: cs.backgroundColor, border: cs.borderTopWidth }
			}))
			expect(sizes.length).toBeGreaterThan(0)
			sizes.forEach((s) => {
				expect(s.h).toBe(40)
				expect(s.r).toBe('8px')
				expect(s.size).toBe('14px')
				expect(s.weight).toBe('600')
			})
		})
	}

	test('detail and dashboard: the header Actions menu shows its label', async ({ page }) => {
		for (const scenario of ['detail', 'overview']) {
			await open(page, `?screenschrome=${scenario}`, BUTTONS[scenario])
			const menu = page.locator(`${BUTTONS[scenario]} .action-item .button-vue`).last()
			await expect(menu).toBeVisible()
			expect((await menu.innerText()).trim()).toMatch(/^(Actions|More)$/)
		}
	})

	test('settings: the page Save is a filled primary button with no border', async ({ page }) => {
		await open(page, '?screenschrome=settings', BUTTONS.settings)
		const save = page.locator('[data-testid="cn-settings-page-save"]')
		await expect(save).toBeVisible()
		expect(await save.evaluate((el) => el.classList.contains('button-vue--primary'))).toBe(true)
		expect(await save.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('0px')
	})
})
