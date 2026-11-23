// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// The interaction form fits a 234px card (?l7=contact-form-fit, harness
// l7/ContactFormFit.vue): every select, the client picker and the summary
// stay inside the card. Before, NcSelect's own 260px minimum ran the channel
// and client selects 40px past the edge of pipelinq's "Nieuw contactmoment".
//
// WHY PLAYWRIGHT: the claim is the rendered width of real NcSelects.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('every control of the interaction form stays inside a 234px card', async ({ page }) => {
	// Offline: every OpenRegister read answers "no objects".
	await page.route('**/apps/openregister/**', (route) => route.fulfill({
		status: 200,
		contentType: 'application/json',
		body: JSON.stringify({ results: [], total: 0 }),
	}))
	await page.goto('/?l7=contact-form-fit', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const card = page.locator('[data-testid="contact-form-fit"]')
	await card.locator('.v-select').first().waitFor({ state: 'visible', timeout: 60_000 })

	if (process.env.L11_SHOT) {
		await card.screenshot({ path: process.env.L11_SHOT })
	}
	const box = await card.boundingBox()
	const right = box.x + box.width - 16
	// The controls' outer boxes: a select (the channel, the client picker,
	// the outcome), the subject field and the summary.
	const controls = card.locator('.v-select, .input-field, textarea')
	const count = await controls.count()
	expect(count).toBeGreaterThanOrEqual(4)
	for (let i = 0; i < count; i++) {
		const b = await controls.nth(i).boundingBox()
		expect(Math.round(b.x + b.width)).toBeLessThanOrEqual(Math.round(right))
	}
})
