// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// screens-index-list-parity (task 6), screens-card-parity (task 3) and
// screens-chrome-parity (tasks 2 and 3): the claims that are LAYOUT, which jsdom
// cannot judge. Each has a control without the board look (`&plain=1`).
//
// @spec openspec/changes/screens-index-list-parity/specs/index-list-board-look/spec.md#requirement-the-table-is-a-white-card-with-one-row-menu
// @spec openspec/changes/screens-card-parity/specs/card-board-look/spec.md#requirement-the-cards-view-keeps-the-list-toolbar-and-footer
// @spec openspec/changes/screens-chrome-parity/specs/app-look/spec.md#requirement-page-content-takes-the-board-frame
// @spec openspec/changes/screens-chrome-parity/specs/app-look/spec.md#requirement-header-buttons-share-one-board-button

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 180_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {string} query The harness query.
 * @return {Promise<void>}
 */
async function open(page, query) {
	await page.goto('/' + query, { waitUntil: 'domcontentloaded', timeout: 120_000 })
	await expect(page.locator('[data-testid="screensindex-box"] .cn-index-page').first()).toBeVisible({ timeout: 120_000 })
}

function rect(locator) {
	return locator.evaluate((el) => {
		const r = el.getBoundingClientRect()
		return { top: r.top, left: r.left, width: r.width, height: r.height, right: r.right, bottom: r.bottom }
	})
}

test.describe('the table card and the row menu (index-list task 6)', () => {
	test('a white card with a 12px radius, no shadow, and one 34px menu button per row', async ({ page }) => {
		await open(page, '?screensindex=table')
		const card = page.locator('.cn-index-page__main--table').first()
		await expect(card).toBeVisible()
		const style = await card.evaluate((el) => {
			const cs = getComputedStyle(el)
			return { radius: cs.borderTopLeftRadius, shadow: cs.boxShadow }
		})
		expect(style.radius).toBe('12px')
		expect(style.shadow).toBe('none')
		const buttons = page.locator('.cn-row-actions--board .button-vue')
		await expect(buttons).toHaveCount(5)
		const box = await rect(buttons.first())
		expect(Math.round(box.width)).toBe(34)
		expect(Math.round(box.height)).toBe(34)

		await open(page, '?screensindex=table&plain=1')
		expect(await page.locator('.cn-index-page__main--table').first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).not.toBe('12px')
	})
})

test.describe('the cards view (card task 3)', () => {
	test('the toolbar and the footer keep their boxes when the view switches from table to cards', async ({ page }) => {
		const boxes = async () => ({
			toolbar: await rect(page.locator('[data-testid="cn-actions-bar"]').first()),
			footer: await rect(page.locator('.cn-pagination--board').first()),
		})
		await open(page, '?screensindex=table')
		await expect(page.locator('.cn-pagination--board').first()).toBeVisible()
		const table = await boxes()
		await open(page, '?screensindex=cards')
		await expect(page.locator('.cn-pagination--board').first()).toBeVisible()
		const cards = await boxes()
		expect(Math.round(cards.toolbar.left)).toBe(Math.round(table.toolbar.left))
		expect(Math.round(cards.toolbar.width)).toBe(Math.round(table.toolbar.width))
		expect(Math.round(cards.toolbar.height)).toBe(Math.round(table.toolbar.height))
		// The table's footer sits inside the card's 1px border, the cards'
		// footer under the grid: the same box to within that border.
		expect(Math.abs(cards.footer.left - table.footer.left)).toBeLessThanOrEqual(1.5)
		expect(Math.abs(cards.footer.width - table.footer.width)).toBeLessThanOrEqual(2.5)
		expect(Math.round(cards.footer.height)).toBe(Math.round(table.footer.height))
	})
})

test.describe('the board chrome (chrome tasks 2 and 3)', () => {
	test('the page takes padding 24px 28px; the board header buttons are 40px with an 8px radius', async ({ page }) => {
		await open(page, '?screensindex=table')
		const pad = await page.locator('.cn-index-page').first().evaluate((el) => {
			const cs = getComputedStyle(el)
			return [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft]
		})
		expect(pad).toEqual(['24px', '28px', '24px', '28px'])
		const header = page.locator('[data-testid="cn-index-header-buttons"] .button-vue')
		await expect(header.first()).toBeVisible()
		const sizes = await header.evaluateAll((els) => els.map((el) => {
			const cs = getComputedStyle(el)
			return { h: Math.round(el.getBoundingClientRect().height), r: cs.borderTopLeftRadius, size: cs.fontSize }
		}))
		sizes.forEach((s) => {
			expect(s.h).toBe(40)
			expect(s.r).toBe('8px')
		})

		await open(page, '?screensindex=table&plain=1')
		const plainPad = await page.locator('.cn-index-page').first().evaluate((el) => getComputedStyle(el).paddingLeft)
		expect(plainPad).not.toBe('28px')
	})

	test('the page content stops at 1240px', async ({ page }) => {
		await open(page, '?screensindex=table&w=1600')
		const width = (await rect(page.locator('.cn-index-page').first())).width
		expect(Math.round(width)).toBeLessThanOrEqual(1240)
		expect(Math.round(width)).toBeGreaterThan(1000)
	})
})
