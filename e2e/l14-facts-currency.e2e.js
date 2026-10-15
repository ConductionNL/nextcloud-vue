// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2
//
// A facts entry with `format: "currency"` reads as money in a browser
// (?l7=facts-currency, harness l7/FactsCurrency.vue), as shillinq's invoice
// amounts must. The third row has no format and stays the raw number.

import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test('invoice amounts in a facts card read as money', async ({ page }) => {
	await page.goto('/?l7=facts-currency', { waitUntil: 'domcontentloaded', timeout: 90_000 })
	const rows = page.locator('[data-testid="facts-currency"] .cn-facts-widget__row dd')
	await rows.first().waitFor({ state: 'visible', timeout: 60_000 })
	const values = (await rows.allInnerTexts()).map((v) => v.replace(/[  ]/g, ' ').trim())
	expect(values).toHaveLength(3)
	expect(values[0]).toContain('€')
	expect(values[0]).toMatch(/1[.,\s]?234[.,]50/)
	expect(values[1]).toMatch(/\$|USD/)
	expect(values[1]).toMatch(/250[.,]00/)
	expect(values[2]).toBe('1234.5')
})
