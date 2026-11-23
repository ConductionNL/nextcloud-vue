// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// Under the board look a dashboard card's title is the board's card h2,
// 17px weight 700 (?l8=board-card-titles, harness l8/BoardCardTitles.vue):
// "Vandaag beantwoorden" and "Je week tot nu toe" on a work page (board
// PqMijnWerk) and "Vergaderingen en efficiëntie" under a reports page's cards
// (board DcRapportages). It rendered at the wrapper's 14px weight 600.
//
// WHY PLAYWRIGHT: the claim is the computed style of the real stylesheet.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('dashboard card titles are 17px bold under the board look', async ({ page }) => {
	await page.route('**/apps/openregister/api/**', (route) => {
		const url = route.request().url()
		const body = url.includes('/aggregations/') ? { value: 14 } : { results: [{ id: 'a', title: 'Afvalpas werkt niet bij de container' }], total: 1 }
		return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
	})
	await page.setViewportSize({ width: 1440, height: 1200 })
	await page.goto('/?l8=board-card-titles', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="board-card-titles"]')
	const titles = host.locator('.cn-widget-wrapper__title')
	await expect(titles).toHaveCount(3, { timeout: 60_000 })

	if (process.env.L10_SHOT) {
		await host.screenshot({ path: process.env.L10_SHOT })
	}

	const styles = await titles.evaluateAll((els) => els.map((el) => ({ text: el.textContent.trim(), fontSize: getComputedStyle(el).fontSize, fontWeight: getComputedStyle(el).fontWeight })))
	expect(styles).toEqual([
		{ text: 'Vandaag beantwoorden', fontSize: '17px', fontWeight: '700' },
		{ text: 'Je week tot nu toe', fontSize: '17px', fontWeight: '700' },
		{ text: 'Vergaderingen en efficiëntie', fontSize: '17px', fontWeight: '700' },
	])
})
