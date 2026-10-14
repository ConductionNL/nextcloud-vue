// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Radio cards as a compact list (screens-radio-cards-list): one option per
// line without a card, much shorter than the cards, and choosing still saves.
//
// WHY PLAYWRIGHT: height and borders are layout.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the list variant draws options without cards and saves a choice', async ({ page }) => {
	const posted = []
	await page.route('**/apps/**', (route) => {
		if (route.request().method() === 'POST') {
			posted.push(route.request().postDataJSON())
		}
		return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
	})
	await page.goto('/?l8=radio-cards-list', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const list = page.locator('[data-testid="radio-list"]')
	const cards = page.locator('[data-testid="radio-cards"]')
	await expect(list.getByText('Onderneming')).toBeVisible({ timeout: 60_000 })

	const option = list.locator('[data-testid="cn-radio-cards-option-assoc"]')
	expect(await option.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('0px')
	const listHeight = (await list.boundingBox()).height
	const cardsHeight = (await cards.boundingBox()).height
	expect(listHeight).toBeLessThan(cardsHeight * 0.75)

	await option.click()
	await expect.poll(() => posted.length).toBe(1)
	expect(posted[0]).toEqual({ mode: 'assoc' })
})
