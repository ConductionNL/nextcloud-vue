// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A record list with `presentation: "cards"` draws a framed card per row in a
// grid, as board ShBank draws the four bank accounts: 1px border, radius 12px,
// padding 16px 18px, 16px apart, the balance at 24px bold. In a titled card
// the cards keep the dashboard card's 22px side inset; in a borderless cell they are flush with
// the cell (?l8=record-list-cards, harness l8/RecordListCards.vue).
//
// WHY PLAYWRIGHT: the claim is measured layout (four cards side by side in one
// row) and computed style, which jsdom does not compute.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the bank accounts are four cards side by side, each with its figure', async ({ page }) => {
	await page.route('**/apps/shillinq/api/v1/cash-position**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ total: 0, accounts: [
			{ bankAccountId: 'a1', accountName: 'ING zakelijk', iban: 'NL12 INGB 0001 2345 67', ledgerBalance: '412.380,16', feed: 'psd2' },
			{ bankAccountId: 'a2', accountName: 'Rabobank', iban: 'NL44 RABO 0123 4567 89', ledgerBalance: '96.004,22', feed: 'psd2' },
			{ bankAccountId: 'a3', accountName: 'Shillinq zakelijk', iban: 'Betaalrekening in de app', ledgerBalance: '18.240,00', feed: 'app' },
			{ bankAccountId: 'a4', accountName: 'USD-rekening', iban: 'NL71 ABNA 0417 1643 00', ledgerBalance: '48.200,00', feed: 'import' },
		] }),
	}))
	await page.setViewportSize({ width: 1440, height: 1000 })
	await page.goto('/?l8=record-list-cards', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="record-list-cards"]')
	const lists = host.locator('[data-testid="cn-record-list"]')
	await expect(host.locator('[data-testid="cn-record-list-card"]')).toHaveCount(8, { timeout: 60_000 })
	const cards = lists.nth(0).locator('[data-testid="cn-record-list-card"]')

	if (process.env.L21_SHOT) {
		await host.screenshot({ path: process.env.L21_SHOT })
	}

	const style = await cards.first().evaluate((el) => {
		const cs = getComputedStyle(el)
		return { border: cs.borderTopWidth, radius: cs.borderTopLeftRadius, padding: `${cs.paddingTop} ${cs.paddingLeft}` }
	})
	expect(style).toEqual({ border: '1px', radius: '12px', padding: '16px 18px' })

	const boxes = await Promise.all([0, 1, 2, 3].map((i) => cards.nth(i).boundingBox()))
	for (const box of boxes) {
		expect(Math.abs(box.y - boxes[0].y)).toBeLessThan(1)
	}
	expect(Math.round(boxes[1].x - (boxes[0].x + boxes[0].width))).toBe(16)

	const value = cards.first().locator('[data-testid="cn-record-list-card-value"]')
	await expect(value).toHaveText('EUR 412.380,16')
	expect(await value.evaluate((el) => [getComputedStyle(el).fontSize, getComputedStyle(el).fontWeight])).toEqual(['24px', '700'])
	await expect(cards.nth(3)).toContainText('Afschrift importeren')
	await expect(cards.first().locator('svg')).toHaveCount(1)

	// Inset 22px inside the titled card (plus its 1px edge), flush in the borderless cell.
	const inset = async (i) => {
		const cell = await lists.nth(i).locator('xpath=ancestor::div[contains(@class, "cn-widget-wrapper ")][1]').boundingBox()
		const first = await lists.nth(i).locator('[data-testid="cn-record-list-card"]').first().boundingBox()
		return Math.round(first.x - cell.x)
	}
	expect(await inset(0)).toBe(23)
	expect(await inset(1)).toBe(0)
})
