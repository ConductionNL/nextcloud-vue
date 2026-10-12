// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The start-here attention card, measured in a browser (screens-start-here-banner).
//
// WHY PLAYWRIGHT: "the action sits under the text, left-aligned, 16px title" is
// layout and computed style, which jsdom does not give. The ordered query is the
// real request, stubbed here; an empty answer must leave nothing on the page.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

/**
 * @param {import('@playwright/test').Page} page The page.
 * @param {Array<object>} results The rows the query answers.
 * @return {Promise<string[]>} The request URLs, filled as they arrive.
 */
async function stub(page, results) {
	const urls = []
	await page.route('**/apps/openregister/api/objects/pipelinq/ticket**', (route) => {
		urls.push(decodeURIComponent(route.request().url()))
		return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results, total: results.length }) })
	})
	return urls
}

test('the card names the first row, stacks its action under the text and sorts by the deadline', async ({ page }) => {
	const created = new Date(Date.now() - 3 * 86400000 - 3600000).toISOString()
	const urls = await stub(page, [{ id: 't-9', title: 'Afvalpas werkt niet bij de container', contactName: 'M. de Graaf', createdAt: created }])
	await page.goto('/?starthere=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const card = page.locator('[data-testid="cn-banner-widget-attention"]')
	await card.waitFor({ state: 'visible', timeout: 60_000 })

	await expect(card.locator('.cn-banner-widget__title')).toHaveText('Afvalpas werkt niet bij de container')
	await expect(card.locator('.cn-banner-widget__reason')).toHaveText('M. de Graaf wacht al 3 dagen.')
	expect(urls[0]).toContain('_order[slaDeadline]=asc')

	const reason = await card.locator('.cn-banner-widget__reason').boundingBox()
	const action = await card.locator('[data-testid="cn-banner-widget-action"]').boundingBox()
	const box = await card.boundingBox()
	// The action is under the reason, at the card's left padding, and 40px high.
	expect(action.y).toBeGreaterThanOrEqual(reason.y + reason.height)
	expect(Math.abs(action.x - reason.x)).toBeLessThan(2)
	expect(Math.round(action.height)).toBeGreaterThanOrEqual(40)
	expect(action.x + action.width).toBeLessThanOrEqual(box.x + box.width)
	const size = await card.locator('.cn-banner-widget__title').evaluate((el) => getComputedStyle(el).fontSize)
	expect(size).toBe('16px')
})

test('an empty query leaves no card', async ({ page }) => {
	await stub(page, [])
	await page.goto('/?starthere=1', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	await page.locator('[data-testid="start-here-harness"]').waitFor({ state: 'attached', timeout: 60_000 })
	await page.waitForTimeout(1500)
	await expect(page.locator('[data-testid="cn-banner-widget-attention"]')).toHaveCount(0)
	await expect(page.locator('[data-testid="cn-banner-widget-unchecked"]')).toHaveCount(0)
})
