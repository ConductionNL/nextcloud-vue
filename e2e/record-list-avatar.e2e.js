// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A record-list row with an avatar and a customer line, in a browser
// (screens-record-list-avatar). Uses the l4 harness (?l4=record-list-avatar).
//
// WHY PLAYWRIGHT: a 36px circle left of the text on one row is layout, which
// jsdom does not compute. The customer comes through the real `_extend` request.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('a row draws a 36px avatar with the customer initials left of the title, and the customer on the second line', async ({ page }) => {
	const urls = []
	await page.route('**/apps/openregister/api/objects/pipelinq/ticket**', (route) => {
		urls.push(decodeURIComponent(route.request().url()))
		return route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ results: [{ id: 't1', title: 'Afvalpas werkt niet', channel: 'Mijn Zuiddrecht', client: { name: 'M. de Graaf' } }], total: 1 }),
		})
	})
	await page.goto('/?l4=record-list-avatar', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const avatar = page.locator('[data-testid="cn-record-list-avatar"]')
	await avatar.waitFor({ state: 'visible', timeout: 60_000 })
	await expect(avatar).toHaveText('MG')
	const circle = await avatar.boundingBox()
	expect(Math.round(circle.width)).toBe(36)
	expect(Math.round(circle.height)).toBe(36)
	const radius = await avatar.evaluate((el) => getComputedStyle(el).borderRadius)
	expect(radius).toBe('50%')
	const title = await page.locator('.cn-record-list__title').boundingBox()
	expect(title.x).toBeGreaterThanOrEqual(circle.x + circle.width)
	await expect(page.locator('.cn-record-list__meta')).toHaveText('M. de Graaf · Mijn Zuiddrecht')
	expect(urls.at(-1)).toContain('_extend[]=client')
})
