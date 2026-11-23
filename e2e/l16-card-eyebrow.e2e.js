// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A widget card carries a muted line above its title (?l7=l16-card-eyebrow,
// harness l7/L16CardEyebrow.vue), as board ShLiquiditeit's "Saldo per week"
// above "Prognose 13 weken". The card without one is unchanged.
//
// WHY PLAYWRIGHT: the line's place above the title, its size and colour are
// layout and computed style.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('the eyebrow sits above the title, smaller and muted', async ({ page }) => {
	await page.goto('/?l7=l16-card-eyebrow', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const host = page.locator('[data-testid="l16-card-eyebrow"]')
	const eyebrow = host.locator('[data-testid="cn-widget-wrapper-eyebrow"]')
	await expect(eyebrow).toHaveText('Saldo per week', { timeout: 60_000 })
	await expect(eyebrow).toHaveCount(1)
	const info = await eyebrow.evaluate((el) => {
		const title = el.parentElement.querySelector('.cn-widget-wrapper__title')
		const a = el.getBoundingClientRect()
		const b = title.getBoundingClientRect()
		return { above: a.bottom <= b.top + 1, left: Math.abs(a.left - b.left), size: getComputedStyle(el).fontSize, colour: getComputedStyle(el).color, titleColour: getComputedStyle(title).color, title: title.textContent.trim() }
	})
	expect(info.title).toBe('Prognose 13 weken')
	expect(info.above).toBe(true)
	expect(info.left).toBeLessThan(1)
	expect(info.size).toBe('13px')
	expect(info.colour).not.toBe(info.titleColour)
})
